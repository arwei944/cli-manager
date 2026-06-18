import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { HistoryRepo } from '../db/history-repo';
import { colors } from '../ui/colors';
import * as readline from 'node:readline';

const toolRepo = new ToolRepo();
const historyRepo = new HistoryRepo();

export function dashboardCommand() {
  initDatabase();

  // 监听键盘输入
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  renderDashboard();

  process.stdin.on('keypress', (_str: string, key: readline.Key) => {
    if (key.ctrl && key.name === 'c') {
      exitDashboard();
    } else if (key.name === 'q') {
      exitDashboard();
    } else if (key.name === 'r') {
      renderDashboard();
    } else if (key.name === 'h' || key.name === '?') {
      showHelp();
    }
  });
}

function renderDashboard() {
  console.clear();

  const tools = toolRepo.findAll();
  const bySource = toolRepo.countBySource();
  const byCategory = toolRepo.countByCategory();
  const lastScan = historyRepo.getLastScan();
  const pinned = tools.filter(t => t.isPinned).length;
  const noVersion = tools.filter(t => !t.version).length;
  const totalSize = tools.reduce((acc, t) => acc + t.fileSize, 0);

  console.log(colors.bold('\n╔══════════════════════════════════════════════════════════╗'));
  console.log(colors.bold('║         🔧 CLI 工具管理器 - TUI 仪表盘                   ║'));
  console.log(colors.bold('╚══════════════════════════════════════════════════════════╝\n'));

  // 核心指标
  console.log(colors.bold('📊 核心指标'));
  console.log(`  工具总数: ${colors.info(String(tools.length))}  |  锁定: ${colors.warning(String(pinned))}  |  版本未知: ${colors.error(String(noVersion))}  |  磁盘: ${formatSize(totalSize)}`);

  // 来源分布
  console.log(colors.bold('\n📈 来源分布'));
  const maxSourceCount = Math.max(...Object.values(bySource), 1);
  for (const [src, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    const barLen = Math.round((count / maxSourceCount) * 30);
    const bar = '█'.repeat(barLen) + '░'.repeat(30 - barLen);
    console.log(`  ${colors.source(src).padEnd(10)} ${bar} ${String(count).padStart(5)}`);
  }

  // 分类分布
  console.log(colors.bold('\n📂 分类分布'));
  const maxCatCount = Math.max(...Object.values(byCategory), 1);
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    const barLen = Math.round((count / maxCatCount) * 30);
    const bar = '█'.repeat(barLen) + '░'.repeat(30 - barLen);
    console.log(`  ${colors.category(cat).padEnd(10)} ${bar} ${String(count).padStart(5)}`);
  }

  // 最近扫描
  console.log(colors.bold('\n🕐 最近扫描'));
  if (lastScan) {
    console.log(`  时间: ${new Date(lastScan.startedAt).toLocaleString()}`);
    console.log(`  工具数: ${lastScan.totalFound}`);
  } else {
    console.log(colors.dim('  暂无扫描记录'));
  }

  // 提示信息
  console.log(colors.bold('\n⌨️  快捷键'));
  console.log(colors.dim('  r - 刷新  |  q/Ctrl+C - 退出  |  h - 帮助'));
}

function showHelp() {
  console.log(colors.bold('\n📖 帮助'));
  console.log('  r       - 刷新仪表盘');
  console.log('  q       - 退出');
  console.log('  Ctrl+C  - 强制退出');
  console.log('  h / ?   - 显示此帮助');
}

function exitDashboard() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.removeAllListeners('keypress');
  console.log(colors.dim('\n再见!'));
  process.exit(0);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
