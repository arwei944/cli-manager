import fs from 'node:fs';
import os from 'node:os';
import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { HistoryRepo } from '../db/history-repo';
import { colors } from '../ui';

const toolRepo = new ToolRepo();
const historyRepo = new HistoryRepo();

export function reportCommand(options: { json?: boolean; save?: string }) {
  initDatabase();

  const tools = toolRepo.findAll();
  const bySource = toolRepo.countBySource();
  const byCategory = toolRepo.countByCategory();
  const lastScan = historyRepo.getLastScan();

  const report = {
    generatedAt: new Date().toISOString(),
    os: {
      platform: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
      arch: os.arch(),
    },
    shell: process.env.SHELL || process.env.ComSpec || 'unknown',
    pathCount: (process.env.PATH || '').split(/[;:]/).filter(Boolean).length,
    tools: {
      total: tools.length,
      bySource,
      byCategory,
      pinned: tools.filter(t => t.isPinned).length,
      noVersion: tools.filter(t => !t.version).length,
      size: tools.reduce((acc, t) => acc + t.fileSize, 0),
    },
    lastScan: lastScan ? {
      time: lastScan.startedAt,
      totalFound: lastScan.totalFound,
    } : null,
  };

  if (options.json || options.save) {
    const output = JSON.stringify(report, null, 2);
    if (options.save) {
      fs.writeFileSync(options.save, output, 'utf-8');
      console.log(colors.success(`报告已保存: ${options.save}`));
    } else {
      console.log(output);
    }
    return;
  }

  // 文本格式输出
  console.log(`\n${colors.bold('环境报告')}`);
  console.log(`${'─'.repeat(50)}`);

  console.log(`\n${colors.info('系统信息')}`);
  console.log(`  平台: ${report.os.platform} ${report.os.arch}`);
  console.log(`  版本: ${report.os.release}`);
  console.log(`  主机: ${report.os.hostname}`);
  console.log(`  Shell: ${report.os.hostname}`);
  console.log(`  PATH 目录数: ${report.pathCount}`);

  console.log(`\n${colors.info('工具概览')}`);
  console.log(`  总数: ${report.tools.total}`);
  console.log(`  锁定: ${report.tools.pinned}`);
  console.log(`  版本未知: ${report.tools.noVersion}`);
  console.log(`  总大小: ${formatSize(report.tools.size)}`);

  if (report.lastScan) {
    console.log(`  上次扫描: ${new Date(report.lastScan.time).toLocaleString()} (${report.lastScan.totalFound} 个工具)`);
  }

  console.log(`\n${colors.dim('使用 --json 获取完整 JSON 输出，--save <path> 保存到文件')}`);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
