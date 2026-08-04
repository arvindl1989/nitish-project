// build-cloud-bookmarklet.js
// Run: node build-cloud-bookmarklet.js

var fs   = require('fs');
var path = require('path');

var srcPath = path.join(__dirname, 'bookmarklet.js');
var publicDstPath = path.join(__dirname, '..', 'public', 'bookmarklet.js');
var src = fs.readFileSync(srcPath, 'utf8');

// 1. Copy bookmarklet.js to public/ directory for Vercel static serving
fs.writeFileSync(publicDstPath, src);
console.log('✅ Copied bookmarklet.js -> public/bookmarklet.js');

// 2. Generate Local Bookmarklet text
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

var localBookmarkletUrl = 'javascript:' + encodeURIComponent(minified);
fs.writeFileSync(path.join(__dirname, 'AEM_QA_BOOKMARK_LOCAL.txt'), localBookmarkletUrl);

// 3. Generate Cloud Loader Bookmarklet text (Template)
var cloudLoaderSnippet = "javascript:(function(){var s=document.createElement('script');s.src='https://YOUR-VERCEL-APP.vercel.app/bookmarklet.js?v='+Date.now();document.head.appendChild(s);})();";
fs.writeFileSync(path.join(__dirname, 'AEM_QA_BOOKMARK_CLOUD.txt'), cloudLoaderSnippet);

console.log('✅ Local Bookmarklet -> AEM_QA_BOOKMARK_LOCAL.txt');
console.log('✅ Cloud Bookmarklet Loader Template -> AEM_QA_BOOKMARK_CLOUD.txt');
console.log('\nReady for Vercel Deployment!');
