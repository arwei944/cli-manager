import { launchBlessedUI, isBlessedSupported } from '../ui/blessed-ui';
import { ToolRepo } from '../db/tool-repo';
import { HistoryRepo } from '../db/history-repo';

export function dashboardCommand() {
  if (!isBlessedSupported()) {
    runFallback();
    process.exit(0);
  }

  launchBlessedUI();
}

function runFallback(): void {
  const toolRepo = new ToolRepo();
  const historyRepo = new HistoryRepo();

  const tools = toolRepo.findAll();
  const bySource: Record<string, number> = toolRepo.countBySource();
  const byCategory: Record<string, number> = toolRepo.countByCategory();
  const lastScan = historyRepo.getLastScan();
  const pinned = tools.filter(t => t.isPinned).length;
  const noVersion = tools.filter(t => !t.version).length;

  console.log('CLI 工具管理器 - 仪表盘（降级模式，TUI 不可用）\n');

  console.log(`工具总数: ${tools.length} | 锁定: ${pinned} | 未知版本: ${noVersion}`);

  console.log('\n来源分布:');
  for (const [src, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src.padEnd(10)} ${'█'.repeat(Math.max(1, count))}${'░'.repeat(20 - Math.max(1, count))} ${count}`);
  }

  console.log('\n分类分布:');
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(10)} ${'█'.repeat(Math.max(1, count))}${'░'.repeat(20 - Math.max(1, count))} ${count}`);
  }

  if (lastScan) {
    console.log(`\n最近扫描: ${new Date(lastScan.startedAt).toLocaleString()}，发现 ${lastScan.totalFound} 个工具`);
  }

  console.log('\n提示：可使用 scan 命令执行扫描，使用 list 命令查看工具详情。');
}
