// build-standalone.js
var fs = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, 'bookmarklet.js'), 'utf8');

// Replace local reportServer with live Vercel endpoint
src = src.replace("http://localhost:3500/report", "https://qa-mu-gules.vercel.app/api/report");

var minified = src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\n{2,}/g, '\n')
  .split('\n').map(function(l) { return l.trim(); }).join(' ')
  .replace(/\s{2,}/g, ' ')
  .trim();

if (minified.indexOf('(function') !== 0) {
  minified = '(function(){' + minified + '})()';
}

var standaloneBookmarkletUrl = 'javascript:' + encodeURIComponent(minified);

fs.writeFileSync(path.join(__dirname, 'AEM_QA_BOOKMARK_STANDALONE.txt'), standaloneBookmarkletUrl);
console.log('✅ Generated Standalone Bookmarklet -> AEM_QA_BOOKMARK_STANDALONE.txt');
