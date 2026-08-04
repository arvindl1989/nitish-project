// build-bookmarklet.js
// Run: node build-bookmarklet.js
// Output: AEM_QA_BOOKMARK.txt

var fs   = require('fs');
var path = require('path');

var src = fs.readFileSync(path.join(__dirname, 'bookmarklet.js'), 'utf8');

// Simple minification (zero npm dependencies)
var minified = src
  .replace(/\/\*[\s\S]*?\*\//g, '')         // block comments
  .replace(/^\s*\/\/.*$/gm, '')             // line comments
  .replace(/\n{2,}/g, '\n')                 // collapse newlines
  .split('\n').map(function(l) { return l.trim(); }).join(' ')
  .replace(/\s{2,}/g, ' ')
  .trim();

if (minified.indexOf('(function') !== 0) {
  minified = '(function(){' + minified + '})()';
}

var bookmarkletUrl = 'javascript:' + encodeURIComponent(minified);

var outputPath = path.join(__dirname, 'AEM_QA_BOOKMARK.txt');
fs.writeFileSync(outputPath, bookmarkletUrl);

console.log('✅ Bookmarklet generated -> ' + outputPath);
console.log('Size: ' + (bookmarkletUrl.length / 1024).toFixed(2) + ' KB');
console.log('');
console.log('NEXT STEPS:');
console.log('  1. Copy full content of AEM_QA_BOOKMARK.txt');
console.log('  2. Browser -> Bookmarks -> Add new bookmark');
console.log('     Name: AEM QA');
console.log('     URL:  [paste]');
console.log('  3. Click bookmark on any open AEM Author preview or public page');
