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

  // Full standalone self-contained bookmarklet code (CSP-proof, posts to qa-mu-gules.vercel.app)
  var CLOUD_BOOKMARKLET_JS = "javascript:(function%20()%20%7B%20'use%20strict'%3B%20var%20TOAST_ID%20%3D%20'aem-qa-toast'%3B%20var%20CONFIG%20%3D%20%7B%20version%3A%20'2.0.0'%2C%20thresholdScore%3A%2080%2C%20linkBatchSize%3A%205%2C%20linkTimeout%3A%205000%2C%20reportServer%3A%20'https%3A%20selectors%3A%20%7B%20header%3A%20'.kone-header%2C%20header%2C%20%5Brole%3D%22banner%22%5D'%2C%20nav%3A%20'nav%2C%20%5Brole%3D%22navigation%22%5D%2C%20.kone-header__main-menu'%2C%20main%3A%20'main%2C%20%5Brole%3D%22main%22%5D%2C%20%23main-content%2C%20%23content'%2C%20cta%3A%20%5B%20'a%5Bclass*%3D%22cta%22%5D'%2C%20'a%5Bclass*%3D%22button%22%5D'%2C%20'a%5Bclass*%3D%22btn%22%5D'%2C%20'.cmp-button%20a'%2C%20'.cmp-teaser__link'%2C%20'button%5Bclass*%3D%22cta%22%5D'%2C%20'a%5Bclass*%3D%22kone-button%22%5D'%2C%20'.kone-button'%2C%20'.kone-icon-button'%20%5D%2C%20image%3A%20'.cmp-image%20img%2C%20%5Bdata-cmp-is%3D%22image%22%5D%20img%2C%20img'%2C%20richtext%3A%20'.cmp-text%2C%20%5Bclass*%3D%22richtext%22%5D%2C%20%5Bclass*%3D%22rich-text%22%5D'%2C%20%7D%2C%20aemPathPattern%3A%20%2F%5E%5C%2Fcontent%5C%2F%5Ba-zA-Z%5D%2F%2C%20envPatterns%3A%20%5B%20%2Fauthor-p%5Cd%2B.*%5C.adobeaemcloud%5C.com%2Fi%2C%20%2F-stage%5C.%5Ba-z%5D%2Fi%2C%20%2F-dev%5C.%5Ba-z%5D%2Fi%2C%20%2Flocalhost%3A%5Cd%7B4%7D%2Fi%2C%20%2F%5C.aem%5C.page%2Fi%2C%20%5D%2C%20genericCtaText%3A%20%5B%20'click%20here'%2C%20'read%20more'%2C%20'learn%20more'%2C%20'here'%2C%20'more'%2C%20'link'%2C%20'this%20link'%2C%20'find%20out%20more'%2C%20'see%20more'%20%5D%2C%20weights%3A%20%7B%20metadata%3A%200.25%2C%20content%3A%200.35%2C%20responsive%3A%200.15%2C%20accessibility%3A%200.25%20%7D%20%7D%3B%20if%20(document.getElementById(TOAST_ID))%20return%3B%20function%20injectToast()%20%7B%20var%20style%20%3D%20document.createElement('style')%3B%20style.id%20%3D%20'aem-qa-toast-style'%3B%20style.textContent%20%3D%20%5B%20'%40keyframes%20qa-slide%7Bfrom%7Bopacity%3A0%3Btransform%3AtranslateY(16px)%7Dto%7Bopacity%3A1%3Btransform%3AtranslateY(0)%7D%7D'%2C%20'%40keyframes%20qa-fade%7Bfrom%7Bopacity%3A1%7Dto%7Bopacity%3A0%7D%7D'%2C%20'%23aem-qa-toast%7Bposition%3Afixed%3Bbottom%3A24px%3Bright%3A24px%3Bwidth%3A288px%3B'%2C%20'background%3A%230A0F1E%3Bcolor%3A%23F9FAFB%3Bborder%3A1px%20solid%20%231450F5%3Bborder-radius%3A12px%3B'%2C%20'padding%3A14px%2018px%3Bfont-family%3Asystem-ui%2C-apple-system%2CBlinkMacSystemFont%2Csans-serif%3B'%2C%20'font-size%3A13px%3Bz-index%3A2147483647%3Bbox-shadow%3A0%208px%2032px%20rgba(0%2C0%2C0%2C0.65)%3B'%2C%20'animation%3Aqa-slide%200.3s%20ease%3Bline-height%3A1.6%3B%7D'%2C%20'%23aem-qa-toast.qa-done%7Banimation%3Aqa-fade%200.5s%20ease%203.5s%20forwards%3B%7D'%2C%20'%23aem-qa-toast%20.qa-t-title%7Bfont-weight%3A700%3Bfont-size%3A14px%3Bcolor%3A%23fff%3Bmargin-bottom%3A4px%3B%7D'%2C%20'%23aem-qa-toast%20.qa-t-msg%7Bcolor%3A%239CA3AF%3Bfont-size%3A12px%3Bmin-height%3A16px%3B%7D'%2C%20'%23aem-qa-toast%20.qa-t-bar%7Bheight%3A3px%3Bbackground%3A%231F2937%3Bborder-radius%3A2px%3Bmargin-top%3A10px%3Boverflow%3Ahidden%3B%7D'%2C%20'%23aem-qa-toast%20.qa-t-fill%7Bheight%3A100%25%3Bbackground%3A%231450F5%3Bborder-radius%3A2px%3Btransition%3Awidth%200.4s%20ease%3B%7D'%20%5D.join('')%3B%20document.head.appendChild(style)%3B%20var%20toast%20%3D%20document.createElement('div')%3B%20toast.id%20%3D%20TOAST_ID%3B%20toast.innerHTML%20%3D%20%5B%20'%3Cdiv%20class%3D%22qa-t-title%22%3E%C3%A2%C5%A1%C2%A1%20AEM%20QA%20Auditor%3C%2Fdiv%3E'%2C%20'%3Cdiv%20class%3D%22qa-t-msg%22%20id%3D%22qa-t-msg%22%3E%C3%B0%C5%B8%E2%80%9D%E2%80%9E%20Running%20checks%C3%A2%E2%82%AC%C2%A6%3C%2Fdiv%3E'%2C%20'%3Cdiv%20class%3D%22qa-t-bar%22%3E%3Cdiv%20class%3D%22qa-t-fill%22%20id%3D%22qa-t-fill%22%20style%3D%22width%3A5%25%22%3E%3C%2Fdiv%3E%3C%2Fdiv%3E'%20%5D.join('')%3B%20document.body.appendChild(toast)%3B%20%7D%20function%20updateToast(msg%2C%20progress%2C%20isError%2C%20isDone)%20%7B%20var%20msgEl%20%3D%20document.getElementById('qa-t-msg')%3B%20var%20fillEl%20%3D%20document.getElementById('qa-t-fill')%3B%20var%20toast%20%3D%20document.getElementById(TOAST_ID)%3B%20if%20(!toast)%20return%3B%20if%20(msgEl)%20msgEl.textContent%20%3D%20msg%3B%20if%20(fillEl%20%26%26%20progress%20!%3D%3D%20undefined)%20fillEl.style.width%20%3D%20progress%20%2B%20'%25'%3B%20if%20(isError)%20%7B%20toast.style.borderColor%20%3D%20'%23EF4444'%3B%20if%20(fillEl)%20fillEl.style.background%20%3D%20'%23EF4444'%3B%20%7D%20if%20(isDone%20%26%26%20!isError)%20%7B%20toast.style.borderColor%20%3D%20'%2310B981'%3B%20if%20(fillEl)%20fillEl.style.background%20%3D%20'%2310B981'%3B%20%7D%20if%20(isDone)%20%7B%20toast.classList.add('qa-done')%3B%20setTimeout(function()%20%7B%20var%20t%20%3D%20document.getElementById(TOAST_ID)%3B%20var%20s%20%3D%20document.getElementById('aem-qa-toast-style')%3B%20if%20(t)%20t.remove()%3B%20if%20(s)%20s.remove()%3B%20%7D%2C%204200)%3B%20%7D%20%7D%20var%20results%20%3D%20%7B%20metadata%3A%20%5B%5D%2C%20content%3A%20%5B%5D%2C%20responsive%3A%20%5B%5D%2C%20accessibility%3A%20%5B%5D%20%7D%3B%20var%20overallScores%20%3D%20%7B%20metadata%3A%200%2C%20content%3A%200%2C%20responsive%3A%200%2C%20accessibility%3A%200%2C%20overall%3A%200%2C%20goNoGo%3A%20%7B%20status%3A%20'CHECKING'%2C%20reason%3A%20'Running%20checks...'%20%7D%20%7D%3B%20injectToast()%3B%20runPhase1()%3B%20runPhase2()%3B%20function%20getPath(el)%20%7B%20if%20(!el)%20return%20''%3B%20var%20parts%20%3D%20%5B%5D%3B%20var%20node%20%3D%20el%3B%20while%20(node%20%26%26%20node%20!%3D%3D%20document.body%20%26%26%20node.parentElement)%20%7B%20var%20sel%20%3D%20node.tagName%20%3F%20node.tagName.toLowerCase()%20%3A%20''%3B%20if%20(node.id)%20%7B%20sel%20%2B%3D%20'%23'%20%2B%20node.id%3B%20parts.unshift(sel)%3B%20break%3B%20%7D%20if%20(node.classList%20%26%26%20node.classList.length%20%3E%200)%20%7B%20var%20cls%20%3D%20Array.from(node.classList).slice(0%2C%202).join('.')%3B%20if%20(cls)%20sel%20%2B%3D%20'.'%20%2B%20cls%3B%20%7D%20parts.unshift(sel)%3B%20node%20%3D%20node.parentElement%3B%20%7D%20return%20parts.slice(-3).join('%20%3E%20')%3B%20%7D%20function%20getCTAs()%20%7B%20var%20selectorStr%20%3D%20Array.isArray(CONFIG.selectors.cta)%20%3F%20CONFIG.selectors.cta.join('%2C%20')%20%3A%20CONFIG.selectors.cta%3B%20return%20Array.from(document.querySelectorAll(selectorStr))%3B%20%7D%20function%20updateLinkProgress(done%2C%20total)%20%7B%20var%20pct%20%3D%20total%20%3E%200%20%3F%20Math.round((done%20%2F%20total)%20*%20100)%20%3A%20100%3B%20var%20msg%20%3D%20total%20%3D%3D%3D%200%20%3F%20'%C3%A2%C5%93%E2%80%A6%20No%20internal%20links%20to%20check'%20%3A%20'%C3%B0%C5%B8%E2%80%9D%E2%80%94%20Checking%20links%C3%A2%E2%82%AC%C2%A6%20'%20%2B%20done%20%2B%20'%2F'%20%2B%20total%20%2B%20'%20('%20%2B%20pct%20%2B%20'%25)'%3B%20var%20toastPct%20%3D%20total%20%3D%3D%3D%200%20%3F%2085%20%3A%20Math.round(40%20%2B%20(pct%20*%200.45))%3B%20updateToast(msg%2C%20toastPct)%3B%20%7D%20function%20checkColorContrast()%20%7B%20var%20issues%20%3D%20%5B%5D%3B%20var%20textEls%20%3D%20Array.from(document.querySelectorAll('p%2C%20h1%2C%20h2%2C%20h3%2C%20h4%2C%20li%2C%20a%2C%20span%2C%20td')).slice(0%2C%2030)%3B%20textEls.forEach(function(el)%20%7B%20var%20styles%20%3D%20window.getComputedStyle(el)%3B%20var%20color%20%3D%20styles.color%3B%20var%20bg%20%3D%20styles.backgroundColor%3B%20if%20(!bg%20%7C%7C%20bg%20%3D%3D%3D%20'rgba(0%2C%200%2C%200%2C%200)')%20return%3B%20var%20ratio%20%3D%20approximateContrastRatio(color%2C%20bg)%3B%20if%20(ratio%20!%3D%3D%20null%20%26%26%20ratio%20%3C%204.5)%20%7B%20issues.push(%7B%20text%3A%20el.textContent.trim().substring(0%2C%2030)%2C%20detail%3A%20'Estimated%20ratio%3A%20'%20%2B%20ratio.toFixed(1)%20%2B%20'%3A1'%2C%20element%3A%20getPath(el)%20%7D)%3B%20%7D%20%7D)%3B%20return%20issues.slice(0%2C%205)%3B%20%7D%20function%20approximateContrastRatio(fg%2C%20bg)%20%7B%20function%20parseRgb(str)%20%7B%20var%20m%20%3D%20str.match(%2Frgba%3F%5C((%5Cd%2B)%2C%5Cs*(%5Cd%2B)%2C%5Cs*(%5Cd%2B)%2F)%3B%20return%20m%20%3F%20%5B%2Bm%5B1%5D%2C%20%2Bm%5B2%5D%2C%20%2Bm%5B3%5D%5D%20%3A%20null%3B%20%7D%20function%20toLinear(c)%20%7B%20c%20%2F%3D%20255%3B%20return%20c%20%3C%3D%200.03928%20%3F%20c%20%2F%2012.92%20%3A%20Math.pow((c%20%2B%200.055)%20%2F%201.055%2C%202.4)%3B%20%7D%20function%20luminance(rgb)%20%7B%20return%200.2126%20*%20toLinear(rgb%5B0%5D)%20%2B%200.7152%20*%20toLinear(rgb%5B1%5D)%20%2B%200.0722%20*%20toLinear(rgb%5B2%5D)%3B%20%7D%20var%20fgRgb%20%3D%20parseRgb(fg)%3B%20var%20bgRgb%20%3D%20parseRgb(bg)%3B%20if%20(!fgRgb%20%7C%7C%20!bgRgb)%20return%20null%3B%20var%20L1%20%3D%20luminance(fgRgb)%3B%20var%20L2%20%3D%20luminance(bgRgb)%3B%20var%20bright%20%3D%20Math.max(L1%2C%20L2)%3B%20var%20dark%20%3D%20Math.min(L1%2C%20L2)%3B%20return%20(bright%20%2B%200.05)%20%2F%20(dark%20%2B%200.05)%3B%20%7D%20function%20runPhase1()%20%7B%20results.metadata%20%3D%20checkMetadata()%3B%20results.content%20%3D%20checkContent()%3B%20results.responsive%20%3D%20checkResponsive()%3B%20results.accessibility%20%3D%20checkAccessibility()%3B%20finalizeScores()%3B%20updateToast('%C3%B0%C5%B8%E2%80%9D%E2%80%94%20Checking%20links%C3%A2%E2%82%AC%C2%A6%20(may%20take%20a%20few%20seconds)'%2C%2040)%3B%20%7D%20function%20checkMetadata()%20%7B%20var%20r%20%3D%20%5B%5D%3B%20var%20title%20%3D%20document.title%20%3F%20document.title.trim()%20%3A%20''%3B%20r.push(%7B%20id%3A%20'M-01'%2C%20pillar%3A%20'metadata'%2C%20priority%3A%20'P1'%2C%20label%3A%20'Page%20title%20present'%2C%20status%3A%20title.length%20%3E%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20title.length%20%3E%200%20%3F%20'%22'%20%2B%20title%20%2B%20'%22'%20%3A%20'No%20%3Ctitle%3E%20tag%20content%20found'%2C%20%7D)%3B%20r.push(%7B%20id%3A%20'M-02'%2C%20pillar%3A%20'metadata'%2C%20priority%3A%20'P2'%2C%20label%3A%20'Title%20length%20(10%C3%A2%E2%82%AC%E2%80%9C60%20chars)'%2C%20status%3A%20title.length%20%3E%3D%2010%20%26%26%20title.length%20%3C%3D%2060%20%3F%20'pass'%20%3A%20title.length%20%3E%2060%20%3F%20'warn'%20%3A%20'fail'%2C%20detail%3A%20title.length%20%2B%20'%20characters'%20%2B%20(title.length%20%3E%2060%20%3F%20'%20%C3%A2%E2%82%AC%E2%80%9D%20may%20be%20truncated%20in%20SERPs'%20%3A%20'')%2C%20%7D)%3B%20var%20genericTitles%20%3D%20%5B'home'%2C%20'page'%2C%20'untitled'%2C%20'new%20page'%2C%20'document'%5D%3B%20r.push(%7B%20id%3A%20'M-03'%2C%20pillar%3A%20'metadata'%2C%20priority%3A%20'P3'%2C%20label%3A%20'Title%20not%20generic'%2C%20status%3A%20genericTitles.indexOf(title.toLowerCase())%20%3D%3D%3D%20-1%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20genericTitles.indexOf(title.toLowerCase())%20%3E%20-1%20%3F%20'Generic%20title%3A%20%22'%20%2B%20title%20%2B%20'%22'%20%3A%20'OK'%2C%20%7D)%3B%20var%20metaDesc%20%3D%20document.querySelector('meta%5Bname%3D%22description%22%5D')%3B%20var%20descContent%20%3D%20metaDesc%20%3F%20metaDesc.getAttribute('content')%20%3A%20''%3B%20r.push(%7B%20id%3A%20'M-04'%2C%20pillar%3A%20'metadata'%2C%20priority%3A%20'P1'%2C%20label%3A%20'Meta%20description%20present'%2C%20status%3A%20descContent%20%26%26%20descContent.trim().length%20%3E%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20descContent%20%3F%20'%22'%20%2B%20descContent.substring(0%2C%2080)%20%2B%20'%C3%A2%E2%82%AC%C2%A6%22'%20%3A%20'Missing%20%3Cmeta%20name%3D%22description%22%3E'%2C%20%7D)%3B%20var%20descLen%20%3D%20descContent%20%3F%20descContent.trim().length%20%3A%200%3B%20r.push(%7B%20id%3A%20'M-05'%2C%20pillar%3A%20'metadata'%2C%20priority%3A%20'P2'%2C%20label%3A%20'Meta%20description%20length%20(50%C3%A2%E2%82%AC%E2%80%9C160)'%2C%20status%3A%20descLen%20%3E%3D%2050%20%26%26%20descLen%20%3C%3D%20160%20%3F%20'pass'%20%3A%20descLen%20%3E%20160%20%3F%20'warn'%20%3A%20(descLen%20%3E%200%20%3F%20'warn'%20%3A%20'fail')%2C%20detail%3A%20descLen%20%3E%200%20%3F%20descLen%20%2B%20'%20characters'%20%3A%20'Not%20set'%2C%20%7D)%3B%20var%20canonical%20%3D%20document.querySelector('link%5Brel%3D%22canonical%22%5D')%3B%20var%20canonHref%20%3D%20canonical%20%3F%20canonical.getAttribute('href')%20%3A%20''%3B%20r.push(%7B%20id%3A%20'M-06'%2C%20pillar%3A%20'metadata'%2C%20priority%3A%20'P1'%2C%20label%3A%20'Canonical%20URL%20present'%2C%20status%3A%20canonHref%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20canonHref%20%7C%7C%20'No%20%3Clink%20rel%3D%22canonical%22%3E%20found'%2C%20%7D)%3B%20var%20pageUrl%20%3D%20location.href.split('%3F')%5B0%5D.replace(%2F%5C%2F%24%2F%2C%20'')%3B%20var%20canonUrl%20%3D%20canonHref%20%3F%20canonHref.split('%3F')%5B0%5D.replace(%2F%5C%2F%24%2F%2C%20'')%20%3A%20''%3B%20r.push(%7B%20id%3A%20'M-07'%2C%20pillar%3A%20'metadata'%2C%20priority%3A%20'P2'%2C%20label%3A%20'Canonical%20matches%20page%20URL'%2C%20status%3A%20!canonHref%20%3F%20'fail'%20%3A%20canonUrl%20%3D%3D%3D%20pageUrl%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20canonHref%20%3F%20(canonUrl%20%3D%3D%3D%20pageUrl%20%3F%20'Matches'%20%3A%20'Mismatch%3A%20canonical%3D%22'%20%2B%20canonUrl%20%2B%20'%22%20vs%20page%3D%22'%20%2B%20pageUrl%20%2B%20'%22')%20%3A%20'No%20canonical%20to%20check'%2C%20%7D)%3B%20var%20robots%20%3D%20document.querySelector('meta%5Bname%3D%22robots%22%5D')%3B%20var%20robotsContent%20%3D%20robots%20%3F%20robots.getAttribute('content')%20%3A%20''%3B%20r.push(%7B%20id%3A%20'M-08'%2C%20pillar%3A%20'metadata'%2C%20priority%3A%20'P2'%2C%20label%3A%20'Robots%20meta%20present'%2C%20status%3A%20robotsContent%20%3F%20(robotsContent.toLowerCase().indexOf('noindex')%20%3E%20-1%20%3F%20'warn'%20%3A%20'pass')%20%3A%20'warn'%2C%20detail%3A%20robotsContent%20%3F%20(robotsContent.toLowerCase().indexOf('noindex')%20%3E%20-1%20%3F%20'noindex%20detected%3A%20%22'%20%2B%20robotsContent%20%2B%20'%22'%20%3A%20robotsContent)%20%3A%20'No%20%3Cmeta%20name%3D%22robots%22%3E%20%C3%A2%E2%82%AC%E2%80%9D%20relying%20on%20server%20default'%2C%20%7D)%3B%20var%20lang%20%3D%20document.documentElement.getAttribute('lang')%3B%20r.push(%7B%20id%3A%20'M-09'%2C%20pillar%3A%20'metadata'%2C%20priority%3A%20'P1'%2C%20label%3A%20'%3Chtml%20lang%3E%20attribute%20set'%2C%20status%3A%20lang%20%26%26%20lang.trim().length%20%3E%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20lang%20%3F%20'lang%3D%22'%20%2B%20lang%20%2B%20'%22'%20%3A%20'Missing%20lang%20attribute%20on%20%3Chtml%3E'%2C%20%7D)%3B%20var%20ogTitle%20%3D%20document.querySelector('meta%5Bproperty%3D%22og%3Atitle%22%5D')%3B%20r.push(%7B%20id%3A%20'M-10'%2C%20pillar%3A%20'metadata'%2C%20priority%3A%20'P3'%2C%20label%3A%20'OG%20title%20present'%2C%20status%3A%20ogTitle%20%26%26%20ogTitle.content%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20ogTitle%20%3F%20'%22'%20%2B%20ogTitle.content%20%2B%20'%22'%20%3A%20'Missing%20og%3Atitle'%2C%20%7D)%3B%20var%20ogDesc%20%3D%20document.querySelector('meta%5Bproperty%3D%22og%3Adescription%22%5D')%3B%20r.push(%7B%20id%3A%20'M-11'%2C%20pillar%3A%20'metadata'%2C%20priority%3A%20'P3'%2C%20label%3A%20'OG%20description%20present'%2C%20status%3A%20ogDesc%20%26%26%20ogDesc.content%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20ogDesc%20%3F%20'Present'%20%3A%20'Missing%20og%3Adescription'%2C%20%7D)%3B%20var%20ogImage%20%3D%20document.querySelector('meta%5Bproperty%3D%22og%3Aimage%22%5D')%3B%20r.push(%7B%20id%3A%20'M-12'%2C%20pillar%3A%20'metadata'%2C%20priority%3A%20'P3'%2C%20label%3A%20'OG%20image%20present'%2C%20status%3A%20ogImage%20%26%26%20ogImage.content%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20ogImage%20%3F%20ogImage.content.substring(0%2C%2060)%20%2B%20'%C3%A2%E2%82%AC%C2%A6'%20%3A%20'Missing%20og%3Aimage'%2C%20%7D)%3B%20return%20r%3B%20%7D%20function%20checkContent()%20%7B%20var%20r%20%3D%20%5B%5D%3B%20var%20h1s%20%3D%20Array.from(document.querySelectorAll('h1'))%3B%20r.push(%7B%20id%3A%20'C-01'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P1'%2C%20label%3A%20'Exactly%20one%20%3Ch1%3E%20on%20page'%2C%20status%3A%20h1s.length%20%3D%3D%3D%201%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20h1s.length%20%3D%3D%3D%200%20%3F%20'No%20%3Ch1%3E%20found%20%C3%A2%E2%82%AC%E2%80%9D%20critical%20SEO%20and%20accessibility%20failure'%20%3A%20h1s.length%20%2B%20'%20H1%20elements%20found'%2C%20items%3A%20h1s.map(function(h)%20%7B%20return%20%7B%20text%3A%20h.textContent.trim().substring(0%2C%2040)%2C%20path%3A%20getPath(h)%20%7D%3B%20%7D)%20%7D)%3B%20var%20h1text%20%3D%20h1s.length%20%3E%200%20%3F%20h1s%5B0%5D.textContent.trim()%20%3A%20''%3B%20r.push(%7B%20id%3A%20'C-02'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P1'%2C%20label%3A%20'H1%20has%20content'%2C%20status%3A%20h1text.length%20%3E%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20h1text%20%7C%7C%20'H1%20is%20empty%20or%20missing'%2C%20%7D)%3B%20var%20headings%20%3D%20Array.from(document.querySelectorAll('h1%2Ch2%2Ch3%2Ch4%2Ch5%2Ch6'))%3B%20var%20hierarchyIssues%20%3D%20%5B%5D%3B%20var%20prevLevel%20%3D%200%3B%20headings.forEach(function(h)%20%7B%20var%20level%20%3D%20parseInt(h.tagName%5B1%5D)%3B%20if%20(prevLevel%20%3E%200%20%26%26%20level%20%3E%20prevLevel%20%2B%201)%20%7B%20hierarchyIssues.push(%20'Jumped%20from%20H'%20%2B%20prevLevel%20%2B%20'%20to%20H'%20%2B%20level%20%2B%20'%3A%20%22'%20%2B%20h.textContent.trim().substring(0%2C%2040)%20%2B%20'%22'%20)%3B%20%7D%20prevLevel%20%3D%20level%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'C-03'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P2'%2C%20label%3A%20'Heading%20hierarchy%20(no%20skips)'%2C%20status%3A%20hierarchyIssues.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20hierarchyIssues.length%20%3D%3D%3D%200%20%3F%20'Hierarchy%20is%20correct'%20%3A%20hierarchyIssues.length%20%2B%20'%20skip(s)%20found'%2C%20items%3A%20hierarchyIssues.map(function(i)%20%7B%20return%20%7B%20text%3A%20i%20%7D%3B%20%7D)%20%7D)%3B%20var%20bodyText%20%3D%20document.body.innerText%20%7C%7C%20''%3B%20var%20hasLorem%20%3D%20%2Florem%5Cs%2Bipsum%2Fi.test(bodyText)%3B%20r.push(%7B%20id%3A%20'C-04'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P1'%2C%20label%3A%20'No%20placeholder%2Florem%20ipsum%20text'%2C%20status%3A%20hasLorem%20%3F%20'fail'%20%3A%20'pass'%2C%20detail%3A%20hasLorem%20%3F%20'Lorem%20ipsum%20placeholder%20text%20found%20on%20page'%20%3A%20'No%20placeholder%20text%20detected'%2C%20%7D)%3B%20var%20allImgs%20%3D%20Array.from(document.querySelectorAll('img'))%3B%20var%20missingAlt%20%3D%20allImgs.filter(function(img)%20%7B%20return%20!img.hasAttribute('alt')%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'C-05'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P2'%2C%20label%3A%20'All%20images%20have%20alt%20attribute'%2C%20status%3A%20missingAlt.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20missingAlt.length%20%3D%3D%3D%200%20%3F%20'All%20'%20%2B%20allImgs.length%20%2B%20'%20images%20have%20alt'%20%3A%20missingAlt.length%20%2B%20'%20image(s)%20missing%20alt%20attribute'%2C%20items%3A%20missingAlt.map(function(img)%20%7B%20return%20%7B%20text%3A%20img.src%20%3F%20img.src.split('%2F').pop()%20%3A%20'%5Bno%20src%5D'%2C%20path%3A%20getPath(img)%20%7D%3B%20%7D)%20%7D)%3B%20var%20invalidAlt%20%3D%20allImgs.filter(function(img)%20%7B%20return%20img.getAttribute('alt')%20%3D%3D%3D%20null%20%26%26%20img.outerHTML.indexOf('alt%2F')%20%3E%20-1%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'C-06'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P2'%2C%20label%3A%20'No%20invalid%20alt%2F%20syntax%20(AEM%20bug)'%2C%20status%3A%20invalidAlt.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20invalidAlt.length%20%3D%3D%3D%200%20%3F%20'No%20invalid%20alt%2F%20attributes'%20%3A%20invalidAlt.length%20%2B%20'%20image(s)%20with%20invalid%20alt%2F%20syntax%20%C3%A2%E2%82%AC%E2%80%9D%20should%20be%20alt%3D%22%22'%2C%20%7D)%3B%20var%20decorativeImgs%20%3D%20allImgs.filter(function(img)%20%7B%20return%20img.getAttribute('alt')%20%3D%3D%3D%20''%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'C-07'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P4'%2C%20label%3A%20'Decorative%20images%20(alt%3D%22%22)'%2C%20status%3A%20'info'%2C%20detail%3A%20decorativeImgs.length%20%2B%20'%20decorative%20image(s)%20with%20empty%20alt'%2C%20%7D)%3B%20var%20allLinks%20%3D%20Array.from(document.querySelectorAll('a%5Bhref%5D'))%3B%20var%20aemPathLinks%20%3D%20allLinks.filter(function(a)%20%7B%20return%20CONFIG.aemPathPattern.test(a.getAttribute('href')%20%7C%7C%20'')%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'C-09'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P1'%2C%20label%3A%20'No%20raw%20AEM%20%2Fcontent%2F%20paths%20in%20links'%2C%20status%3A%20aemPathLinks.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20aemPathLinks.length%20%3D%3D%3D%200%20%3F%20'No%20raw%20AEM%20paths%20found'%20%3A%20aemPathLinks.length%20%2B%20'%20link(s)%20with%20%2Fcontent%2F%20path%20%C3%A2%E2%82%AC%E2%80%9D%20will%20404%20on%20publish'%2C%20items%3A%20aemPathLinks.map(function(a)%20%7B%20return%20%7B%20text%3A%20a.getAttribute('href')%2C%20element%3A%20getPath(a)%20%7D%3B%20%7D)%20%7D)%3B%20var%20envLinks%20%3D%20allLinks.filter(function(a)%20%7B%20var%20href%20%3D%20a.getAttribute('href')%20%7C%7C%20''%3B%20return%20CONFIG.envPatterns.some(function(p)%20%7B%20return%20p.test(href)%3B%20%7D)%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'C-10'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P1'%2C%20label%3A%20'No%20author%2Fstage%2Fdev%20URLs%20in%20links'%2C%20status%3A%20envLinks.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20envLinks.length%20%3D%3D%3D%200%20%3F%20'No%20environment%20URLs%20found'%20%3A%20envLinks.length%20%2B%20'%20link(s)%20pointing%20to%20author%2Fstage%2Fdev%20environment'%2C%20items%3A%20envLinks.map(function(a)%20%7B%20return%20%7B%20text%3A%20a.getAttribute('href')%2C%20element%3A%20getPath(a)%20%7D%3B%20%7D)%20%7D)%3B%20var%20extLinks%20%3D%20allLinks.filter(function(a)%20%7B%20var%20href%20%3D%20a.getAttribute('href')%20%7C%7C%20''%3B%20return%20a.getAttribute('target')%20%3D%3D%3D%20'_blank'%20%26%26%20href.indexOf('http')%20%3D%3D%3D%200%3B%20%7D)%3B%20var%20noOpener%20%3D%20extLinks.filter(function(a)%20%7B%20return%20(a.getAttribute('rel')%20%7C%7C%20'').indexOf('noopener')%20%3D%3D%3D%20-1%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'C-11'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P3'%2C%20label%3A%20'External%20links%20have%20rel%3D%22noopener%22'%2C%20status%3A%20noOpener.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20noOpener.length%20%3D%3D%3D%200%20%3F%20'All%20'%20%2B%20extLinks.length%20%2B%20'%20external%20links%20have%20rel%3D%22noopener%22'%20%3A%20noOpener.length%20%2B%20'%20external%20link(s)%20missing%20rel%3D%22noopener%22'%2C%20items%3A%20noOpener.map(function(a)%20%7B%20return%20%7B%20text%3A%20a.textContent.trim()%20%7C%7C%20a.getAttribute('href')%2C%20element%3A%20getPath(a)%20%7D%3B%20%7D)%20%7D)%3B%20var%20hashAnchors%20%3D%20allLinks.filter(function(a)%20%7B%20return%20a.getAttribute('href')%20%3D%3D%3D%20'%23'%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'C-12'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P2'%2C%20label%3A%20'No%20dead%20href%3D%22%23%22%20anchors'%2C%20status%3A%20hashAnchors.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20hashAnchors.length%20%3D%3D%3D%200%20%3F%20'No%20empty%20anchors%20found'%20%3A%20hashAnchors.length%20%2B%20'%20link(s)%20with%20href%3D%22%23%22'%2C%20items%3A%20hashAnchors.map(function(a)%20%7B%20return%20%7B%20text%3A%20a.textContent.trim()%20%7C%7C%20'%5Bno%20text%5D'%2C%20element%3A%20getPath(a)%20%7D%3B%20%7D)%20%7D)%3B%20var%20emptyLinks%20%3D%20allLinks.filter(function(a)%20%7B%20var%20text%20%3D%20a.textContent.trim()%3B%20var%20label%20%3D%20a.getAttribute('aria-label')%20%7C%7C%20a.getAttribute('title')%20%7C%7C%20''%3B%20var%20hasVisibleContent%20%3D%20a.querySelector('img%5Balt%5D%3Anot(%5Balt%3D%22%22%5D)')%3B%20return%20!text%20%26%26%20!label%20%26%26%20!hasVisibleContent%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'C-13'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P1'%2C%20label%3A%20'No%20links%20with%20empty%20text%20and%20no%20aria-label'%2C%20status%3A%20emptyLinks.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20emptyLinks.length%20%3D%3D%3D%200%20%3F%20'All%20links%20have%20accessible%20text'%20%3A%20emptyLinks.length%20%2B%20'%20link(s)%20have%20no%20text%2C%20no%20aria-label'%2C%20items%3A%20emptyLinks.map(function(a)%20%7B%20return%20%7B%20text%3A%20a.getAttribute('href')%2C%20element%3A%20getPath(a)%20%7D%3B%20%7D)%20%7D)%3B%20var%20ctaEls%20%3D%20getCTAs()%3B%20var%20genericCTAs%20%3D%20ctaEls.filter(function(el)%20%7B%20var%20text%20%3D%20el.textContent.trim().toLowerCase()%3B%20return%20CONFIG.genericCtaText.some(function(g)%20%7B%20return%20text%20%3D%3D%3D%20g%3B%20%7D)%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'C-15'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P3'%2C%20label%3A%20'CTAs%20have%20descriptive%20text'%2C%20status%3A%20genericCTAs.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20genericCTAs.length%20%3D%3D%3D%200%20%3F%20'All%20'%20%2B%20ctaEls.length%20%2B%20'%20CTAs%20have%20descriptive%20text'%20%3A%20genericCTAs.length%20%2B%20'%20CTA(s)%20with%20generic%20text%20%C3%A2%E2%82%AC%E2%80%9D%20add%20aria-label'%2C%20items%3A%20genericCTAs.map(function(el)%20%7B%20return%20%7B%20text%3A%20'%22'%20%2B%20el.textContent.trim()%20%2B%20'%22'%2C%20element%3A%20getPath(el)%2C%20suggestion%3A%20'Add%20aria-label%3D%22%5Bdescriptive%20action%5D%22'%20%7D%3B%20%7D)%20%7D)%3B%20var%20iconOnlyCTAs%20%3D%20ctaEls.filter(function(el)%20%7B%20var%20text%20%3D%20el.textContent.trim()%3B%20var%20label%20%3D%20el.getAttribute('aria-label')%20%7C%7C%20el.getAttribute('title')%20%7C%7C%20''%3B%20return%20!text%20%26%26%20!label%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'C-16'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P2'%2C%20label%3A%20'Icon-only%20CTAs%20have%20aria-label'%2C%20status%3A%20iconOnlyCTAs.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20iconOnlyCTAs.length%20%3D%3D%3D%200%20%3F%20'All%20icon-only%20CTAs%20are%20labelled'%20%3A%20iconOnlyCTAs.length%20%2B%20'%20icon-only%20CTA(s)%20missing%20aria-label'%2C%20items%3A%20iconOnlyCTAs.map(function(el)%20%7B%20return%20%7B%20text%3A%20el.outerHTML.substring(0%2C%2080)%2C%20element%3A%20getPath(el)%20%7D%3B%20%7D)%20%7D)%3B%20r.push(%7B%20id%3A%20'C-17'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P4'%2C%20label%3A%20'CTA%20inventory'%2C%20status%3A%20'info'%2C%20detail%3A%20ctaEls.length%20%2B%20'%20CTA%20element(s)%20found'%2C%20items%3A%20ctaEls.map(function(el)%20%7B%20return%20%7B%20text%3A%20el.textContent.trim()%20%7C%7C%20'%5Bicon-only%5D'%2C%20href%3A%20el.getAttribute('href')%20%7C%7C%20el.tagName%20%7D%3B%20%7D)%20%7D)%3B%20var%20inputs%20%3D%20Array.from(document.querySelectorAll(%20'input%3Anot(%5Btype%3D%22hidden%22%5D)%3Anot(%5Btype%3D%22submit%22%5D)%3Anot(%5Btype%3D%22button%22%5D)%2C%20textarea%2C%20select'%20))%3B%20var%20unlabelledInputs%20%3D%20inputs.filter(function(inp)%20%7B%20var%20id%20%3D%20inp.getAttribute('id')%3B%20var%20label%20%3D%20id%20%3F%20document.querySelector('label%5Bfor%3D%22'%20%2B%20id%20%2B%20'%22%5D')%20%3A%20null%3B%20var%20ariaLabel%20%3D%20inp.getAttribute('aria-label')%3B%20var%20ariaLabelledBy%20%3D%20inp.getAttribute('aria-labelledby')%3B%20return%20!label%20%26%26%20!ariaLabel%20%26%26%20!ariaLabelledBy%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'C-18'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P2'%2C%20label%3A%20'Form%20inputs%20have%20labels'%2C%20status%3A%20unlabelledInputs.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20inputs.length%20%3D%3D%3D%200%20%3F%20'No%20form%20inputs%20on%20page'%20%3A%20unlabelledInputs.length%20%3D%3D%3D%200%20%3F%20'All%20'%20%2B%20inputs.length%20%2B%20'%20inputs%20are%20labelled'%20%3A%20unlabelledInputs.length%20%2B%20'%20input(s)%20missing%20label'%2C%20items%3A%20unlabelledInputs.map(function(inp)%20%7B%20return%20%7B%20text%3A%20inp.getAttribute('type')%20%7C%7C%20inp.tagName%2C%20element%3A%20getPath(inp)%20%7D%3B%20%7D)%20%7D)%3B%20var%20embeds%20%3D%20Array.from(document.querySelectorAll('iframe%2C%20video%2C%20embed%2C%20%5Bdata-type%3D%22video%22%5D'))%3B%20r.push(%7B%20id%3A%20'C-19'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P4'%2C%20label%3A%20'Embeds%20inventory'%2C%20status%3A%20'info'%2C%20detail%3A%20embeds.length%20%2B%20'%20embed(s)%20found'%2C%20items%3A%20embeds.map(function(el)%20%7B%20return%20%7B%20text%3A%20el.tagName%2C%20src%3A%20el.getAttribute('src')%20%7C%7C%20el.getAttribute('data-src')%20%7C%7C%20'no%20src'%20%7D%3B%20%7D)%20%7D)%3B%20return%20r%3B%20%7D%20function%20checkResponsive()%20%7B%20var%20r%20%3D%20%5B%5D%3B%20var%20viewportMeta%20%3D%20document.querySelector('meta%5Bname%3D%22viewport%22%5D')%3B%20var%20viewportContent%20%3D%20viewportMeta%20%3F%20viewportMeta.getAttribute('content')%20%3A%20''%3B%20r.push(%7B%20id%3A%20'R-01'%2C%20pillar%3A%20'responsive'%2C%20priority%3A%20'P1'%2C%20label%3A%20'Viewport%20meta%20tag%20present'%2C%20status%3A%20viewportContent.indexOf('width%3Ddevice-width')%20%3E%20-1%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20viewportContent%20%7C%7C%20'No%20viewport%20meta%20tag%20%C3%A2%E2%82%AC%E2%80%9D%20page%20will%20not%20scale%20on%20mobile'%2C%20%7D)%3B%20var%20scrollWidth%20%3D%20document.documentElement.scrollWidth%3B%20var%20hasHScroll%20%3D%20scrollWidth%20%3E%20window.innerWidth%20%2B%205%3B%20r.push(%7B%20id%3A%20'R-02'%2C%20pillar%3A%20'responsive'%2C%20priority%3A%20'P2'%2C%20label%3A%20'No%20horizontal%20scroll%20at%20current%20viewport%20('%20%2B%20window.innerWidth%20%2B%20'px)'%2C%20status%3A%20hasHScroll%20%3F%20'fail'%20%3A%20'pass'%2C%20detail%3A%20hasHScroll%20%3F%20'Horizontal%20scroll%20detected%20(scrollWidth%3D'%20%2B%20scrollWidth%20%2B%20'px%20%3E%20viewport%3D'%20%2B%20window.innerWidth%20%2B%20'px)'%20%3A%20'No%20horizontal%20scroll%20at%20current%20width'%2C%20%7D)%3B%20var%20interactiveEls%20%3D%20Array.from(document.querySelectorAll('a%2C%20button%2C%20%5Brole%3D%22button%22%5D%2C%20input%2C%20select'))%3B%20var%20smallTargets%20%3D%20interactiveEls.filter(function(el)%20%7B%20var%20rect%20%3D%20el.getBoundingClientRect()%3B%20return%20rect.width%20%3E%200%20%26%26%20rect.height%20%3E%200%20%26%26%20(rect.width%20%3C%2044%20%7C%7C%20rect.height%20%3C%2044)%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'R-05'%2C%20pillar%3A%20'responsive'%2C%20priority%3A%20'P2'%2C%20label%3A%20'Touch%20targets%20%3E%3D%2044x44px'%2C%20status%3A%20smallTargets.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20smallTargets.length%20%3D%3D%3D%200%20%3F%20'All%20'%20%2B%20interactiveEls.length%20%2B%20'%20interactive%20elements%20meet%20touch%20target%20size'%20%3A%20smallTargets.length%20%2B%20'%20element(s)%20smaller%20than%2044x44px'%2C%20items%3A%20smallTargets.slice(0%2C%2010).map(function(el)%20%7B%20var%20rect%20%3D%20el.getBoundingClientRect()%3B%20return%20%7B%20text%3A%20el.textContent.trim().substring(0%2C%2030)%20%7C%7C%20el.tagName%2C%20size%3A%20Math.round(rect.width)%20%2B%20'x'%20%2B%20Math.round(rect.height)%20%2B%20'px'%20%7D%3B%20%7D)%20%7D)%3B%20var%20navEl%20%3D%20document.querySelector(CONFIG.selectors.header)%3B%20var%20navRect%20%3D%20navEl%20%3F%20navEl.getBoundingClientRect()%20%3A%20null%3B%20r.push(%7B%20id%3A%20'R-06'%2C%20pillar%3A%20'responsive'%2C%20priority%3A%20'P2'%2C%20label%3A%20'Navigation%20visible%20at%20current%20viewport'%2C%20status%3A%20navRect%20%26%26%20navRect.height%20%3E%200%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20navRect%20%3F%20'Header%20height%3A%20'%20%2B%20Math.round(navRect.height)%20%2B%20'px'%20%3A%20'No%20header%2Fnav%20element%20found'%2C%20%7D)%3B%20var%20imgOverflows%20%3D%20Array.from(document.querySelectorAll('img')).filter(function(img)%20%7B%20return%20img.getBoundingClientRect().width%20%3E%20window.innerWidth%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'R-07'%2C%20pillar%3A%20'responsive'%2C%20priority%3A%20'P3'%2C%20label%3A%20'Images%20not%20overflowing%20viewport'%2C%20status%3A%20imgOverflows.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20imgOverflows.length%20%3D%3D%3D%200%20%3F%20'No%20images%20overflow%20viewport'%20%3A%20imgOverflows.length%20%2B%20'%20image(s)%20wider%20than%20viewport'%2C%20%7D)%3B%20var%20allImgs%20%3D%20Array.from(document.querySelectorAll('img'))%3B%20var%20withSrcset%20%3D%20allImgs.filter(function(img)%20%7B%20return%20img.hasAttribute('srcset')%3B%20%7D)%3B%20var%20coverage%20%3D%20allImgs.length%20%3E%200%20%3F%20Math.round((withSrcset.length%20%2F%20allImgs.length)%20*%20100)%20%3A%20100%3B%20r.push(%7B%20id%3A%20'R-08'%2C%20pillar%3A%20'responsive'%2C%20priority%3A%20'P4'%2C%20label%3A%20'Responsive%20srcset%20coverage'%2C%20status%3A%20'info'%2C%20detail%3A%20withSrcset.length%20%2B%20'%20of%20'%20%2B%20allImgs.length%20%2B%20'%20images%20('%20%2B%20coverage%20%2B%20'%25)%20use%20srcset'%2C%20%7D)%3B%20r.push(%7B%20id%3A%20'R-POPUP'%2C%20pillar%3A%20'responsive'%2C%20priority%3A%20'P4'%2C%20label%3A%20'View%20at%20breakpoints'%2C%20status%3A%20'info'%2C%20detail%3A%20'Use%20buttons%20to%20open%20page%20at%20mobile%2Ftablet%2Fdesktop%20width'%2C%20isBreakpointControl%3A%20true%2C%20%7D)%3B%20return%20r%3B%20%7D%20function%20checkAccessibility()%20%7B%20var%20r%20%3D%20%5B%5D%3B%20var%20skipNav%20%3D%20document.querySelector(%20'a%5Bhref%3D%22%23main%22%5D%2C%20a%5Bhref%3D%22%23content%22%5D%2C%20a%5Bhref%3D%22%23main-content%22%5D%2C%20.skip-nav%2C%20.skip-link%2C%20%5Bclass*%3D%22skip%22%5D'%20)%3B%20r.push(%7B%20id%3A%20'A-01'%2C%20pillar%3A%20'accessibility'%2C%20priority%3A%20'P2'%2C%20label%3A%20'Skip%20navigation%20link%20present'%2C%20status%3A%20skipNav%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20skipNav%20%3F%20'Found%3A%20%22'%20%2B%20skipNav.textContent.trim()%20%2B%20'%22'%20%3A%20'No%20skip%20nav%20link%20%C3%A2%E2%82%AC%E2%80%9D%20keyboard%20users%20must%20tab%20through%20entire%20navigation'%2C%20%7D)%3B%20var%20contrastIssues%20%3D%20checkColorContrast()%3B%20r.push(%7B%20id%3A%20'A-02'%2C%20pillar%3A%20'accessibility'%2C%20priority%3A%20'P2'%2C%20label%3A%20'Colour%20contrast%20%C3%A2%E2%82%AC%E2%80%9D%20body%20text%20(%3E%3D%204.5%3A1)'%2C%20status%3A%20contrastIssues.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20contrastIssues.length%20%3D%3D%3D%200%20%3F%20'No%20obvious%20contrast%20issues%20detected%20(approximate)'%20%3A%20contrastIssues.length%20%2B%20'%20element(s)%20may%20have%20insufficient%20contrast'%2C%20items%3A%20contrastIssues%2C%20%7D)%3B%20var%20focusIssues%20%3D%20%5B%5D%3B%20var%20focusableEls%20%3D%20Array.from(document.querySelectorAll('a%2C%20button%2C%20input%2C%20%5Btabindex%5D')).slice(0%2C%2020)%3B%20focusableEls.forEach(function(el)%20%7B%20var%20styles%20%3D%20window.getComputedStyle(el)%3B%20if%20(styles.outlineStyle%20%3D%3D%3D%20'none'%20%26%26%20styles.outlineWidth%20%3D%3D%3D%20'0px')%20%7B%20var%20boxShadow%20%3D%20styles.boxShadow%3B%20if%20(!boxShadow%20%7C%7C%20boxShadow%20%3D%3D%3D%20'none')%20%7B%20focusIssues.push(%7B%20text%3A%20el.tagName%20%2B%20'%20'%20%2B%20(el.textContent.trim().substring(0%2C%2020)%20%7C%7C%20el.getAttribute('aria-label')%20%7C%7C%20'')%2C%20element%3A%20getPath(el)%20%7D)%3B%20%7D%20%7D%20%7D)%3B%20r.push(%7B%20id%3A%20'A-04'%2C%20pillar%3A%20'accessibility'%2C%20priority%3A%20'P2'%2C%20label%3A%20'Focus%20indicator%20visible'%2C%20status%3A%20focusIssues.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20focusIssues.length%20%3D%3D%3D%200%20%3F%20'Focus%20styles%20appear%20present'%20%3A%20focusIssues.length%20%2B%20'%20element(s)%20may%20lack%20visible%20focus%20indicator'%2C%20items%3A%20focusIssues.slice(0%2C%205)%20%7D)%3B%20var%20allTabIndex%20%3D%20Array.from(document.querySelectorAll('%5Btabindex%5D'))%3B%20var%20negativeTabIndex%20%3D%20allTabIndex.filter(function(el)%20%7B%20var%20ti%20%3D%20parseInt(el.getAttribute('tabindex'))%3B%20var%20isInteractive%20%3D%20%5B'A'%2C%20'BUTTON'%2C%20'INPUT'%2C%20'SELECT'%2C%20'TEXTAREA'%5D.indexOf(el.tagName)%20%3E%20-1%3B%20return%20ti%20%3C%200%20%26%26%20!isInteractive%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'A-05'%2C%20pillar%3A%20'accessibility'%2C%20priority%3A%20'P2'%2C%20label%3A%20'No%20negative%20tabindex%20on%20content%20elements'%2C%20status%3A%20negativeTabIndex.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20negativeTabIndex.length%20%3D%3D%3D%200%20%3F%20'No%20problematic%20negative%20tabindex%20values'%20%3A%20negativeTabIndex.length%20%2B%20'%20content%20element(s)%20with%20tabindex%3D%22-1%22'%2C%20items%3A%20negativeTabIndex.slice(0%2C%205).map(function(el)%20%7B%20return%20%7B%20text%3A%20el.tagName%20%2B%20'%3A%20'%20%2B%20el.className.substring(0%2C%2040)%2C%20element%3A%20getPath(el)%20%7D%3B%20%7D)%20%7D)%3B%20var%20validRoles%20%3D%20%5B'alert'%2C'alertdialog'%2C'application'%2C'article'%2C'banner'%2C'button'%2C'cell'%2C'checkbox'%2C%20'columnheader'%2C'combobox'%2C'complementary'%2C'contentinfo'%2C'definition'%2C'dialog'%2C'directory'%2C'document'%2C%20'feed'%2C'figure'%2C'form'%2C'grid'%2C'gridcell'%2C'group'%2C'heading'%2C'img'%2C'link'%2C'list'%2C'listbox'%2C'listitem'%2C%20'log'%2C'main'%2C'marquee'%2C'math'%2C'menu'%2C'menubar'%2C'menuitem'%2C'menuitemcheckbox'%2C'menuitemradio'%2C%20'navigation'%2C'none'%2C'note'%2C'option'%2C'presentation'%2C'progressbar'%2C'radio'%2C'radiogroup'%2C'region'%2C%20'row'%2C'rowgroup'%2C'rowheader'%2C'scrollbar'%2C'search'%2C'searchbox'%2C'separator'%2C'slider'%2C'spinbutton'%2C%20'status'%2C'switch'%2C'tab'%2C'table'%2C'tablist'%2C'tabpanel'%2C'term'%2C'textbox'%2C'timer'%2C'toolbar'%2C'tooltip'%2C%20'tree'%2C'treegrid'%2C'treeitem'%5D%3B%20var%20roleEls%20%3D%20Array.from(document.querySelectorAll('%5Brole%5D'))%3B%20var%20invalidRoles%20%3D%20roleEls.filter(function(el)%20%7B%20return%20validRoles.indexOf(el.getAttribute('role'))%20%3D%3D%3D%20-1%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'A-06'%2C%20pillar%3A%20'accessibility'%2C%20priority%3A%20'P3'%2C%20label%3A%20'ARIA%20roles%20are%20valid'%2C%20status%3A%20invalidRoles.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20invalidRoles.length%20%3D%3D%3D%200%20%3F%20'All%20'%20%2B%20roleEls.length%20%2B%20'%20role%20attributes%20are%20valid'%20%3A%20invalidRoles.length%20%2B%20'%20invalid%20ARIA%20role(s)'%2C%20items%3A%20invalidRoles.map(function(el)%20%7B%20return%20%7B%20text%3A%20'role%3D%22'%20%2B%20el.getAttribute('role')%20%2B%20'%22'%2C%20element%3A%20getPath(el)%20%7D%3B%20%7D)%20%7D)%3B%20var%20toggleBtns%20%3D%20Array.from(document.querySelectorAll('button%2C%20%5Brole%3D%22button%22%5D')).filter(function(btn)%20%7B%20var%20controls%20%3D%20btn.getAttribute('aria-controls')%3B%20return%20controls%20%26%26%20document.getElementById(controls)%3B%20%7D)%3B%20var%20missingExpanded%20%3D%20toggleBtns.filter(function(btn)%20%7B%20return%20!btn.hasAttribute('aria-expanded')%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'A-07'%2C%20pillar%3A%20'accessibility'%2C%20priority%3A%20'P3'%2C%20label%3A%20'Toggle%20buttons%20have%20aria-expanded'%2C%20status%3A%20missingExpanded.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20missingExpanded.length%20%3D%3D%3D%200%20%3F%20'All%20toggle%20buttons%20have%20aria-expanded'%20%3A%20missingExpanded.length%20%2B%20'%20toggle%20button(s)%20missing%20aria-expanded'%2C%20%7D)%3B%20var%20buttons%20%3D%20Array.from(document.querySelectorAll('button%2C%20%5Brole%3D%22button%22%5D'))%3B%20var%20iconBtns%20%3D%20buttons.filter(function(btn)%20%7B%20var%20text%20%3D%20btn.textContent.trim()%3B%20var%20label%20%3D%20btn.getAttribute('aria-label')%20%7C%7C%20btn.getAttribute('title')%20%7C%7C%20''%3B%20return%20!text%20%26%26%20!label%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'A-08'%2C%20pillar%3A%20'accessibility'%2C%20priority%3A%20'P2'%2C%20label%3A%20'Icon-only%20buttons%20have%20aria-label'%2C%20status%3A%20iconBtns.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20iconBtns.length%20%3D%3D%3D%200%20%3F%20'All%20icon%20buttons%20are%20labelled'%20%3A%20iconBtns.length%20%2B%20'%20icon-only%20button(s)%20missing%20aria-label'%2C%20items%3A%20iconBtns.slice(0%2C%205).map(function(btn)%20%7B%20return%20%7B%20text%3A%20btn.className.substring(0%2C%2050)%2C%20element%3A%20getPath(btn)%20%7D%3B%20%7D)%20%7D)%3B%20var%20svgs%20%3D%20Array.from(document.querySelectorAll('svg'))%3B%20var%20svgsWithoutHidden%20%3D%20svgs.filter(function(svg)%20%7B%20var%20hasTitle%20%3D%20svg.querySelector('title')%3B%20var%20hasLabel%20%3D%20svg.getAttribute('aria-label')%3B%20var%20isHidden%20%3D%20svg.getAttribute('aria-hidden')%20%3D%3D%3D%20'true'%3B%20return%20!hasTitle%20%26%26%20!hasLabel%20%26%26%20!isHidden%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'A-09'%2C%20pillar%3A%20'accessibility'%2C%20priority%3A%20'P3'%2C%20label%3A%20'Decorative%20SVGs%20are%20aria-hidden'%2C%20status%3A%20svgsWithoutHidden.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'warn'%2C%20detail%3A%20svgsWithoutHidden.length%20%3D%3D%3D%200%20%3F%20'All%20'%20%2B%20svgs.length%20%2B%20'%20SVGs%20properly%20labelled%20or%20hidden'%20%3A%20svgsWithoutHidden.length%20%2B%20'%20SVG(s)%20without%20aria-hidden'%2C%20%7D)%3B%20var%20autoplayMedia%20%3D%20Array.from(document.querySelectorAll('video%5Bautoplay%5D%2C%20audio%5Bautoplay%5D'))%3B%20var%20uncontrolled%20%3D%20autoplayMedia.filter(function(el)%20%7B%20return%20!el.hasAttribute('controls')%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'A-11'%2C%20pillar%3A%20'accessibility'%2C%20priority%3A%20'P2'%2C%20label%3A%20'No%20auto-playing%20media%20without%20controls'%2C%20status%3A%20uncontrolled.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20uncontrolled.length%20%3D%3D%3D%200%20%3F%20'No%20uncontrolled%20autoplay%20media'%20%3A%20uncontrolled.length%20%2B%20'%20media%20element(s)%20auto-playing%20without%20controls'%2C%20%7D)%3B%20var%20lang%20%3D%20document.documentElement.getAttribute('lang')%3B%20r.push(%7B%20id%3A%20'A-12'%2C%20pillar%3A%20'accessibility'%2C%20priority%3A%20'P1'%2C%20label%3A%20'%3Chtml%20lang%3E%20set%20(WCAG%203.1.1)'%2C%20status%3A%20lang%20%26%26%20lang.trim()%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20lang%20%3F%20'lang%3D%22'%20%2B%20lang%20%2B%20'%22'%20%3A%20'Missing%20lang%20%C3%A2%E2%82%AC%E2%80%9D%20screen%20readers%20cannot%20determine%20language'%2C%20%7D)%3B%20var%20allLinks%20%3D%20Array.from(document.querySelectorAll('a'))%3B%20var%20emptyAnchors%20%3D%20allLinks.filter(function(a)%20%7B%20var%20text%20%3D%20a.textContent.trim()%3B%20var%20label%20%3D%20a.getAttribute('aria-label')%20%7C%7C%20a.getAttribute('title')%20%7C%7C%20''%3B%20var%20imgWithAlt%20%3D%20a.querySelector('img%5Balt%5D%3Anot(%5Balt%3D%22%22%5D)')%3B%20return%20!text%20%26%26%20!label%20%26%26%20!imgWithAlt%3B%20%7D)%3B%20r.push(%7B%20id%3A%20'A-13'%2C%20pillar%3A%20'accessibility'%2C%20priority%3A%20'P1'%2C%20label%3A%20'No%20empty%20links%20(no%20text%20or%20aria-label)'%2C%20status%3A%20emptyAnchors.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20emptyAnchors.length%20%3D%3D%3D%200%20%3F%20'All%20links%20have%20accessible%20text'%20%3A%20emptyAnchors.length%20%2B%20'%20link(s)%20with%20no%20text%20and%20no%20aria-label'%2C%20items%3A%20emptyAnchors.slice(0%2C%205).map(function(a)%20%7B%20return%20%7B%20text%3A%20a.getAttribute('href')%2C%20element%3A%20getPath(a)%20%7D%3B%20%7D)%20%7D)%3B%20return%20r%3B%20%7D%20async%20function%20runPhase2()%20%7B%20var%20allLinks%20%3D%20Array.from(document.querySelectorAll('a%5Bhref%5D'))%3B%20var%20internalLinks%20%3D%20allLinks%20.map(function(a)%20%7B%20return%20%7B%20el%3A%20a%2C%20href%3A%20a.getAttribute('href')%20%7D%3B%20%7D)%20.filter(function(item)%20%7B%20var%20href%20%3D%20item.href%3B%20if%20(!href)%20return%20false%3B%20if%20(href.charAt(0)%20%3D%3D%3D%20'%23')%20return%20false%3B%20if%20(%2F%5E(mailto%7Ctel%7Cjavascript)%3A%2Fi.test(href))%20return%20false%3B%20if%20(href.indexOf('http')%20%3D%3D%3D%200%20%26%26%20href.indexOf(location.origin)%20!%3D%3D%200)%20return%20false%3B%20return%20true%3B%20%7D)%20.map(function(item)%20%7B%20return%20%7B%20el%3A%20item.el%2C%20href%3A%20item.href.charAt(0)%20%3D%3D%3D%20'%2F'%20%3F%20location.origin%20%2B%20item.href%20%3A%20item.href%2C%20original%3A%20item.href%20%7D%3B%20%7D)%3B%20var%20seenHrefs%20%3D%20%7B%7D%3B%20var%20uniqueLinks%20%3D%20internalLinks.filter(function(l)%20%7B%20if%20(seenHrefs%5Bl.href%5D)%20return%20false%3B%20seenHrefs%5Bl.href%5D%20%3D%20true%3B%20return%20true%3B%20%7D)%3B%20var%20ctaEls%20%3D%20getCTAs()%3B%20var%20ctaLinks%20%3D%20ctaEls%20.filter(function(el)%20%7B%20return%20el.tagName%20%3D%3D%3D%20'A'%20%26%26%20el.getAttribute('href')%3B%20%7D)%20.map(function(el)%20%7B%20return%20%7B%20el%3A%20el%2C%20href%3A%20el.getAttribute('href')%2C%20isCTA%3A%20true%20%7D%3B%20%7D)%20.filter(function(item)%20%7B%20var%20href%20%3D%20item.href%3B%20return%20href%20%26%26%20href%20!%3D%3D%20'%23'%20%26%26%20!%2F%5E(mailto%7Ctel%7Cjavascript)%3A%2Fi.test(href)%3B%20%7D)%3B%20var%20total%20%3D%20uniqueLinks.length%20%2B%20ctaLinks.length%3B%20updateLinkProgress(0%2C%20total)%3B%20var%20broken%20%3D%20%5B%5D%3B%20var%20ctaFailed%20%3D%20%5B%5D%3B%20var%20done%20%3D%200%3B%20async%20function%20checkUrl(href)%20%7B%20try%20%7B%20var%20controller%20%3D%20new%20AbortController()%3B%20var%20timeout%20%3D%20setTimeout(function()%20%7B%20controller.abort()%3B%20%7D%2C%20CONFIG.linkTimeout)%3B%20var%20res%20%3D%20await%20fetch(href%2C%20%7B%20method%3A%20'HEAD'%2C%20credentials%3A%20'include'%2C%20signal%3A%20controller.signal%2C%20redirect%3A%20'follow'%20%7D)%3B%20clearTimeout(timeout)%3B%20return%20%7B%20href%3A%20href%2C%20status%3A%20res.status%2C%20ok%3A%20res.ok%20%7D%3B%20%7D%20catch%20(e)%20%7B%20return%20%7B%20href%3A%20href%2C%20status%3A%20e.name%20%3D%3D%3D%20'AbortError'%20%3F%20'timeout'%20%3A%20'error'%2C%20ok%3A%20false%20%7D%3B%20%7D%20%7D%20async%20function%20processBatch(items%2C%20isCTA)%20%7B%20for%20(var%20i%20%3D%200%3B%20i%20%3C%20items.length%3B%20i%20%2B%3D%20CONFIG.linkBatchSize)%20%7B%20var%20batch%20%3D%20items.slice(i%2C%20i%20%2B%20CONFIG.linkBatchSize)%3B%20var%20batchResults%20%3D%20await%20Promise.all(batch.map(function(item)%20%7B%20var%20url%20%3D%20item.href%3B%20if%20(url.charAt(0)%20%3D%3D%3D%20'%2F')%20url%20%3D%20location.origin%20%2B%20url%3B%20return%20checkUrl(url)%3B%20%7D))%3B%20batchResults.forEach(function(result%2C%20idx)%20%7B%20done%2B%2B%3B%20updateLinkProgress(done%2C%20total)%3B%20if%20(!result.ok)%20%7B%20var%20entry%20%3D%20%7B%20href%3A%20result.href%2C%20original%3A%20batch%5Bidx%5D.original%20%7C%7C%20result.href%2C%20httpStatus%3A%20result.status%2C%20element%3A%20getPath(batch%5Bidx%5D.el)%2C%20linkText%3A%20batch%5Bidx%5D.el%20%3F%20batch%5Bidx%5D.el.textContent.trim().substring(0%2C%2040)%20%7C%7C%20'%5Bno%20text%5D'%20%3A%20'%5Bno%20text%5D'%20%7D%3B%20if%20(isCTA)%20ctaFailed.push(entry)%3B%20else%20broken.push(entry)%3B%20%7D%20%7D)%3B%20%7D%20%7D%20if%20(total%20%3E%200)%20%7B%20await%20processBatch(uniqueLinks%2C%20false)%3B%20await%20processBatch(ctaLinks%2C%20true)%3B%20%7D%20else%20%7B%20updateLinkProgress(0%2C%200)%3B%20%7D%20results.content.push(%7B%20id%3A%20'C-08'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P1'%2C%20label%3A%20'Internal%20links%20resolve%20(not%20404)'%2C%20status%3A%20broken.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20broken.length%20%3D%3D%3D%200%20%3F%20'All%20'%20%2B%20uniqueLinks.length%20%2B%20'%20internal%20links%20resolve%20correctly'%20%3A%20broken.length%20%2B%20'%20broken%20link(s)%20found'%2C%20items%3A%20broken%20%7D)%3B%20results.content.push(%7B%20id%3A%20'C-14'%2C%20pillar%3A%20'content'%2C%20priority%3A%20'P1'%2C%20label%3A%20'CTA%20destinations%20resolve'%2C%20status%3A%20ctaFailed.length%20%3D%3D%3D%200%20%3F%20'pass'%20%3A%20'fail'%2C%20detail%3A%20ctaFailed.length%20%3D%3D%3D%200%20%3F%20'All%20'%20%2B%20ctaLinks.length%20%2B%20'%20CTA%20links%20resolve'%20%3A%20ctaFailed.length%20%2B%20'%20CTA(s)%20pointing%20to%20dead%20URLs'%2C%20items%3A%20ctaFailed%20%7D)%3B%20finalizeScores()%3B%20updateToast('%C3%B0%C5%B8%E2%80%9C%C2%A1%20Sending%20report%20to%20dashboard%C3%A2%E2%82%AC%C2%A6'%2C%2090)%3B%20sendToServer()%3B%20%7D%20var%20PRIORITY_WEIGHTS%20%3D%20%7B%20P1%3A%204%2C%20P2%3A%202%2C%20P3%3A%201%2C%20P4%3A%200%20%7D%3B%20var%20RESULT_SCORES%20%3D%20%7B%20pass%3A%201.0%2C%20warn%3A%200.5%2C%20fail%3A%200.0%2C%20info%3A%20null%20%7D%3B%20function%20calcPillarScore(checks)%20%7B%20var%20earned%20%3D%200%3B%20var%20possible%20%3D%200%3B%20checks.forEach(function(c)%20%7B%20var%20weight%20%3D%20PRIORITY_WEIGHTS%5Bc.priority%5D%20%7C%7C%200%3B%20if%20(weight%20%3D%3D%3D%200)%20return%3B%20var%20factor%20%3D%20RESULT_SCORES%5Bc.status%5D%3B%20if%20(factor%20%3D%3D%3D%20null%20%7C%7C%20factor%20%3D%3D%3D%20undefined)%20return%3B%20earned%20%2B%3D%20weight%20*%20factor%3B%20possible%20%2B%3D%20weight%3B%20%7D)%3B%20return%20possible%20%3D%3D%3D%200%20%3F%20100%20%3A%20Math.round((earned%20%2F%20possible)%20*%20100)%3B%20%7D%20function%20calcOverallScore(pillarScores)%20%7B%20var%20w%20%3D%20CONFIG.weights%3B%20return%20Math.round(%20pillarScores.metadata%20*%20w.metadata%20%2B%20pillarScores.content%20*%20w.content%20%2B%20pillarScores.responsive%20*%20w.responsive%20%2B%20pillarScores.accessibility%20*%20w.accessibility%20)%3B%20%7D%20function%20getGoNoGo(overall%2C%20allChecks)%20%7B%20var%20p1Failures%20%3D%20allChecks.filter(function(c)%20%7B%20return%20c.priority%20%3D%3D%3D%20'P1'%20%26%26%20c.status%20%3D%3D%3D%20'fail'%3B%20%7D)%3B%20if%20(p1Failures.length%20%3E%200)%20return%20%7B%20status%3A%20'BLOCK'%2C%20reason%3A%20p1Failures.length%20%2B%20'%20P1%20failure(s)%20detected'%20%7D%3B%20if%20(overall%20%3E%3D%2090)%20return%20%7B%20status%3A%20'PASS'%2C%20reason%3A%20'Ready%20for%20promotion'%20%7D%3B%20if%20(overall%20%3E%3D%2080)%20return%20%7B%20status%3A%20'PASS_WITH_WARNINGS'%2C%20reason%3A%20'Promote%20%C3%A2%E2%82%AC%E2%80%9D%20fix%20warnings%20next%20sprint'%20%7D%3B%20if%20(overall%20%3E%3D%2070)%20return%20%7B%20status%3A%20'CONDITIONAL'%2C%20reason%3A%20'Fix%20P1%2BP2%20failures%20before%20promoting'%20%7D%3B%20return%20%7B%20status%3A%20'FAIL'%2C%20reason%3A%20'Score%20below%20threshold'%20%7D%3B%20%7D%20function%20finalizeScores()%20%7B%20var%20allChecks%20%3D%20%5B%5D.concat(results.metadata%2C%20results.content%2C%20results.responsive%2C%20results.accessibility)%3B%20overallScores.metadata%20%3D%20calcPillarScore(results.metadata)%3B%20overallScores.content%20%3D%20calcPillarScore(results.content)%3B%20overallScores.responsive%20%3D%20calcPillarScore(results.responsive)%3B%20overallScores.accessibility%20%3D%20calcPillarScore(results.accessibility)%3B%20overallScores.overall%20%3D%20calcOverallScore(overallScores)%3B%20overallScores.goNoGo%20%3D%20getGoNoGo(overallScores.overall%2C%20allChecks)%3B%20%7D%20async%20function%20sendToServer()%20%7B%20var%20data%20%3D%20buildReportPayload()%3B%20try%20%7B%20var%20res%20%3D%20await%20fetch(CONFIG.reportServer%2C%20%7B%20method%3A%20'POST'%2C%20headers%3A%20%7B%20'Content-Type'%3A%20'application%2Fjson'%20%7D%2C%20body%3A%20JSON.stringify(data)%20%7D)%3B%20var%20json%20%3D%20await%20res.json()%3B%20if%20(json.ok)%20%7B%20var%20score%20%3D%20data.meta.overallScore%3B%20var%20status%20%3D%20data.meta.goNoGo%3B%20updateToast('%C3%A2%C5%93%E2%80%A6%20'%20%2B%20score%20%2B%20'%2F100%20%C3%A2%E2%82%AC%E2%80%9D%20'%20%2B%20status%20%2B%20'%20%C3%A2%E2%82%AC%E2%80%9D%20synced%20to%20dashboard!'%2C%20100%2C%20false%2C%20true)%3B%20%7D%20else%20%7B%20updateToast('%C3%A2%C2%9D%C5%92%20Server%20error%3A%20'%20%2B%20(json.error%20%7C%7C%20'unknown')%2C%20100%2C%20true%2C%20true)%3B%20%7D%20%7D%20catch%20(e)%20%7B%20updateToast('%C3%A2%C2%9D%C5%92%20Could%20not%20reach%20dashboard%20server'%2C%20100%2C%20true%2C%20true)%3B%20%7D%20%7D%20function%20buildReportPayload()%20%7B%20var%20allChecks%20%3D%20%5B%5D.concat(results.metadata%2C%20results.content%2C%20results.responsive%2C%20results.accessibility)%3B%20var%20defects%20%3D%20allChecks.filter(function(c)%20%7B%20return%20c.status%20%3D%3D%3D%20'fail'%20%7C%7C%20c.status%20%3D%3D%3D%20'warn'%3B%20%7D)%3B%20return%20%7B%20meta%3A%20%7B%20url%3A%20location.href%2C%20pageTitle%3A%20document.title%2C%20auditedAt%3A%20new%20Date().toISOString()%2C%20toolVersion%3A%20CONFIG.version%2C%20viewport%3A%20window.innerWidth%2C%20overallScore%3A%20overallScores.overall%2C%20threshold%3A%20CONFIG.thresholdScore%2C%20status%3A%20overallScores.goNoGo.status%2C%20goNoGo%3A%20overallScores.goNoGo.status%2C%20p1FailCount%3A%20allChecks.filter(function(c)%20%7B%20return%20c.priority%20%3D%3D%3D%20'P1'%20%26%26%20c.status%20%3D%3D%3D%20'fail'%3B%20%7D).length%20%7D%2C%20scores%3A%20%7B%20metadata%3A%20%7B%20score%3A%20overallScores.metadata%2C%20weight%3A%20CONFIG.weights.metadata%20%7D%2C%20content%3A%20%7B%20score%3A%20overallScores.content%2C%20weight%3A%20CONFIG.weights.content%20%7D%2C%20responsive%3A%20%7B%20score%3A%20overallScores.responsive%2C%20weight%3A%20CONFIG.weights.responsive%20%7D%2C%20accessibility%3A%20%7B%20score%3A%20overallScores.accessibility%2C%20weight%3A%20CONFIG.weights.accessibility%20%7D%20%7D%2C%20checks%3A%20allChecks%2C%20defects%3A%20defects%2C%20info%3A%20%7B%20totalChecks%3A%20allChecks.length%2C%20passed%3A%20allChecks.filter(function(c)%20%7B%20return%20c.status%20%3D%3D%3D%20'pass'%3B%20%7D).length%2C%20warned%3A%20allChecks.filter(function(c)%20%7B%20return%20c.status%20%3D%3D%3D%20'warn'%3B%20%7D).length%2C%20failed%3A%20allChecks.filter(function(c)%20%7B%20return%20c.status%20%3D%3D%3D%20'fail'%3B%20%7D).length%20%7D%20%7D%3B%20%7D%20%7D)()%3B";

  document.addEventListener('DOMContentLoaded', function () {
    initApp();
  });

  function initApp() {
    var dragLink = document.getElementById('drag-bookmarklet-link');
    if (dragLink) {
      dragLink.setAttribute('href', CLOUD_BOOKMARKLET_JS);
    }

    var copyBtn = document.getElementById('copy-bookmark-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(CLOUD_BOOKMARKLET_JS).then(function () {
          alert('âœ… CSP-Proof Bookmarklet code copied to clipboard!\n\nTo install:\n1. Right-click your browser Bookmarks Bar -> "Add Page..."\n2. Name: AEM QA Auditor\n3. Paste this copied code into the URL field.');
        });
      });
    }

    var launchBtn = document.getElementById('launch-audit-btn');
    var targetInput = document.getElementById('target-url-input');

    if (launchBtn && targetInput) {
      launchBtn.addEventListener('click', function () {
        var rawUrl = targetInput.value.trim();
        if (!rawUrl) {
          showLaunchBanner('error', 'âš ï¸ Please paste a target URL first.');
          return;
        }

        var formattedUrl = rawUrl;
        if (!/^https?:\/\//i.test(formattedUrl)) {
          formattedUrl = 'https://' + formattedUrl;
        }

        // Open the target page
        window.open(formattedUrl, '_blank');

        // Copy bookmarklet to clipboard silently (best-effort)
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(CLOUD_BOOKMARKLET_JS).catch(function () {});
        }

        // Show in-page guidance banner
        showLaunchBanner('waiting',
          'â³ Target page opened in a new tab. ' +
          'Click your <strong>âš¡ AEM QA Auditor</strong> bookmarklet on that page â€” ' +
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

  // â”€â”€â”€ Launch Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      'style="background:none;border:none;color:inherit;cursor:pointer;font-size:16px;opacity:0.6;padding:0">âœ•</button>';
    banner.style.display = 'flex';
  }

  // â”€â”€â”€ Auto-Poll loop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
              showLaunchBanner('success', 'âœ… New audit report received! Live-updated dashboard.');
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
      var scoreClass = item.score >= 80 ? (item.score >= 90 ? 'p' : 'w') : 'f';
      var timeStr = item.auditedAt ? new Date(item.auditedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

      return [
        '<div class="report-item" data-id="' + item.id + '">',
        '  <div class="item-top">',
        '    <span class="item-url" title="' + item.url + '">' + item.url + '</span>',
        '    <span class="item-score ' + scoreClass + '">' + item.score + '</span>',
        '  </div>',
        '  <div class="item-meta">',
        '    <span class="status-chip ' + item.status + '">' + (item.status || 'UNKNOWN').replace(/_/g, ' ') + '</span>',
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
      '      <div class="detail-timestamp">Audited: ' + meta.auditedAt + ' â€¢ Tool v' + (meta.toolVersion || '1.0.0') + '</div>',
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
        var icon = c.status === 'pass' ? 'âœ…' : (c.status === 'warn' ? 'âš ï¸' : (c.status === 'fail' ? 'âŒ' : 'â„¹ï¸'));
        var itemsHtml = '';
        if (c.items && c.items.length > 0) {
          itemsHtml = '<div class="items-box">' + c.items.map(function (it) {
            var text = typeof it === 'string' ? it : (it.text || it.detail || JSON.stringify(it));
            return '<div class="item-line">â€¢ ' + text + '</div>';
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
