// Vercel Serverless Function — Zero-Dependency Handler
// Endpoints handled: /api/report, /api/reports, /api/report-details

if (!global.__MEMORY_REPORTS__) {
  global.__MEMORY_REPORTS__ = [];
}
var memoryReports = global.__MEMORY_REPORTS__;

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

module.exports = function (req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    var reqUrl = req.url || '';

    // GET /api/reports — List report summaries
    if (req.method === 'GET' && reqUrl.includes('reports') && !reqUrl.includes('report-details')) {
      var summaryList = memoryReports.map(function (r) {
        return {
          id: r.id,
          url: r.meta ? r.meta.url : 'Unknown',
          score: r.meta ? r.meta.overallScore : 0,
          status: r.meta ? r.meta.status : 'UNKNOWN',
          auditedAt: r.meta ? r.meta.auditedAt : '',
          defectsCount: r.defects ? r.defects.length : 0
        };
      });
      sendJson(res, 200, summaryList);
      return;
    }

    // GET /api/report-details — Fetch full report
    if (req.method === 'GET' && reqUrl.includes('report-details')) {
      var queryId = null;
      if (req.query && (req.query.id || req.query.file)) {
        queryId = req.query.id || req.query.file;
      } else {
        var match = reqUrl.match(/[?&](?:id|file)=([^&]+)/);
        if (match) queryId = decodeURIComponent(match[1]);
      }

      var found = memoryReports.find(function (r) { return r.id === queryId; }) || memoryReports[0];
      if (found) {
        sendJson(res, 200, found);
      } else {
        sendJson(res, 404, { error: 'Report not found' });
      }
      return;
    }

    // POST /api/report — Save audit report
    if (req.method === 'POST') {
      var bodyData = '';
      req.on('data', function (chunk) { bodyData += chunk; });
      req.on('end', function () {
        try {
          var data = null;
          if (req.body && typeof req.body === 'object') {
            data = req.body;
          } else if (bodyData) {
            data = JSON.parse(bodyData);
          } else if (typeof req.body === 'string') {
            data = JSON.parse(req.body);
          }

          if (!data || !data.meta) {
            sendJson(res, 400, { ok: false, error: 'Missing or invalid meta in report payload' });
            return;
          }

          var reportId = 'report-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
          data.id = reportId;

          memoryReports.unshift(data);
          if (memoryReports.length > 50) memoryReports.pop();

          sendJson(res, 200, { ok: true, id: reportId, message: 'Report saved successfully!' });
        } catch (err) {
          sendJson(res, 400, { ok: false, error: 'Failed to parse JSON body: ' + err.message });
        }
      });
      return;
    }

    // Default GET /api/report
    if (req.method === 'GET') {
      sendJson(res, 200, memoryReports);
      return;
    }

    sendJson(res, 404, { error: 'Route not found' });
  } catch (globalErr) {
    sendJson(res, 500, { error: 'Internal Server Error: ' + globalErr.message });
  }
};
