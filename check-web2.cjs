const fs = require('fs');
const content = fs.readFileSync('src/commands/web.ts', 'utf-8');
const funcStart = content.indexOf('function getIndexHtml()');
const funcEnd = content.indexOf('\nexport function webCommand');
const snippet = content.slice(funcStart, funcEnd);
const bt = snippet.match(/`/g);
console.log('Backtick pairs in getIndexHtml:', bt ? bt.length : 0);
console.log('Even?', bt ? bt.length % 2 === 0 : true);

// 检查 ${ 和 } 是否匹配
const dollarOpen = (snippet.match(/\$\{/g) || []).length;
const braceClose = (snippet.match(/\}/g) || []).length;
console.log('${ count:', dollarOpen);
console.log('} count:', braceClose);
