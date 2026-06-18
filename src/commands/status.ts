import { initDatabase, getDbPath } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { HistoryRepo } from '../db/history-repo';
import { colors } from '../ui';
import fs from 'node:fs';

const toolRepo = new ToolRepo();
const historyRepo = new HistoryRepo();

export function statusCommand() {
  initDatabase();

  const tools = toolRepo.findAll();
  const bySource = toolRepo.countBySource();
  const byCategory = toolRepo.countByCategory();
  const lastScan = historyRepo.getLastScan();

  console.log(`\n${colors.bold('CLI 工具管理器 - 概览')}`);
  console.log(`${'─'.repeat(40)}`);

  console.log(`\n${colors.info('工具总数')}: ${tools.length}`);

  console.log(`\n${colors.bold('按来源分布')}`);
  for (const [src, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    const bar = '█'.repeat(Math.round(count / tools.length * 30));
    console.log(`  ${colors.source(src).padEnd(10)} ${String(count).padStart(4)} ${bar}`);
  }

  console.log(`\n${colors.bold('按分类分布')}`);
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    const bar = '█'.repeat(Math.round(count / tools.length * 30));
    console.log(`  ${colors.category(cat).padEnd(10)} ${String(count).padStart(4)} ${bar}`);
  }

  const pinned = tools.filter(t => t.isPinned);
  const noVersion = tools.filter(t => !t.version);

  console.log(`\n${colors.bold('其他信息')}`);
  console.log(`  锁定版本: ${pinned.length}`);
  console.log(`  版本未知: ${noVersion.length}`);
  console.log(`  数据库大小: ${formatDbSize()}`);

  if (lastScan) {
    console.log(`  上次扫描: ${new Date(lastScan.startedAt).toLocaleString()} (${lastScan.totalFound} 个工具)`);
  }
}

function formatDbSize(): string {
  try {
    const stat = fs.statSync(getDbPath());
    const kb = stat.size / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
  } catch {
    return '未知';
  }
}
