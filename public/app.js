(function () {
  'use strict';

  var reportsData = [];
  var activeFile = null;
  var pollIntervalId = null;
  var pollAttempts = 0;
  var POLL_MAX = 12; // 12 × 5 s = 60 s

  // ── TCM Extractor pattern: receive audit reports via browser-native messaging ──
  // This mirrors exactly how TCM Extractor dashboard receives data:
  // window.addEventListener('message') catches postMessage from window.opener,
  // BroadcastChannel catches same-origin tabs. Zero HTTP, zero CORS, instant.
  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'AEM_QA_REPORT' && event.data.report) {
      handleIncomingReport(event.data.report, event.source);
    }
  });
  try {
    var _bc = new BroadcastChannel('aem_qa_channel');
    _bc.onmessage = function (event) {
      if (event.data && event.data.type === 'AEM_QA_REPORT' && event.data.report) {
        handleIncomingReport(event.data.report, null);
      }
    };
  } catch (e) {}

  function handleIncomingReport(report, sourceWindow) {
    if (!report || !report.meta) return;
    // Close the source tab after a short delay (matching TCM Extractor: e.source.close() at 2500ms)
    if (sourceWindow) {
      setTimeout(function () {
        try { if (!sourceWindow.closed) sourceWindow.close(); } catch (e) {}
      }, 2500);
    }
    // Assign ID if not present
    if (!report.id) { report.id = 'report-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7); }
    // Deduplicate
    var exists = reportsData.find(function (r) { return r.id === report.id; });
    if (exists) return;
    reportsData.unshift(report);
    renderReportList(reportsData);
    if (report.id) { selectReport(report.id); }
    showLaunchBanner('success', '⚡ New audit received instantly via browser event! Score: ' + (report.meta.overallScore || '?') + '/100 — ' + (report.meta.status || ''));
  }

  // The compiled bookmarklet is fetched from the server rather than embedded
  // here. The previous build inlined a stale, minifier-corrupted copy whose
  // reportServer URL had been truncated to "https:" -- it did not parse, so
  // every bookmarklet installed from this dashboard threw on click.
  var CLOUD_BOOKMARKLET_JS = "";

  var QUICK_BOOKMARKLET_JS = "";

  function fetchBookmarklet(mode, linkId) {
    return fetch("/api/bookmarklet?mode=" + mode)
      .then(function (r) { return r.ok ? r.text() : Promise.reject(new Error("HTTP " + r.status)); })
      .then(function (text) {
        var code = text.trim();
        var link = document.getElementById(linkId);
        if (link) link.setAttribute("href", code);
        return code;
      })
      .catch(function (err) {
        showLaunchBanner("error", "Could not load the " + mode + " bookmarklet from the server (" + err.message + "). Run: npm run build");
        return "";
      });
  }

  function loadBookmarklet() {
    return Promise.all([
      fetchBookmarklet("full", "drag-bookmarklet-link"),
      fetchBookmarklet("quick", "drag-bookmarklet-quick")
    ]).then(function (pair) {
      CLOUD_BOOKMARKLET_JS = pair[0];
      QUICK_BOOKMARKLET_JS = pair[1];
      return CLOUD_BOOKMARKLET_JS;
    });
  }

  // Resolves once the payload is available, so click handlers never copy an
  // empty string when the user is quicker than the fetch.
  var bookmarkletReady = null;

  document.addEventListener('DOMContentLoaded', function () {
    initApp();
  });

  function initApp() {
    bookmarkletReady = loadBookmarklet();

    [
      { btn: 'copy-bookmark-btn', name: 'AEM QA — Full', get: function () { return CLOUD_BOOKMARKLET_JS; } },
      { btn: 'copy-bookmark-quick-btn', name: 'AEM QA — Quick', get: function () { return QUICK_BOOKMARKLET_JS; } }
    ].forEach(function (spec) {
      var btn = document.getElementById(spec.btn);
      if (!btn) return;
      btn.addEventListener('click', function () {
        bookmarkletReady.then(function () {
          var code = spec.get();
          if (!code) return; // loadBookmarklet already surfaced the error
          navigator.clipboard.writeText(code).then(function () {
            alert('✅ "' + spec.name + '" copied to clipboard!\n\nTo install:\n1. Right-click your browser Bookmarks Bar -> "Add Page..."\n2. Name: ' + spec.name + '\n3. Paste this copied code into the URL field.');
          });
        });
      });
    });

    var launchBtn = document.getElementById('launch-audit-btn');
    var targetInput = document.getElementById('target-url-input');

    if (launchBtn && targetInput) {
      launchBtn.addEventListener('click', function () {
        var rawUrl = targetInput.value.trim();
        if (!rawUrl) {
          showLaunchBanner('error', '⚠️ Please paste a target URL first.');
          return;
        }

        var formattedUrl = rawUrl;
        if (!/^https?:\/\//i.test(formattedUrl)) {
          formattedUrl = 'https://' + formattedUrl;
        }

        // Open the target page
        window.open(formattedUrl, '_blank');

        // Copy bookmarklet to clipboard silently (best-effort)
        if (navigator.clipboard && navigator.clipboard.writeText && bookmarkletReady) {
          bookmarkletReady.then(function (code) {
            if (code) navigator.clipboard.writeText(code).catch(function () {});
          });
        }

        // Show in-page guidance banner
        showLaunchBanner('waiting',
          '⏳ Target page opened in a new tab. ' +
          'Click your <strong>⚡ AEM QA Auditor</strong> bookmarklet on that page — ' +
          'the audit will run in the background and this dashboard will update automatically.');

        // Ensure polling is active
        startPolling();
      });
    }

    var refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', fetchReports);
    }

    var searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', filterReports);
    }

    fetchReports();
    startPolling(); // Always-on polling on page load
  }

  // ─── Launch Banner ────────────────────────────────────────────────
  function showLaunchBanner(type, html) {
    var banner = document.getElementById('launch-status-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'launch-status-banner';
      banner.style.cssText = [
        'padding:12px 20px',
        'font-size:13px',
        'border-radius:8px',
        'margin:0 24px 12px',
        'display:flex',
        'align-items:center',
        'justify-content:space-between',
        'gap:12px',
        'animation:fadeIn 0.3s ease'
      ].join(';');
      var launcher = document.querySelector('.launcher-banner');
      if (launcher && launcher.parentNode) {
        launcher.parentNode.insertBefore(banner, launcher.nextSibling);
      }
    }
    var bg = type === 'error' ? 'rgba(239,68,68,0.12)' :
              type === 'success' ? 'rgba(16,185,129,0.12)' :
              'rgba(20,80,245,0.1)';
    var border = type === 'error' ? '#EF4444' :
                  type === 'success' ? '#10B981' :
                  '#1450F5';
    banner.style.background = bg;
    banner.style.border = '1px solid ' + border;
    banner.innerHTML = '<span>' + html + '</span>' +
      '<button onclick="document.getElementById(\'launch-status-banner\').style.display=\'none\'" ' +
      'style="background:none;border:none;color:inherit;cursor:pointer;font-size:16px;opacity:0.6;padding:0">✕</button>';
    banner.style.display = 'flex';
  }

  // ─── Auto-Poll loop ────────────────────────────────────────────────
  function startPolling() {
    if (pollIntervalId) return; // already polling
    pollIntervalId = setInterval(function () {
      fetch('/api/reports')
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (Array.isArray(data) && data.length > reportsData.length) {
            // New report arrived!
            var isFirstLoad = reportsData.length === 0;
            reportsData = data;
            renderReportList(reportsData);
            if (!isFirstLoad) {
              showLaunchBanner('success', '✅ New audit report received! Live-updated dashboard.');
              if (data[0] && data[0].id) {
                selectReport(data[0].id);
              }
            }
          }
        })
        .catch(function () { /* silently ignore network errors during poll */ });
    }, 4000);
  }

  function stopPolling() {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
  }

  function fetchReports() {
    var listContainer = document.getElementById('report-list');
    if (listContainer) {
      listContainer.innerHTML = '<div class="loading">Loading reports...</div>';
    }

    fetch('/api/reports')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (Array.isArray(data)) {
          reportsData = data;
          renderReportList(reportsData);
        } else {
          listContainer.innerHTML = '<div class="loading">No reports found yet.</div>';
        }
      })
      .catch(function () {
        if (listContainer) {
          listContainer.innerHTML = '<div class="loading">No server reports recorded yet. Audit a page using the launcher above to generate your first report!</div>';
        }
      });
  }

  function renderReportList(items) {
    var listContainer = document.getElementById('report-list');
    var countBadge = document.getElementById('report-count');
    if (!listContainer) return;

    if (countBadge) countBadge.textContent = items.length;

    if (items.length === 0) {
      listContainer.innerHTML = '<div class="loading">No matching reports.</div>';
      return;
    }

    listContainer.innerHTML = items.map(function (item) {
      var isQuick = item.auditMode === 'quick';
      var timeStr = item.auditedAt ? new Date(item.auditedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

      // A quick scan ran only the 15 P1 checks, so it has no 0-100 comparable
      // to a full audit. Show its blocker count instead of parking a number in
      // the score column where it would read as the same measurement.
      var scoreClass, scoreText;
      if (isQuick) {
        scoreClass = item.blockerCount ? 'f' : 'p';
        scoreText = (item.blockerCount || 0) + '<span style="font-size:10px;opacity:.75"> blk</span>';
      } else {
        scoreClass = item.score >= 80 ? (item.score >= 90 ? 'p' : 'w') : 'f';
        scoreText = (item.score === null || item.score === undefined) ? '—' : item.score;
      }

      return [
        '<div class="report-item" data-id="' + item.id + '">',
        '  <div class="item-top">',
        '    <span class="item-url" title="' + item.url + '">' + item.url + '</span>',
        '    <span class="item-score ' + scoreClass + '">' + scoreText + '</span>',
        '  </div>',
        '  <div class="item-meta">',
        '    <span class="status-chip ' + item.status + '">' + (item.status || 'UNKNOWN').replace(/_/g, ' ') + '</span>',
        isQuick ? '    <span class="mode-chip" title="Quick scan: 15 P1 blockers, links sampled">⚡ QUICK</span>' : '',
        '    <span>' + timeStr + '</span>',
        '  </div>',
        '</div>'
      ].join('\n');
    }).join('');

    document.querySelectorAll('.report-item').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        selectReport(id);
      });
    });
  }

  function filterReports() {
    var query = (document.getElementById('search-input').value || '').toLowerCase();
    var filtered = reportsData.filter(function (r) {
      return (r.url || '').toLowerCase().includes(query) || (r.status || '').toLowerCase().includes(query);
    });
    renderReportList(filtered);
  }

  function selectReport(id) {
    document.querySelectorAll('.report-item').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-id') === id);
    });

    var detailContainer = document.getElementById('report-detail');
    detailContainer.innerHTML = '<div class="loading">Fetching audit details...</div>';

    fetch('/api/report-details?id=' + id)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        renderReportDetail(data);
      })
      .catch(function (err) {
        detailContainer.innerHTML = '<div class="loading">Failed to load details for report.</div>';
      });
  }

  function renderReportDetail(report) {
    var detailContainer = document.getElementById('report-detail');
    if (!detailContainer || !report || !report.meta) return;

    var meta = report.meta;
    var scores = report.scores || {};
    var checks = report.checks || [];

    var metaScore = scores.metadata ? scores.metadata.score : 0;
    var contentScore = scores.content ? scores.content.score : 0;
    var respScore = scores.responsive ? scores.responsive.score : 0;
    var a11yScore = scores.accessibility ? scores.accessibility.score : 0;

    var overallClass = meta.overallScore >= 80 ? (meta.overallScore >= 90 ? 'p' : 'w') : 'f';

    var html = [
      '<div class="detail-header">',
      '  <div class="detail-title-row">',
      '    <div>',
      '      <div class="detail-url">' + meta.url + '</div>',
      '      <div class="detail-timestamp">Audited: ' + meta.auditedAt + ' • Tool v' + (meta.toolVersion || '1.0.0') + '</div>',
      '    </div>',
      '    <span class="status-chip ' + meta.status + '" style="font-size:12px;padding:6px 12px;">' + (meta.status || 'UNKNOWN').replace(/_/g, ' ') + '</span>',
      '  </div>',
      '  <div class="score-overview">',
      '    <div class="score-box">',
      '      <div class="score-box-title">Overall Score</div>',
      '      <div class="score-box-val item-score ' + overallClass + '">' + meta.overallScore + '/100</div>',
      '    </div>',
      '    <div class="score-box">',
      '      <div class="score-box-title">Metadata</div>',
      '      <div class="score-box-val">' + metaScore + '%</div>',
      '    </div>',
      '    <div class="score-box">',
      '      <div class="score-box-title">Content</div>',
      '      <div class="score-box-val">' + contentScore + '%</div>',
      '    </div>',
      '    <div class="score-box">',
      '      <div class="score-box-title">Responsive</div>',
      '      <div class="score-box-val">' + respScore + '%</div>',
      '    </div>',
      '    <div class="score-box">',
      '      <div class="score-box-title">Accessibility</div>',
      '      <div class="score-box-val">' + a11yScore + '%</div>',
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="checks-grid">',
      renderPillarSection('Metadata Checks', checks.filter(function (c) { return c.pillar === 'metadata'; })),
      renderPillarSection('Content & Component Checks', checks.filter(function (c) { return c.pillar === 'content'; })),
      renderPillarSection('Responsive Layout Checks', checks.filter(function (c) { return c.pillar === 'responsive'; })),
      renderPillarSection('Accessibility Checks', checks.filter(function (c) { return c.pillar === 'accessibility'; })),
      '</div>'
    ].join('\n');

    detailContainer.innerHTML = html;
  }

  function renderPillarSection(title, checks) {
    if (checks.length === 0) return '';

    return [
      '<div class="pillar-section">',
      '  <div class="pillar-title"><span>' + title + '</span><span>' + checks.length + ' checks</span></div>',
      '  <div class="pillar-body">',
      checks.map(function (c) {
        var icon = c.status === 'pass' ? '✅' : (c.status === 'warn' ? '⚠️' : (c.status === 'fail' ? '❌' : 'ℹ️'));
        var itemsHtml = '';
        if (c.items && c.items.length > 0) {
          itemsHtml = '<div class="items-box">' + c.items.map(function (it) {
            var text = typeof it === 'string' ? it : (it.text || it.detail || JSON.stringify(it));
            return '<div class="item-line">• ' + text + '</div>';
          }).join('') + '</div>';
        }

        return [
          '<div class="check-row ' + c.status + '">',
          '  <span class="check-icon">' + icon + '</span>',
          '  <div class="check-content">',
          '    <div class="check-header"><span class="p-tag ' + c.priority + '">' + c.priority + '</span>' + c.label + '</div>',
          '    <div class="check-detail">' + c.detail + '</div>',
          itemsHtml,
          '  </div>',
          '</div>'
        ].join('\n');
      }).join('\n'),
      '  </div>',
      '</div>'
    ].join('\n');
  }
})();
