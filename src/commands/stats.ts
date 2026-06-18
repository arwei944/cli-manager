import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { colors } from '../ui';

const toolRepo = new ToolRepo();

export function statsCommand(options: { category?: string }) {
  initDatabase();

  const tools = toolRepo.findAll();
  const filtered = options.category ? tools.filter(t => t.category === options.category) : tools;

  console.log(`\n${colors.bold('使用统计')}`);
  console.log(`${'─'.repeat(40)}`);

  // 总数
  console.log(`\n${colors.info('工具总数')}: ${filtered.length}`);

  // 来源分布
  const bySource = toolRepo.countBySource();
  console.log(`\n${colors.bold('来源分布')}`);
  for (const [src, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / tools.length) * 100).toFixed(1);
    console.log(`  ${colors.source(src).padEnd(12)} ${String(count).padStart(5)}  (${pct}%)`);
  }

  // 分类分布
  const byCategory = toolRepo.countByCategory();
  console.log(`\n${colors.bold('分类分布')}`);
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / tools.length) * 100).toFixed(1);
    console.log(`  ${colors.category(cat).padEnd(12)} ${String(count).padStart(5)}  (${pct}%)`);
  }

  // 磁盘占用
  const totalSize = filtered.reduce((acc, t) => acc + t.fileSize, 0);
  const sizeByCat = new Map<string, number>();
  for (const t of filtered) {
    sizeByCat.set(t.category, (sizeByCat.get(t.category) || 0) + t.fileSize);
  }

  console.log(`\n${colors.bold('磁盘占用')}`);
  console.log(`  总计: ${formatSize(totalSize)}`);
  for (const [cat, size] of Array.from(sizeByCat.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${colors.category(cat).padEnd(12)} ${formatSize(size)}`);
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
