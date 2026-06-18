import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { HistoryRepo } from '../db/history-repo';
import { colors } from '../ui';

const toolRepo = new ToolRepo();

export function versionCommand(name: string) {
  initDatabase();

  const tools = toolRepo.findByName(name);
  if (tools.length === 0) {
    console.log(colors.error(`未找到工具: ${name}`));
    return;
  }

  const tool = tools[0];
  console.log(`\n${colors.bold(tool.name)} 版本信息`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`  当前版本: ${tool.version || colors.dim('未知')}`);
  console.log(`  来源: ${colors.source(tool.source)}`);
  console.log(`  锁定状态: ${tool.isPinned ? `${colors.warning('已锁定')} (${tool.pinnedVersion})` : colors.dim('未锁定')}`);
}

export function pinCommand(name: string, version?: string) {
  initDatabase();

  const tools = toolRepo.findByName(name);
  if (tools.length === 0) {
    console.log(colors.error(`未找到工具: ${name}`));
    return;
  }

  const pinVersion = version || tools[0].version;
  if (!pinVersion) {
    console.log(colors.error('无法确定锁定版本，请指定版本号'));
    return;
  }

  toolRepo.updatePinStatus(name, true, pinVersion);
  console.log(colors.success(`${name} 已锁定在版本 ${pinVersion}`));
}

export function unpinCommand(name: string) {
  initDatabase();

  const tools = toolRepo.findByName(name);
  if (tools.length === 0) {
    console.log(colors.error(`未找到工具: ${name}`));
    return;
  }

  toolRepo.updatePinStatus(name, false);
  console.log(colors.success(`${name} 已解除锁定`));
}

export function historyCommand(name: string) {
  initDatabase();

  const historyRepo = new HistoryRepo();
  const records = historyRepo.getVersionHistory(name);

  if (records.length === 0) {
    console.log(colors.dim(`${name} 暂无版本变更记录`));
    return;
  }

  console.log(`\n${colors.bold(`${name} 版本变更历史`)}`);
  for (const record of records) {
    const arrow = record.previousVersion && record.newVersion
      ? `${record.previousVersion} → ${record.newVersion}`
      : record.newVersion || record.previousVersion || '-';
    console.log(`  [${new Date(record.operatedAt).toLocaleString()}] ${record.operation}: ${arrow}`);
  }
}
