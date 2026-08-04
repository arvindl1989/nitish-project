// server.local.js — zero npm dependencies for local testing
// Run locally: node server.local.js
// Open: http://localhost:3500

var http = require('http');
var fs   = require('fs');
var path = require('path');
var url  = require('url');

var PORT    = process.env.PORT || 3500;
var REPORTS = path.join(__dirname, '..', 'reports');
var PUBLIC  = path.join(__dirname, '..', 'public');

try {
  if (!fs.existsSync(REPORTS)) fs.mkdirSync(REPORTS, { recursive: true });
  if (!fs.existsSync(PUBLIC)) fs.mkdirSync(PUBLIC, { recursive: true });
} catch (e) {}

var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

var server = http.createServer(function(req, res) {
  var parsed = url.parse(req.url, true);
  var pathname = parsed.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (req.method === 'POST' && pathname === '/report') {
    var body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      try {
        var data = JSON.parse(body);
        var urlStr = (data.meta && data.meta.url) ? data.meta.url : 'page';
        var slug = urlStr.replace(/[^a-z0-9]/gi, '-').substring(0, 60);
        var ts   = new Date().toISOString().replace(/[:.]/g, '-');
        var file = path.join(REPORTS, slug + '--' + ts + '.json');
        try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch(e){}
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, file: file }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/reports') {
    var files = [];
    try {
      files = fs.readdirSync(REPORTS)
        .filter(function(f) { return f.endsWith('.json'); })
        .map(function(f) {
          try {
            var data = JSON.parse(fs.readFileSync(path.join(REPORTS, f), 'utf8'));
            return {
              file: f,
              url: data.meta ? data.meta.url : 'Unknown',
              score: data.meta ? data.meta.overallScore : 0,
              status: data.meta ? data.meta.status : 'UNKNOWN',
              auditedAt: data.meta ? data.meta.auditedAt : '',
              defectsCount: data.defects ? data.defects.length : 0
            };
          } catch (e) { return null; }
        })
        .filter(Boolean)
        .sort(function(a, b) { return (b.auditedAt || '').localeCompare(a.auditedAt || ''); });
    } catch(e) {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(files));
  }

  if (req.method === 'GET' && pathname === '/report-details') {
    var queryFile = parsed.query.file;
    if (queryFile && fs.existsSync(path.join(REPORTS, queryFile))) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(fs.readFileSync(path.join(REPORTS, queryFile)));
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Report not found' }));
  }

  var filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(PUBLIC, filePath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    var ext  = path.extname(filePath);
    var mime = MIME[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    return res.end(fs.readFileSync(filePath));
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, function() {
  console.log('🚀 Local Report Server running -> http://localhost:' + PORT);
});
