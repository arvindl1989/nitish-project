(function () {
  'use strict';

  var TOAST_ID = 'aem-qa-toast';

  // ─── CONFIG ─────────────────────────────────────────────────────────
  var CONFIG = {
    version: '2.0.0',
    thresholdScore: 80,
    linkBatchSize: 5,
    linkTimeout: 5000,
    reportServer: 'https://qa-mu-gules.vercel.app/api/report',

    selectors: {
      header: '.kone-header, header, [role="banner"]',
      nav:    'nav, [role="navigation"], .kone-header__main-menu',
      main:   'main, [role="main"], #main-content, #content',
      cta: [
        'a[class*="cta"]', 'a[class*="button"]', 'a[class*="btn"]',
        '.cmp-button a', '.cmp-teaser__link',
        'button[class*="cta"]', 'a[class*="kone-button"]', '.kone-button', '.kone-icon-button'
      ],
      image:    '.cmp-image img, [data-cmp-is="image"] img, img',
      richtext: '.cmp-text, [class*="richtext"], [class*="rich-text"]',
    },

    aemPathPattern: /^\/content\/[a-zA-Z]/,

    envPatterns: [
      /author-p\d+.*\.adobeaemcloud\.com/i,
      /-stage\.[a-z]/i,
      /-dev\.[a-z]/i,
      /localhost:\d{4}/i,
      /\.aem\.page/i,
    ],

    genericCtaText: [
      'click here', 'read more', 'learn more', 'here', 'more',
      'link', 'this link', 'find out more', 'see more'
    ],

    weights: {
      metadata: 0.25,
      content: 0.35,
      responsive: 0.15,
      accessibility: 0.25
    }
  };

  // ─── PREVENT DOUBLE RUN ──────────────────────────────────────────────
  if (document.getElementById(TOAST_ID)) return;

  // ─── TOAST UI ────────────────────────────────────────────────────────
  function injectToast() {
    var style = document.createElement('style');
    style.id = 'aem-qa-toast-style';
    style.textContent = [
      '@keyframes qa-slide{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}',
      '@keyframes qa-fade{from{opacity:1}to{opacity:0}}',
      '#aem-qa-toast{position:fixed;bottom:24px;right:24px;width:288px;',
      'background:#0A0F1E;color:#F9FAFB;border:1px solid #1450F5;border-radius:12px;',
      'padding:14px 18px;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;',
      'font-size:13px;z-index:2147483647;box-shadow:0 8px 32px rgba(0,0,0,0.65);',
      'animation:qa-slide 0.3s ease;line-height:1.6;}',
      '#aem-qa-toast.qa-done{animation:qa-fade 0.5s ease 3.5s forwards;}',
      '#aem-qa-toast .qa-t-title{font-weight:700;font-size:14px;color:#fff;margin-bottom:4px;}',
      '#aem-qa-toast .qa-t-msg{color:#9CA3AF;font-size:12px;min-height:16px;}',
      '#aem-qa-toast .qa-t-bar{height:3px;background:#1F2937;border-radius:2px;margin-top:10px;overflow:hidden;}',
      '#aem-qa-toast .qa-t-fill{height:100%;background:#1450F5;border-radius:2px;transition:width 0.4s ease;}'
    ].join('');
    document.head.appendChild(style);

    var toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.innerHTML = [
      '<div class="qa-t-title">⚡ AEM QA Auditor</div>',
      '<div class="qa-t-msg" id="qa-t-msg">🔄 Running checks…</div>',
      '<div class="qa-t-bar"><div class="qa-t-fill" id="qa-t-fill" style="width:5%"></div></div>'
    ].join('');
    document.body.appendChild(toast);
  }

  function updateToast(msg, progress, isError, isDone) {
    var msgEl  = document.getElementById('qa-t-msg');
    var fillEl = document.getElementById('qa-t-fill');
    var toast  = document.getElementById(TOAST_ID);
    if (!toast) return;
    if (msgEl)  msgEl.textContent = msg;
    if (fillEl && progress !== undefined) fillEl.style.width = progress + '%';
    if (isError) {
      toast.style.borderColor = '#EF4444';
      if (fillEl) fillEl.style.background = '#EF4444';
    }
    if (isDone && !isError) {
      toast.style.borderColor = '#10B981';
      if (fillEl) fillEl.style.background = '#10B981';
    }
    if (isDone) {
      toast.classList.add('qa-done');
      setTimeout(function() {
        var t = document.getElementById(TOAST_ID);
        var s = document.getElementById('aem-qa-toast-style');
        if (t) t.remove();
        if (s) s.remove();
      }, 4200);
    }
  }

  var results = {
    metadata: [],
    content: [],
    responsive: [],
    accessibility: []
  };

  var overallScores = {
    metadata: 0,
    content: 0,
    responsive: 0,
    accessibility: 0,
    overall: 0,
    goNoGo: { status: 'CHECKING', reason: 'Running checks...' }
  };

  injectToast();
  runPhase1();
  runPhase2();

  // ─── UTILITY FUNCTIONS ──────────────────────────────────────────────

  function getPath(el) {
    if (!el) return '';
    var parts = [];
    var node = el;
    while (node && node !== document.body && node.parentElement) {
      var sel = node.tagName ? node.tagName.toLowerCase() : '';
      if (node.id) {
        sel += '#' + node.id;
        parts.unshift(sel);
        break;
      }
      if (node.classList && node.classList.length > 0) {
        var cls = Array.from(node.classList).slice(0, 2).join('.');
        if (cls) sel += '.' + cls;
      }
      parts.unshift(sel);
      node = node.parentElement;
    }
    return parts.slice(-3).join(' > ');
  }

  function getCTAs() {
    var selectorStr = Array.isArray(CONFIG.selectors.cta)
      ? CONFIG.selectors.cta.join(', ')
      : CONFIG.selectors.cta;
    return Array.from(document.querySelectorAll(selectorStr));
  }

  function updateLinkProgress(done, total) {
    var pct = total > 0 ? Math.round((done / total) * 100) : 100;
    var msg = total === 0
      ? '✅ No internal links to check'
      : '🔗 Checking links… ' + done + '/' + total + ' (' + pct + '%)';
    // Map link check progress to 40–85% of the overall toast progress bar
    var toastPct = total === 0 ? 85 : Math.round(40 + (pct * 0.45));
    updateToast(msg, toastPct);
  }

  function checkColorContrast() {
    var issues = [];
    var textEls = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, li, a, span, td')).slice(0, 30);
    textEls.forEach(function(el) {
      var styles = window.getComputedStyle(el);
      var color = styles.color;
      var bg = styles.backgroundColor;
      if (!bg || bg === 'rgba(0, 0, 0, 0)') return;
      var ratio = approximateContrastRatio(color, bg);
      if (ratio !== null && ratio < 4.5) {
        issues.push({
          text: el.textContent.trim().substring(0, 30),
          detail: 'Estimated ratio: ' + ratio.toFixed(1) + ':1',
          element: getPath(el)
        });
      }
    });
    return issues.slice(0, 5);
  }

  function approximateContrastRatio(fg, bg) {
    function parseRgb(str) {
      var m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? [+m[1], +m[2], +m[3]] : null;
    }
    function toLinear(c) {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    function luminance(rgb) {
      return 0.2126 * toLinear(rgb[0]) + 0.7152 * toLinear(rgb[1]) + 0.0722 * toLinear(rgb[2]);
    }
    var fgRgb = parseRgb(fg);
    var bgRgb = parseRgb(bg);
    if (!fgRgb || !bgRgb) return null;
    var L1 = luminance(fgRgb);
    var L2 = luminance(bgRgb);
    var bright = Math.max(L1, L2);
    var dark = Math.min(L1, L2);
    return (bright + 0.05) / (dark + 0.05);
  }

  // ─── PHASE 1: SYNCHRONOUS DOM CHECKS ────────────────────────────────

  function runPhase1() {
    results.metadata      = checkMetadata();
    results.content       = checkContent();
    results.responsive    = checkResponsive();
    results.accessibility = checkAccessibility();
    finalizeScores();
    updateToast('🔗 Checking links… (may take a few seconds)', 40);
  }

  function checkMetadata() {
    var r = [];

    // M-01 — Title present (P1)
    var title = document.title ? document.title.trim() : '';
    r.push({
      id: 'M-01', pillar: 'metadata', priority: 'P1',
      label: 'Page title present',
      status: title.length > 0 ? 'pass' : 'fail',
      detail: title.length > 0 ? '"' + title + '"' : 'No <title> tag content found',
    });

    // M-02 — Title length (P2)
    r.push({
      id: 'M-02', pillar: 'metadata', priority: 'P2',
      label: 'Title length (10–60 chars)',
      status: title.length >= 10 && title.length <= 60 ? 'pass'
            : title.length > 60 ? 'warn' : 'fail',
      detail: title.length + ' characters' + (title.length > 60 ? ' — may be truncated in SERPs' : ''),
    });

    // M-03 — Title not generic (P3)
    var genericTitles = ['home', 'page', 'untitled', 'new page', 'document'];
    r.push({
      id: 'M-03', pillar: 'metadata', priority: 'P3',
      label: 'Title not generic',
      status: genericTitles.indexOf(title.toLowerCase()) === -1 ? 'pass' : 'fail',
      detail: genericTitles.indexOf(title.toLowerCase()) > -1
        ? 'Generic title: "' + title + '"' : 'OK',
    });

    // M-04 — Meta description present (P1)
    var metaDesc = document.querySelector('meta[name="description"]');
    var descContent = metaDesc ? metaDesc.getAttribute('content') : '';
    r.push({
      id: 'M-04', pillar: 'metadata', priority: 'P1',
      label: 'Meta description present',
      status: descContent && descContent.trim().length > 0 ? 'pass' : 'fail',
      detail: descContent
        ? '"' + descContent.substring(0, 80) + '…"'
        : 'Missing <meta name="description">',
    });

    // M-05 — Meta description length (P2)
    var descLen = descContent ? descContent.trim().length : 0;
    r.push({
      id: 'M-05', pillar: 'metadata', priority: 'P2',
      label: 'Meta description length (50–160)',
      status: descLen >= 50 && descLen <= 160 ? 'pass'
            : descLen > 160 ? 'warn' : (descLen > 0 ? 'warn' : 'fail'),
      detail: descLen > 0 ? descLen + ' characters' : 'Not set',
    });

    // M-06 — Canonical present (P1)
    var canonical = document.querySelector('link[rel="canonical"]');
    var canonHref = canonical ? canonical.getAttribute('href') : '';
    r.push({
      id: 'M-06', pillar: 'metadata', priority: 'P1',
      label: 'Canonical URL present',
      status: canonHref ? 'pass' : 'fail',
      detail: canonHref || 'No <link rel="canonical"> found',
    });

    // M-07 — Canonical matches page URL (P2)
    var pageUrl = location.href.split('?')[0].replace(/\/$/, '');
    var canonUrl = canonHref ? canonHref.split('?')[0].replace(/\/$/, '') : '';
    r.push({
      id: 'M-07', pillar: 'metadata', priority: 'P2',
      label: 'Canonical matches page URL',
      status: !canonHref ? 'fail'
            : canonUrl === pageUrl ? 'pass' : 'warn',
      detail: canonHref
        ? (canonUrl === pageUrl ? 'Matches' : 'Mismatch: canonical="' + canonUrl + '" vs page="' + pageUrl + '"')
        : 'No canonical to check',
    });

    // M-08 — Robots meta (P2)
    var robots = document.querySelector('meta[name="robots"]');
    var robotsContent = robots ? robots.getAttribute('content') : '';
    r.push({
      id: 'M-08', pillar: 'metadata', priority: 'P2',
      label: 'Robots meta present',
      status: robotsContent
        ? (robotsContent.toLowerCase().indexOf('noindex') > -1 ? 'warn' : 'pass')
        : 'warn',
      detail: robotsContent
        ? (robotsContent.toLowerCase().indexOf('noindex') > -1
          ? 'noindex detected: "' + robotsContent + '"'
          : robotsContent)
        : 'No <meta name="robots"> — relying on server default',
    });

    // M-09 — <html lang> (P1)
    var lang = document.documentElement.getAttribute('lang');
    r.push({
      id: 'M-09', pillar: 'metadata', priority: 'P1',
      label: '<html lang> attribute set',
      status: lang && lang.trim().length > 0 ? 'pass' : 'fail',
      detail: lang ? 'lang="' + lang + '"' : 'Missing lang attribute on <html>',
    });

    // M-10 — OG title (P3)
    var ogTitle = document.querySelector('meta[property="og:title"]');
    r.push({
      id: 'M-10', pillar: 'metadata', priority: 'P3',
      label: 'OG title present',
      status: ogTitle && ogTitle.content ? 'pass' : 'warn',
      detail: ogTitle ? '"' + ogTitle.content + '"' : 'Missing og:title',
    });

    // M-11 — OG description (P3)
    var ogDesc = document.querySelector('meta[property="og:description"]');
    r.push({
      id: 'M-11', pillar: 'metadata', priority: 'P3',
      label: 'OG description present',
      status: ogDesc && ogDesc.content ? 'pass' : 'warn',
      detail: ogDesc ? 'Present' : 'Missing og:description',
    });

    // M-12 — OG image (P3)
    var ogImage = document.querySelector('meta[property="og:image"]');
    r.push({
      id: 'M-12', pillar: 'metadata', priority: 'P3',
      label: 'OG image present',
      status: ogImage && ogImage.content ? 'pass' : 'warn',
      detail: ogImage ? ogImage.content.substring(0, 60) + '…' : 'Missing og:image',
    });

    return r;
  }

  function checkContent() {
    var r = [];

    // C-01 — Exactly 1 H1 (P1)
    var h1s = Array.from(document.querySelectorAll('h1'));
    r.push({
      id: 'C-01', pillar: 'content', priority: 'P1',
      label: 'Exactly one <h1> on page',
      status: h1s.length === 1 ? 'pass' : 'fail',
      detail: h1s.length === 0
        ? 'No <h1> found — critical SEO and accessibility failure'
        : h1s.length + ' H1 elements found',
      items: h1s.map(function(h) {
        return {
          text: h.textContent.trim().substring(0, 40),
          path: getPath(h)
        };
      })
    });

    // C-02 — H1 not empty (P1)
    var h1text = h1s.length > 0 ? h1s[0].textContent.trim() : '';
    r.push({
      id: 'C-02', pillar: 'content', priority: 'P1',
      label: 'H1 has content',
      status: h1text.length > 0 ? 'pass' : 'fail',
      detail: h1text || 'H1 is empty or missing',
    });

    // C-03 — Heading hierarchy (P2)
    var headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    var hierarchyIssues = [];
    var prevLevel = 0;
    headings.forEach(function(h) {
      var level = parseInt(h.tagName[1]);
      if (prevLevel > 0 && level > prevLevel + 1) {
        hierarchyIssues.push(
          'Jumped from H' + prevLevel + ' to H' + level +
          ': "' + h.textContent.trim().substring(0, 40) + '"'
        );
      }
      prevLevel = level;
    });
    r.push({
      id: 'C-03', pillar: 'content', priority: 'P2',
      label: 'Heading hierarchy (no skips)',
      status: hierarchyIssues.length === 0 ? 'pass' : 'warn',
      detail: hierarchyIssues.length === 0
        ? 'Hierarchy is correct'
        : hierarchyIssues.length + ' skip(s) found',
      items: hierarchyIssues.map(function(i) { return { text: i }; })
    });

    // C-04 — No placeholder content (P1)
    var bodyText = document.body.innerText || '';
    var hasLorem = /lorem\s+ipsum/i.test(bodyText);
    r.push({
      id: 'C-04', pillar: 'content', priority: 'P1',
      label: 'No placeholder/lorem ipsum text',
      status: hasLorem ? 'fail' : 'pass',
      detail: hasLorem
        ? 'Lorem ipsum placeholder text found on page'
        : 'No placeholder text detected',
    });

    // C-05 — Images missing alt attribute (P2)
    var allImgs = Array.from(document.querySelectorAll('img'));
    var missingAlt = allImgs.filter(function(img) {
      return !img.hasAttribute('alt');
    });
    r.push({
      id: 'C-05', pillar: 'content', priority: 'P2',
      label: 'All images have alt attribute',
      status: missingAlt.length === 0 ? 'pass' : 'fail',
      detail: missingAlt.length === 0
        ? 'All ' + allImgs.length + ' images have alt'
        : missingAlt.length + ' image(s) missing alt attribute',
      items: missingAlt.map(function(img) {
        return { text: img.src ? img.src.split('/').pop() : '[no src]', path: getPath(img) };
      })
    });

    // C-06 — Invalid alt/ syntax (AEM-specific bug) (P2)
    var invalidAlt = allImgs.filter(function(img) {
      return img.getAttribute('alt') === null && img.outerHTML.indexOf('alt/') > -1;
    });
    r.push({
      id: 'C-06', pillar: 'content', priority: 'P2',
      label: 'No invalid alt/ syntax (AEM bug)',
      status: invalidAlt.length === 0 ? 'pass' : 'warn',
      detail: invalidAlt.length === 0
        ? 'No invalid alt/ attributes'
        : invalidAlt.length + ' image(s) with invalid alt/ syntax — should be alt=""',
    });

    // C-07 — Decorative images (P4, informational)
    var decorativeImgs = allImgs.filter(function(img) {
      return img.getAttribute('alt') === '';
    });
    r.push({
      id: 'C-07', pillar: 'content', priority: 'P4',
      label: 'Decorative images (alt="")',
      status: 'info',
      detail: decorativeImgs.length + ' decorative image(s) with empty alt',
    });

    // ── INTERNAL LINKS (P1) ─────────────────────────────────────────────
    var allLinks = Array.from(document.querySelectorAll('a[href]'));

    // C-09 — AEM content paths in links (P1)
    var aemPathLinks = allLinks.filter(function(a) {
      return CONFIG.aemPathPattern.test(a.getAttribute('href') || '');
    });
    r.push({
      id: 'C-09', pillar: 'content', priority: 'P1',
      label: 'No raw AEM /content/ paths in links',
      status: aemPathLinks.length === 0 ? 'pass' : 'fail',
      detail: aemPathLinks.length === 0
        ? 'No raw AEM paths found'
        : aemPathLinks.length + ' link(s) with /content/ path — will 404 on publish',
      items: aemPathLinks.map(function(a) {
        return { text: a.getAttribute('href'), element: getPath(a) };
      })
    });

    // C-10 — Author/Stage/Dev env URLs in links (P1)
    var envLinks = allLinks.filter(function(a) {
      var href = a.getAttribute('href') || '';
      return CONFIG.envPatterns.some(function(p) { return p.test(href); });
    });
    r.push({
      id: 'C-10', pillar: 'content', priority: 'P1',
      label: 'No author/stage/dev URLs in links',
      status: envLinks.length === 0 ? 'pass' : 'fail',
      detail: envLinks.length === 0
        ? 'No environment URLs found'
        : envLinks.length + ' link(s) pointing to author/stage/dev environment',
      items: envLinks.map(function(a) {
        return { text: a.getAttribute('href'), element: getPath(a) };
      })
    });

    // C-11 — External links missing rel="noopener" (P3)
    var extLinks = allLinks.filter(function(a) {
      var href = a.getAttribute('href') || '';
      return a.getAttribute('target') === '_blank' && href.indexOf('http') === 0;
    });
    var noOpener = extLinks.filter(function(a) {
      return (a.getAttribute('rel') || '').indexOf('noopener') === -1;
    });
    r.push({
      id: 'C-11', pillar: 'content', priority: 'P3',
      label: 'External links have rel="noopener"',
      status: noOpener.length === 0 ? 'pass' : 'warn',
      detail: noOpener.length === 0
        ? 'All ' + extLinks.length + ' external links have rel="noopener"'
        : noOpener.length + ' external link(s) missing rel="noopener"',
      items: noOpener.map(function(a) {
        return { text: a.textContent.trim() || a.getAttribute('href'), element: getPath(a) };
      })
    });

    // C-12 — Dead hash-only anchors (P2)
    var hashAnchors = allLinks.filter(function(a) {
      return a.getAttribute('href') === '#';
    });
    r.push({
      id: 'C-12', pillar: 'content', priority: 'P2',
      label: 'No dead href="#" anchors',
      status: hashAnchors.length === 0 ? 'pass' : 'warn',
      detail: hashAnchors.length === 0
        ? 'No empty anchors found'
        : hashAnchors.length + ' link(s) with href="#"',
      items: hashAnchors.map(function(a) {
        return { text: a.textContent.trim() || '[no text]', element: getPath(a) };
      })
    });

    // C-13 — Empty links (P1)
    var emptyLinks = allLinks.filter(function(a) {
      var text = a.textContent.trim();
      var label = a.getAttribute('aria-label') || a.getAttribute('title') || '';
      var hasVisibleContent = a.querySelector('img[alt]:not([alt=""])');
      return !text && !label && !hasVisibleContent;
    });
    r.push({
      id: 'C-13', pillar: 'content', priority: 'P1',
      label: 'No links with empty text and no aria-label',
      status: emptyLinks.length === 0 ? 'pass' : 'fail',
      detail: emptyLinks.length === 0
        ? 'All links have accessible text'
        : emptyLinks.length + ' link(s) have no text, no aria-label',
      items: emptyLinks.map(function(a) {
        return { text: a.getAttribute('href'), element: getPath(a) };
      })
    });

    // ── CTAs ────────────────────────────────────────────────────────────
    var ctaEls = getCTAs();

    // C-15 — Generic CTA text (P3)
    var genericCTAs = ctaEls.filter(function(el) {
      var text = el.textContent.trim().toLowerCase();
      return CONFIG.genericCtaText.some(function(g) { return text === g; });
    });
    r.push({
      id: 'C-15', pillar: 'content', priority: 'P3',
      label: 'CTAs have descriptive text',
      status: genericCTAs.length === 0 ? 'pass' : 'warn',
      detail: genericCTAs.length === 0
        ? 'All ' + ctaEls.length + ' CTAs have descriptive text'
        : genericCTAs.length + ' CTA(s) with generic text — add aria-label',
      items: genericCTAs.map(function(el) {
        return {
          text: '"' + el.textContent.trim() + '"',
          element: getPath(el),
          suggestion: 'Add aria-label="[descriptive action]"'
        };
      })
    });

    // C-16 — CTAs have accessible label (P2)
    var iconOnlyCTAs = ctaEls.filter(function(el) {
      var text = el.textContent.trim();
      var label = el.getAttribute('aria-label') || el.getAttribute('title') || '';
      return !text && !label;
    });
    r.push({
      id: 'C-16', pillar: 'content', priority: 'P2',
      label: 'Icon-only CTAs have aria-label',
      status: iconOnlyCTAs.length === 0 ? 'pass' : 'fail',
      detail: iconOnlyCTAs.length === 0
        ? 'All icon-only CTAs are labelled'
        : iconOnlyCTAs.length + ' icon-only CTA(s) missing aria-label',
      items: iconOnlyCTAs.map(function(el) {
        return { text: el.outerHTML.substring(0, 80), element: getPath(el) };
      })
    });

    // C-17 — CTA inventory (P4, informational)
    r.push({
      id: 'C-17', pillar: 'content', priority: 'P4',
      label: 'CTA inventory',
      status: 'info',
      detail: ctaEls.length + ' CTA element(s) found',
      items: ctaEls.map(function(el) {
        return { text: el.textContent.trim() || '[icon-only]', href: el.getAttribute('href') || el.tagName };
      })
    });

    // ── FORMS ───────────────────────────────────────────────────────────
    var inputs = Array.from(document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'
    ));
    var unlabelledInputs = inputs.filter(function(inp) {
      var id = inp.getAttribute('id');
      var label = id ? document.querySelector('label[for="' + id + '"]') : null;
      var ariaLabel = inp.getAttribute('aria-label');
      var ariaLabelledBy = inp.getAttribute('aria-labelledby');
      return !label && !ariaLabel && !ariaLabelledBy;
    });
    r.push({
      id: 'C-18', pillar: 'content', priority: 'P2',
      label: 'Form inputs have labels',
      status: unlabelledInputs.length === 0 ? 'pass' : 'fail',
      detail: inputs.length === 0 ? 'No form inputs on page'
            : unlabelledInputs.length === 0 ? 'All ' + inputs.length + ' inputs are labelled'
            : unlabelledInputs.length + ' input(s) missing label',
      items: unlabelledInputs.map(function(inp) {
        return { text: inp.getAttribute('type') || inp.tagName, element: getPath(inp) };
      })
    });

    // C-19 — Embeds inventory (P4)
    var embeds = Array.from(document.querySelectorAll('iframe, video, embed, [data-type="video"]'));
    r.push({
      id: 'C-19', pillar: 'content', priority: 'P4',
      label: 'Embeds inventory',
      status: 'info',
      detail: embeds.length + ' embed(s) found',
      items: embeds.map(function(el) {
        return { text: el.tagName, src: el.getAttribute('src') || el.getAttribute('data-src') || 'no src' };
      })
    });

    return r;
  }

  function checkResponsive() {
    var r = [];

    // R-01 — Viewport meta (P1)
    var viewportMeta = document.querySelector('meta[name="viewport"]');
    var viewportContent = viewportMeta ? viewportMeta.getAttribute('content') : '';
    r.push({
      id: 'R-01', pillar: 'responsive', priority: 'P1',
      label: 'Viewport meta tag present',
      status: viewportContent.indexOf('width=device-width') > -1 ? 'pass' : 'fail',
      detail: viewportContent || 'No viewport meta tag — page will not scale on mobile',
    });

    // R-02 — Horizontal scroll at current viewport (P2)
    var scrollWidth = document.documentElement.scrollWidth;
    var hasHScroll = scrollWidth > window.innerWidth + 5;
    r.push({
      id: 'R-02', pillar: 'responsive', priority: 'P2',
      label: 'No horizontal scroll at current viewport (' + window.innerWidth + 'px)',
      status: hasHScroll ? 'fail' : 'pass',
      detail: hasHScroll
        ? 'Horizontal scroll detected (scrollWidth=' + scrollWidth + 'px > viewport=' + window.innerWidth + 'px)'
        : 'No horizontal scroll at current width',
    });

    // R-05 — Touch targets >= 44x44px (P2)
    var interactiveEls = Array.from(document.querySelectorAll('a, button, [role="button"], input, select'));
    var smallTargets = interactiveEls.filter(function(el) {
      var rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
    });
    r.push({
      id: 'R-05', pillar: 'responsive', priority: 'P2',
      label: 'Touch targets >= 44x44px',
      status: smallTargets.length === 0 ? 'pass' : 'warn',
      detail: smallTargets.length === 0
        ? 'All ' + interactiveEls.length + ' interactive elements meet touch target size'
        : smallTargets.length + ' element(s) smaller than 44x44px',
      items: smallTargets.slice(0, 10).map(function(el) {
        var rect = el.getBoundingClientRect();
        return {
          text: el.textContent.trim().substring(0, 30) || el.tagName,
          size: Math.round(rect.width) + 'x' + Math.round(rect.height) + 'px'
        };
      })
    });

    // R-06 — Navigation visible (P2)
    var navEl = document.querySelector(CONFIG.selectors.header);
    var navRect = navEl ? navEl.getBoundingClientRect() : null;
    r.push({
      id: 'R-06', pillar: 'responsive', priority: 'P2',
      label: 'Navigation visible at current viewport',
      status: navRect && navRect.height > 0 ? 'pass' : 'warn',
      detail: navRect ? 'Header height: ' + Math.round(navRect.height) + 'px' : 'No header/nav element found',
    });

    // R-07 — Image overflow (P3)
    var imgOverflows = Array.from(document.querySelectorAll('img')).filter(function(img) {
      return img.getBoundingClientRect().width > window.innerWidth;
    });
    r.push({
      id: 'R-07', pillar: 'responsive', priority: 'P3',
      label: 'Images not overflowing viewport',
      status: imgOverflows.length === 0 ? 'pass' : 'fail',
      detail: imgOverflows.length === 0
        ? 'No images overflow viewport'
        : imgOverflows.length + ' image(s) wider than viewport',
    });

    // R-08 — srcset coverage (P4)
    var allImgs = Array.from(document.querySelectorAll('img'));
    var withSrcset = allImgs.filter(function(img) { return img.hasAttribute('srcset'); });
    var coverage = allImgs.length > 0 ? Math.round((withSrcset.length / allImgs.length) * 100) : 100;
    r.push({
      id: 'R-08', pillar: 'responsive', priority: 'P4',
      label: 'Responsive srcset coverage',
      status: 'info',
      detail: withSrcset.length + ' of ' + allImgs.length + ' images (' + coverage + '%) use srcset',
    });

    // R-POPUP — Breakpoint popup buttons (informational)
    r.push({
      id: 'R-POPUP', pillar: 'responsive', priority: 'P4',
      label: 'View at breakpoints',
      status: 'info',
      detail: 'Use buttons to open page at mobile/tablet/desktop width',
      isBreakpointControl: true,
    });

    return r;
  }

  function checkAccessibility() {
    var r = [];

    // A-01 — Skip navigation link (P2)
    var skipNav = document.querySelector(
      'a[href="#main"], a[href="#content"], a[href="#main-content"], .skip-nav, .skip-link, [class*="skip"]'
    );
    r.push({
      id: 'A-01', pillar: 'accessibility', priority: 'P2',
      label: 'Skip navigation link present',
      status: skipNav ? 'pass' : 'fail',
      detail: skipNav
        ? 'Found: "' + skipNav.textContent.trim() + '"'
        : 'No skip nav link — keyboard users must tab through entire navigation',
    });

    // A-02 — Colour contrast (P2) — approximate
    var contrastIssues = checkColorContrast();
    r.push({
      id: 'A-02', pillar: 'accessibility', priority: 'P2',
      label: 'Colour contrast — body text (>= 4.5:1)',
      status: contrastIssues.length === 0 ? 'pass' : 'warn',
      detail: contrastIssues.length === 0
        ? 'No obvious contrast issues detected (approximate)'
        : contrastIssues.length + ' element(s) may have insufficient contrast',
      items: contrastIssues,
    });

    // A-04 — Focus visible (P2)
    var focusIssues = [];
    var focusableEls = Array.from(document.querySelectorAll('a, button, input, [tabindex]')).slice(0, 20);
    focusableEls.forEach(function(el) {
      var styles = window.getComputedStyle(el);
      if (styles.outlineStyle === 'none' && styles.outlineWidth === '0px') {
        var boxShadow = styles.boxShadow;
        if (!boxShadow || boxShadow === 'none') {
          focusIssues.push({
            text: el.tagName + ' ' + (el.textContent.trim().substring(0, 20) || el.getAttribute('aria-label') || ''),
            element: getPath(el)
          });
        }
      }
    });
    r.push({
      id: 'A-04', pillar: 'accessibility', priority: 'P2',
      label: 'Focus indicator visible',
      status: focusIssues.length === 0 ? 'pass' : 'warn',
      detail: focusIssues.length === 0
        ? 'Focus styles appear present'
        : focusIssues.length + ' element(s) may lack visible focus indicator',
      items: focusIssues.slice(0, 5)
    });

    // A-05 — Negative tabindex on content (P2)
    var allTabIndex = Array.from(document.querySelectorAll('[tabindex]'));
    var negativeTabIndex = allTabIndex.filter(function(el) {
      var ti = parseInt(el.getAttribute('tabindex'));
      var isInteractive = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].indexOf(el.tagName) > -1;
      return ti < 0 && !isInteractive;
    });
    r.push({
      id: 'A-05', pillar: 'accessibility', priority: 'P2',
      label: 'No negative tabindex on content elements',
      status: negativeTabIndex.length === 0 ? 'pass' : 'warn',
      detail: negativeTabIndex.length === 0
        ? 'No problematic negative tabindex values'
        : negativeTabIndex.length + ' content element(s) with tabindex="-1"',
      items: negativeTabIndex.slice(0, 5).map(function(el) {
        return { text: el.tagName + ': ' + el.className.substring(0, 40), element: getPath(el) };
      })
    });

    // A-06 — ARIA roles valid (P3)
    var validRoles = ['alert','alertdialog','application','article','banner','button','cell','checkbox',
      'columnheader','combobox','complementary','contentinfo','definition','dialog','directory','document',
      'feed','figure','form','grid','gridcell','group','heading','img','link','list','listbox','listitem',
      'log','main','marquee','math','menu','menubar','menuitem','menuitemcheckbox','menuitemradio',
      'navigation','none','note','option','presentation','progressbar','radio','radiogroup','region',
      'row','rowgroup','rowheader','scrollbar','search','searchbox','separator','slider','spinbutton',
      'status','switch','tab','table','tablist','tabpanel','term','textbox','timer','toolbar','tooltip',
      'tree','treegrid','treeitem'];
    var roleEls = Array.from(document.querySelectorAll('[role]'));
    var invalidRoles = roleEls.filter(function(el) {
      return validRoles.indexOf(el.getAttribute('role')) === -1;
    });
    r.push({
      id: 'A-06', pillar: 'accessibility', priority: 'P3',
      label: 'ARIA roles are valid',
      status: invalidRoles.length === 0 ? 'pass' : 'warn',
      detail: invalidRoles.length === 0
        ? 'All ' + roleEls.length + ' role attributes are valid'
        : invalidRoles.length + ' invalid ARIA role(s)',
      items: invalidRoles.map(function(el) {
        return { text: 'role="' + el.getAttribute('role') + '"', element: getPath(el) };
      })
    });

    // A-07 — aria-expanded on toggle buttons (P3)
    var toggleBtns = Array.from(document.querySelectorAll('button, [role="button"]')).filter(function(btn) {
      var controls = btn.getAttribute('aria-controls');
      return controls && document.getElementById(controls);
    });
    var missingExpanded = toggleBtns.filter(function(btn) {
      return !btn.hasAttribute('aria-expanded');
    });
    r.push({
      id: 'A-07', pillar: 'accessibility', priority: 'P3',
      label: 'Toggle buttons have aria-expanded',
      status: missingExpanded.length === 0 ? 'pass' : 'warn',
      detail: missingExpanded.length === 0
        ? 'All toggle buttons have aria-expanded'
        : missingExpanded.length + ' toggle button(s) missing aria-expanded',
    });

    // A-08 — Icon-only buttons have aria-label (P2)
    var buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    var iconBtns = buttons.filter(function(btn) {
      var text = btn.textContent.trim();
      var label = btn.getAttribute('aria-label') || btn.getAttribute('title') || '';
      return !text && !label;
    });
    r.push({
      id: 'A-08', pillar: 'accessibility', priority: 'P2',
      label: 'Icon-only buttons have aria-label',
      status: iconBtns.length === 0 ? 'pass' : 'fail',
      detail: iconBtns.length === 0
        ? 'All icon buttons are labelled'
        : iconBtns.length + ' icon-only button(s) missing aria-label',
      items: iconBtns.slice(0, 5).map(function(btn) {
        return { text: btn.className.substring(0, 50), element: getPath(btn) };
      })
    });

    // A-09 — Decorative SVGs are aria-hidden (P3)
    var svgs = Array.from(document.querySelectorAll('svg'));
    var svgsWithoutHidden = svgs.filter(function(svg) {
      var hasTitle = svg.querySelector('title');
      var hasLabel = svg.getAttribute('aria-label');
      var isHidden = svg.getAttribute('aria-hidden') === 'true';
      return !hasTitle && !hasLabel && !isHidden;
    });
    r.push({
      id: 'A-09', pillar: 'accessibility', priority: 'P3',
      label: 'Decorative SVGs are aria-hidden',
      status: svgsWithoutHidden.length === 0 ? 'pass' : 'warn',
      detail: svgsWithoutHidden.length === 0
        ? 'All ' + svgs.length + ' SVGs properly labelled or hidden'
        : svgsWithoutHidden.length + ' SVG(s) without aria-hidden',
    });

    // A-11 — No auto-playing media (P2)
    var autoplayMedia = Array.from(document.querySelectorAll('video[autoplay], audio[autoplay]'));
    var uncontrolled = autoplayMedia.filter(function(el) {
      return !el.hasAttribute('controls');
    });
    r.push({
      id: 'A-11', pillar: 'accessibility', priority: 'P2',
      label: 'No auto-playing media without controls',
      status: uncontrolled.length === 0 ? 'pass' : 'fail',
      detail: uncontrolled.length === 0
        ? 'No uncontrolled autoplay media'
        : uncontrolled.length + ' media element(s) auto-playing without controls',
    });

    // A-12 — <html lang> (P1 cross-check)
    var lang = document.documentElement.getAttribute('lang');
    r.push({
      id: 'A-12', pillar: 'accessibility', priority: 'P1',
      label: '<html lang> set (WCAG 3.1.1)',
      status: lang && lang.trim() ? 'pass' : 'fail',
      detail: lang ? 'lang="' + lang + '"' : 'Missing lang — screen readers cannot determine language',
    });

    // A-13 — Empty anchor links (P1)
    var allLinks = Array.from(document.querySelectorAll('a'));
    var emptyAnchors = allLinks.filter(function(a) {
      var text = a.textContent.trim();
      var label = a.getAttribute('aria-label') || a.getAttribute('title') || '';
      var imgWithAlt = a.querySelector('img[alt]:not([alt=""])');
      return !text && !label && !imgWithAlt;
    });
    r.push({
      id: 'A-13', pillar: 'accessibility', priority: 'P1',
      label: 'No empty links (no text or aria-label)',
      status: emptyAnchors.length === 0 ? 'pass' : 'fail',
      detail: emptyAnchors.length === 0
        ? 'All links have accessible text'
        : emptyAnchors.length + ' link(s) with no text and no aria-label',
      items: emptyAnchors.slice(0, 5).map(function(a) {
        return { text: a.getAttribute('href'), element: getPath(a) };
      })
    });

    return r;
  }

  // ─── PHASE 2: ASYNC LINK & CTA CHECKER ────────────────────────────────

  async function runPhase2() {
    var allLinks = Array.from(document.querySelectorAll('a[href]'));
    var internalLinks = allLinks
      .map(function(a) { return { el: a, href: a.getAttribute('href') }; })
      .filter(function(item) {
        var href = item.href;
        if (!href) return false;
        if (href.charAt(0) === '#') return false;
        if (/^(mailto|tel|javascript):/i.test(href)) return false;
        if (href.indexOf('http') === 0 && href.indexOf(location.origin) !== 0) return false;
        return true;
      })
      .map(function(item) {
        return {
          el: item.el,
          href: item.href.charAt(0) === '/' ? location.origin + item.href : item.href,
          original: item.href
        };
      });

    var seenHrefs = {};
    var uniqueLinks = internalLinks.filter(function(l) {
      if (seenHrefs[l.href]) return false;
      seenHrefs[l.href] = true;
      return true;
    });

    var ctaEls = getCTAs();
    var ctaLinks = ctaEls
      .filter(function(el) { return el.tagName === 'A' && el.getAttribute('href'); })
      .map(function(el) { return { el: el, href: el.getAttribute('href'), isCTA: true }; })
      .filter(function(item) {
        var href = item.href;
        return href && href !== '#' && !/^(mailto|tel|javascript):/i.test(href);
      });

    var total = uniqueLinks.length + ctaLinks.length;
    updateLinkProgress(0, total);

    var broken = [];
    var ctaFailed = [];
    var done = 0;

    async function checkUrl(href) {
      try {
        var controller = new AbortController();
        var timeout = setTimeout(function() { controller.abort(); }, CONFIG.linkTimeout);
        var res = await fetch(href, {
          method: 'HEAD',
          credentials: 'include',
          signal: controller.signal,
          redirect: 'follow'
        });
        clearTimeout(timeout);
        return { href: href, status: res.status, ok: res.ok };
      } catch (e) {
        return { href: href, status: e.name === 'AbortError' ? 'timeout' : 'error', ok: false };
      }
    }

    async function processBatch(items, isCTA) {
      for (var i = 0; i < items.length; i += CONFIG.linkBatchSize) {
        var batch = items.slice(i, i + CONFIG.linkBatchSize);
        var batchResults = await Promise.all(batch.map(function(item) {
          var url = item.href;
          if (url.charAt(0) === '/') url = location.origin + url;
          return checkUrl(url);
        }));
        batchResults.forEach(function(result, idx) {
          done++;
          updateLinkProgress(done, total);
          if (!result.ok) {
            var entry = {
              href: result.href,
              original: batch[idx].original || result.href,
              httpStatus: result.status,
              element: getPath(batch[idx].el),
              linkText: batch[idx].el ? batch[idx].el.textContent.trim().substring(0, 40) || '[no text]' : '[no text]'
            };
            if (isCTA) ctaFailed.push(entry);
            else broken.push(entry);
          }
        });
      }
    }

    if (total > 0) {
      await processBatch(uniqueLinks, false);
      await processBatch(ctaLinks, true);
    } else {
      updateLinkProgress(0, 0);
    }

    // C-08 — Internal links not 404 (P1)
    results.content.push({
      id: 'C-08', pillar: 'content', priority: 'P1',
      label: 'Internal links resolve (not 404)',
      status: broken.length === 0 ? 'pass' : 'fail',
      detail: broken.length === 0
        ? 'All ' + uniqueLinks.length + ' internal links resolve correctly'
        : broken.length + ' broken link(s) found',
      items: broken
    });

    // C-14 — CTA destinations resolve (P1)
    results.content.push({
      id: 'C-14', pillar: 'content', priority: 'P1',
      label: 'CTA destinations resolve',
      status: ctaFailed.length === 0 ? 'pass' : 'fail',
      detail: ctaFailed.length === 0
        ? 'All ' + ctaLinks.length + ' CTA links resolve'
        : ctaFailed.length + ' CTA(s) pointing to dead URLs',
      items: ctaFailed
    });

    finalizeScores();
    updateToast('📡 Sending report to dashboard…', 90);
    sendToServer();
  }

  // ─── SCORING ENGINE ───────────────────────────────────────────────────

  var PRIORITY_WEIGHTS = { P1: 4, P2: 2, P3: 1, P4: 0 };
  var RESULT_SCORES    = { pass: 1.0, warn: 0.5, fail: 0.0, info: null };

  function calcPillarScore(checks) {
    var earned = 0;
    var possible = 0;
    checks.forEach(function(c) {
      var weight = PRIORITY_WEIGHTS[c.priority] || 0;
      if (weight === 0) return;
      var factor = RESULT_SCORES[c.status];
      if (factor === null || factor === undefined) return;
      earned   += weight * factor;
      possible += weight;
    });
    return possible === 0 ? 100 : Math.round((earned / possible) * 100);
  }

  function calcOverallScore(pillarScores) {
    var w = CONFIG.weights;
    return Math.round(
      pillarScores.metadata      * w.metadata +
      pillarScores.content       * w.content +
      pillarScores.responsive    * w.responsive +
      pillarScores.accessibility * w.accessibility
    );
  }

  function getGoNoGo(overall, allChecks) {
    var p1Failures = allChecks.filter(function(c) {
      return c.priority === 'P1' && c.status === 'fail';
    });
    if (p1Failures.length > 0)
      return { status: 'BLOCK', reason: p1Failures.length + ' P1 failure(s) detected' };
    if (overall >= 90)
      return { status: 'PASS', reason: 'Ready for promotion' };
    if (overall >= 80)
      return { status: 'PASS_WITH_WARNINGS', reason: 'Promote — fix warnings next sprint' };
    if (overall >= 70)
      return { status: 'CONDITIONAL', reason: 'Fix P1+P2 failures before promoting' };
    return { status: 'FAIL', reason: 'Score below threshold' };
  }

  function finalizeScores() {
    var allChecks = [].concat(results.metadata, results.content, results.responsive, results.accessibility);
    overallScores.metadata      = calcPillarScore(results.metadata);
    overallScores.content       = calcPillarScore(results.content);
    overallScores.responsive    = calcPillarScore(results.responsive);
    overallScores.accessibility = calcPillarScore(results.accessibility);
    overallScores.overall       = calcOverallScore(overallScores);
    overallScores.goNoGo        = getGoNoGo(overallScores.overall, allChecks);
  }

  // ─── AUTO-SEND TO DASHBOARD (TCM Extractor pattern) ────────────────

  async function sendToServer() {
    var data = buildReportPayload();
    var payload = { type: 'AEM_QA_REPORT', report: data };

    // ── 1. PRIMARY: Direct postMessage to dashboard window opener ──────
    // Works because dashboard uses window.open() to launch target pages,
    // establishing window.opener — identical to TCM Extractor's mechanism.
    if (window.opener && !window.opener.closed) {
      try { window.opener.postMessage(payload, '*'); } catch (ex) {}
    }

    // ── 2. SECONDARY: BroadcastChannel for same-origin tabs ────────────
    // Catches cases where dashboard and target share the same origin.
    try {
      var bc = new BroadcastChannel('aem_qa_channel');
      bc.postMessage(payload);
      bc.close();
    } catch (ex) {}

    // ── 3. TERTIARY: Silent HTTP POST fallback ──────────────────────────
    // Best-effort only — never blocks or shows error if it fails.
    try {
      fetch(CONFIG.reportServer, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(function () {});
    } catch (ex) {}

    // ── 4. Show center-screen completion dialog (TCM Extractor style) ───
    var score = data.meta.overallScore;
    var goNoGo = data.meta.goNoGo || 'UNKNOWN';
    var isGo = goNoGo === 'GO';
    var gc = isGo ? '#00e5b0' : (score >= 50 ? '#ffb84f' : '#ff4f6a');
    var icon = isGo ? '✅' : (score >= 50 ? '⚠️' : '❌');
    var shortU = location.href.length > 68 ? location.href.slice(0, 68) + '…' : location.href;

    var inner = '<div style="background:#1a1f2e;border-radius:14px;padding:28px 32px;max-width:420px;width:88%;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.75);border:2px solid ' + gc + ';box-sizing:border-box;font-family:system-ui,sans-serif">'
      + '<div style="font-size:2.2rem;margin-bottom:10px">' + icon + '</div>'
      + '<div style="font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:' + gc + ';margin-bottom:14px">AEM QA Audit Complete</div>'
      + '<div style="background:#0d0f18;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:12px 18px;font-family:monospace;font-size:22px;font-weight:700;color:' + gc + ';letter-spacing:2px;margin-bottom:12px">' + score + ' / 100</div>'
      + '<div style="color:#9ca3af;font-size:12px;margin-bottom:8px">Status: <b style="color:' + gc + '">' + goNoGo + '</b></div>'
      + '<div style="font-size:10px;color:#3d4870;margin-bottom:14px;word-break:break-all;overflow:hidden;max-height:26px">' + shortU + '</div>'
      + '<div id="__qaaudcl__" style="font-size:11px;color:#6b7599;background:#0d0f18;border-radius:6px;padding:6px 14px;display:inline-block">Sending to QA Dashboard — closing in 3s</div>'
      + '</div>';

    // Try <dialog>.showModal() first: browser top-layer, above ALL z-index/overflow:hidden (TCM pattern)
    var shown = false;
    try {
      var old = document.getElementById('__qaaud__'); if (old) old.remove();
      var dlg = document.createElement('dialog');
      dlg.id = '__qaaud__';
      dlg.style.cssText = 'background:rgba(0,0,0,.8);border:none;padding:0;margin:0;width:100vw;height:100vh;max-width:100vw;max-height:100vh;overflow:hidden;box-sizing:border-box;display:flex;align-items:center;justify-content:center';
      dlg.innerHTML = inner;
      document.body.appendChild(dlg);
      dlg.showModal();
      shown = true;
    } catch (ex) {}

    // Fallback: position:fixed div (avoids cssText CSP issues — TCM pattern)
    if (!shown) {
      var old2 = document.getElementById('__qaaud__'); if (old2) old2.remove();
      var ov = document.createElement('div');
      ov.id = '__qaaud__';
      ov.style.position = 'fixed';
      ov.style.top = '0'; ov.style.left = '0'; ov.style.right = '0'; ov.style.bottom = '0';
      ov.style.background = 'rgba(0,0,0,.8)';
      ov.style.zIndex = '2147483647';
      ov.style.display = 'flex';
      ov.style.alignItems = 'center';
      ov.style.justifyContent = 'center';
      ov.innerHTML = inner;
      (document.body || document.documentElement).appendChild(ov);
    }

    setTimeout(function () {
      var el = document.getElementById('__qaaudcl__');
      if (el) el.textContent = 'Sent! Closing…';
    }, 2200);
    setTimeout(function () {
      var el = document.getElementById('__qaaud__');
      if (el) el.remove();
      updateToast('✅ ' + score + '/100 — ' + goNoGo + ' — synced to dashboard!', 100, false, true);
    }, 3000);
  }

  function buildReportPayload() {
    var allChecks = [].concat(results.metadata, results.content, results.responsive, results.accessibility);
    var defects = allChecks.filter(function(c) { return c.status === 'fail' || c.status === 'warn'; });

    return {
      meta: {
        url: location.href,
        pageTitle: document.title,
        auditedAt: new Date().toISOString(),
        toolVersion: CONFIG.version,
        viewport: window.innerWidth,
        overallScore: overallScores.overall,
        threshold: CONFIG.thresholdScore,
        status: overallScores.goNoGo.status,
        goNoGo: overallScores.goNoGo.status,
        p1FailCount: allChecks.filter(function(c) { return c.priority === 'P1' && c.status === 'fail'; }).length
      },
      scores: {
        metadata:      { score: overallScores.metadata,      weight: CONFIG.weights.metadata },
        content:       { score: overallScores.content,       weight: CONFIG.weights.content },
        responsive:    { score: overallScores.responsive,    weight: CONFIG.weights.responsive },
        accessibility: { score: overallScores.accessibility, weight: CONFIG.weights.accessibility }
      },
      checks: allChecks,
      defects: defects,
      info: {
        totalChecks: allChecks.length,
        passed:  allChecks.filter(function(c) { return c.status === 'pass'; }).length,
        warned:  allChecks.filter(function(c) { return c.status === 'warn'; }).length,
        failed:  allChecks.filter(function(c) { return c.status === 'fail'; }).length
      }
    };
  }

})();
