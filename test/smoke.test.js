// test/smoke.test.js — dependency-free smoke tests.
// Run: npm test   (server must not already be listening on TEST_PORT)
//
// Covers the failure modes that previously shipped undetected: a bookmarklet
// payload that did not parse, a static handler that escaped its root, and a
// report lookup that returned the wrong report instead of a 404.

var assert = require('assert');
var fs     = require('fs');
var path   = require('path');
var http   = require('http');
var os     = require('os');

var ROOT = path.join(__dirname, '..');
var PORT = process.env.TEST_PORT || 3599;
var BASE = 'http://127.0.0.1:' + PORT;

var passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve().then(fn).then(
    function () { passed++; console.log('  ok   ' + name); },
    function (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
  );
}

function req(method, urlPath, body, headers) {
  return new Promise(function (resolve, reject) {
    var r = http.request(BASE + urlPath, { method: method, headers: headers || {} }, function (res) {
      var data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () { resolve({ status: res.statusCode, body: data, headers: res.headers }); });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

(async function () {
  console.log('AEM QA smoke tests\n');

  // ── Build outputs ──────────────────────────────────────────────────────
  console.log('build outputs');

  await test('engine source parses', function () {
    new Function(fs.readFileSync(path.join(ROOT, 'src/bookmarklet.js'), 'utf8'));
  });

  var variants = ['LOCAL', 'HOSTED'];
  variants.forEach(function (v) {
    var file = path.join(ROOT, 'dist', 'AEM_QA_BOOKMARK_' + v + '.txt');
    test('compiled payload ' + v + ' parses as JavaScript', function () {
      assert.ok(fs.existsSync(file), 'missing ' + file + ' — run npm run build');
      var raw = fs.readFileSync(file, 'utf8');
      assert.ok(raw.indexOf('javascript:') === 0, 'payload must start with javascript:');
      var code = decodeURIComponent(raw.slice('javascript:'.length));
      // This is the regression that shipped: the minifier ate the "//" in the
      // endpoint URL as a line comment and the payload stopped parsing.
      new Function(code);
    });

    test('compiled payload ' + v + ' kept its endpoint URL intact', function () {
      var code = decodeURIComponent(fs.readFileSync(file, 'utf8').slice('javascript:'.length));
      var m = code.match(/BUILD_ENDPOINT\s*=\s*"([^"]+)"/);
      assert.ok(m, 'endpoint was not injected');
      assert.ok(/^https?:\/\/.+\/api\/report$/.test(m[1]), 'endpoint truncated: ' + m[1]);
    });
  });

  await test('minifier preserves "//" inside string literals', function () {
    var code = decodeURIComponent(
      fs.readFileSync(path.join(ROOT, 'dist/AEM_QA_BOOKMARK_LOCAL.txt'), 'utf8').slice('javascript:'.length));
    assert.ok(code.indexOf('http://localhost:3500/api/report') !== -1,
      'endpoint URL was mangled by comment stripping');
  });

  // ── Server ─────────────────────────────────────────────────────────────
  console.log('\nserver');

  var tmpReports = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-test-'));
  process.env.REPORTS_DIR = tmpReports;
  process.env.PORT = PORT;
  var server = require(path.join(ROOT, 'server.js'));
  await new Promise(function (r) { setTimeout(r, 300); });

  await test('GET /health responds', async function () {
    var res = await req('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(JSON.parse(res.body).ok, true);
  });

  await test('GET / serves the dashboard', async function () {
    var res = await req('GET', '/');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.indexOf('AEM QA Framework') !== -1);
  });

  await test('dashboard requests no external webfont', async function () {
    var res = await req('GET', '/');
    assert.ok(res.body.indexOf('fonts.googleapis.com') === -1, 'Google Fonts CDN still referenced');
  });

  await test('GET /api/bookmarklet serves a parseable payload', async function () {
    var res = await req('GET', '/api/bookmarklet');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.indexOf('javascript:') === 0);
    new Function(decodeURIComponent(res.body.trim().slice('javascript:'.length)));
  });

  var savedId = null;
  await test('POST /api/report persists a report', async function () {
    var payload = JSON.stringify({
      meta: { url: 'https://example.com/x', overallScore: 88, status: 'PASS', auditedAt: '2026-08-04T10:00:00Z' },
      defects: [{ id: 'M-01', priority: 'P2', label: 'x', detail: 'y' }]
    });
    var res = await req('POST', '/api/report', payload, { 'Content-Type': 'application/json' });
    assert.strictEqual(res.status, 200);
    var out = JSON.parse(res.body);
    assert.strictEqual(out.ok, true);
    savedId = out.id;
    assert.ok(fs.existsSync(path.join(tmpReports, savedId + '.json')), 'report not written to disk');
  });

  await test('reports survive in-process (persistence, not memory-only)', async function () {
    var res = await req('GET', '/api/reports');
    assert.strictEqual(res.status, 200);
    var list = JSON.parse(res.body);
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].score, 88);
    assert.strictEqual(list[0].defectsCount, 1);
  });

  await test('GET /api/report-details returns the requested report', async function () {
    var res = await req('GET', '/api/report-details?id=' + encodeURIComponent(savedId));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(JSON.parse(res.body).meta.overallScore, 88);
  });

  await test('unknown report id is a 404, not someone else\'s report', async function () {
    var res = await req('GET', '/api/report-details?id=does-not-exist');
    assert.strictEqual(res.status, 404, 'expected 404, got ' + res.status + ' ' + res.body.slice(0, 80));
  });

  await test('POST rejects malformed JSON', async function () {
    var res = await req('POST', '/api/report', '{not json', { 'Content-Type': 'application/json' });
    assert.strictEqual(res.status, 400);
  });

  await test('POST rejects a payload with no meta', async function () {
    var res = await req('POST', '/api/report', '{"defects":[]}', { 'Content-Type': 'application/json' });
    assert.strictEqual(res.status, 400);
  });

  // ── Path traversal ─────────────────────────────────────────────────────
  console.log('\npath traversal');

  var attacks = [
    '/../server.js',
    '/../../etc/passwd',
    '/..%2f..%2fetc%2fpasswd',
    '/%2e%2e/%2e%2e/server.js',
    '/....//server.js'
  ];
  for (var i = 0; i < attacks.length; i++) {
    await (function (a) {
      return test('blocks ' + a, async function () {
        var res = await req('GET', a);
        assert.ok(res.status === 403 || res.status === 404,
          'expected 403/404, got ' + res.status);
        assert.ok(res.body.indexOf('createServer') === -1 && res.body.indexOf('root:') === -1,
          'LEAKED FILE CONTENTS');
      });
    })(attacks[i]);
  }

  await test('report-details rejects a traversing id', async function () {
    var res = await req('GET', '/api/report-details?id=../../server');
    assert.strictEqual(res.status, 404);
  });

  // ── Read isolation ─────────────────────────────────────────────────────
  console.log('\ncors');

  await test('read endpoints emit no wildcard CORS header', async function () {
    var res = await req('GET', '/api/reports', null, { Origin: 'https://evil.example' });
    assert.notStrictEqual(res.headers['access-control-allow-origin'], '*',
      'reports are readable cross-origin — internal URLs would leak');
  });

  await test('write endpoint does allow cross-origin (bookmarklet needs it)', async function () {
    var res = await req('OPTIONS', '/api/report', null, { Origin: 'https://author-p1-e1.adobeaemcloud.com' });
    assert.strictEqual(res.headers['access-control-allow-origin'], '*');
  });

  server.close();
  fs.rmSync(tmpReports, { recursive: true, force: true });

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed === 0 ? 0 : 1);
})();
