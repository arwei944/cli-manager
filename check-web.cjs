const fs = require('fs');
const content = fs.readFileSync('src/commands/web.ts', 'utf-8');
const start = content.indexOf('function getIndexHtml');
const snippet = content.slice(start);
const bt = snippet.match(/`/g);
console.log('Backtick count from getIndexHtml:', bt ? bt.length : 0);
console.log('Even?', bt ? bt.length % 2 === 0 : true);
