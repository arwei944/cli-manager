import fs from 'node:fs';
import path from 'node:path';

// macOS 专用版本：修复 bundle-html 在 macOS 环境下的路径处理
// 使用与主脚本相同的逻辑，确保跨平台一致性
const htmlPath = path.resolve(process.cwd(), 'src/commands/web.html');
const outputPath = path.resolve(process.cwd(), 'src/commands/web.assets.ts');

const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

function escapeForTemplateString(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

const escapedHtml = escapeForTemplateString(htmlContent);

const output = `// 此文件由 scripts/bundle-html-darwin.js 自动生成，请勿手动编辑
// 生成时间：${new Date().toISOString()}

export const INDEX_HTML = \`${escapedHtml}\`;
`;

fs.writeFileSync(outputPath, output, 'utf-8');
console.log(`✅ [darwin] web.assets.ts 已生成: ${outputPath}`);
console.log(`   源文件: ${htmlPath}`);
console.log(`   输出大小: ${Buffer.byteLength(htmlContent, 'utf-8')} bytes`);
