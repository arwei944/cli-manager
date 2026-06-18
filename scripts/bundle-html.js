import fs from 'node:fs';
import path from 'node:path';

// HTML 文件路径（相对于项目根目录）
const htmlPath = path.resolve(process.cwd(), 'src/commands/web.html');
const outputPath = path.resolve(process.cwd(), 'src/commands/web.assets.ts');

// 读取 HTML 内容
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// 对 HTML 内容进行转义：将反斜杠、反引号、美元符号转义为安全的模板字符串字面量
function escapeForTemplateString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

const escapedHtml = escapeForTemplateString(htmlContent);

const output = `// 此文件由 scripts/bundle-html.js 自动生成，请勿手动编辑
// 生成时间：${new Date().toISOString()}

export const INDEX_HTML = \`${escapedHtml}\`;
`;

fs.writeFileSync(outputPath, output, 'utf-8');
console.log(`✅ web.assets.ts 已生成: ${outputPath}`);
console.log(`   源文件: ${htmlPath}`);
console.log(`   输出大小: ${Buffer.byteLength(htmlContent, 'utf-8')} bytes`);
