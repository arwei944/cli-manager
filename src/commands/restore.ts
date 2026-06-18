import fs from 'node:fs';
import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { initInstallers } from './install';
import { registry } from '../installer';
import { createSpinner } from '../ui/spinner';
import { colors, createTable } from '../ui';
import type { ToolSource, InstallSource } from '../types';

const toolRepo = new ToolRepo();

const sourceMap: Record<string, InstallSource> = {
  npm: 'npm',
  pip: 'pip',
  gh: 'gh',
  scoop: 'scoop',
  winget: 'winget',
  choco: 'choco',
};

interface BackupEntry {
  name: string;
  version: string | null;
  source: ToolSource;
  category: string;
  isPinned: boolean;
  pinnedVersion: string | null;
}

interface BackupFile {
  exportedAt: string;
  version: string;
  tools: BackupEntry[];
}

export async function restoreCommand(file: string, options: { dryRun?: boolean }) {
  initDatabase();
  initInstallers();

  if (!fs.existsSync(file)) {
    console.log(colors.error(`备份文件不存在: ${file}`));
    return;
  }

  const readSpinner = createSpinner('读取备份文件...');
  let backup: BackupFile;
  try {
    backup = JSON.parse(fs.readFileSync(file, 'utf-8'));
    readSpinner.succeed(`已读取备份: ${backup.tools.length} 个工具 (${new Date(backup.exportedAt).toLocaleString()})`);
  } catch (error) {
    readSpinner.fail(`备份文件解析失败: ${error}`);
    return;
  }

  // 对比当前已安装工具
  const currentTools = toolRepo.findAll();
  const currentNames = new Set(currentTools.map(t => t.name));

  const missing = backup.tools.filter(t => !currentNames.has(t.name));
  const versionMismatch = backup.tools.filter(t => {
    const current = currentTools.find(c => c.name === t.name);
    return current && t.version && current.version && t.version !== current.version;
  });

  console.log(`\n${colors.bold('恢复计划')}`);
  console.log(`  备份工具数: ${backup.tools.length}`);
  console.log(`  当前工具数: ${currentTools.length}`);
  console.log(`  ${colors.warning(`缺失工具: ${missing.length}`)}`);
  console.log(`  ${colors.warning(`版本不一致: ${versionMismatch.length}`)}`);

  if (missing.length > 0) {
    console.log(`\n${colors.bold('缺失工具列表')}`);
    const rows = missing.slice(0, 20).map(t => [
      t.name,
      t.version || '-',
      colors.source(t.source),
    ]);
    console.log(createTable(
      [{ header: '名称' }, { header: '备份版本' }, { header: '来源' }],
      rows,
    ));
    if (missing.length > 20) {
      console.log(colors.dim(`  ...还有 ${missing.length - 20} 个`));
    }
  }

  if (options.dryRun) {
    console.log(colors.dim('\n预览模式，未执行实际恢复'));
    return;
  }

  // 执行恢复
  let success = 0;
  let failed = 0;

  for (const tool of missing) {
    const source = sourceMap[tool.source];
    if (!source || !registry.hasSource(tool.source)) {
      console.log(colors.dim(`跳过 ${tool.name} (不支持的来源: ${tool.source})`));
      continue;
    }

    const spinner = createSpinner(`恢复 ${tool.name}...`);
    try {
      const installer = registry.get(tool.source)!;
      const result = await installer.install(tool.name, { version: tool.version || undefined });
      if (result.success) {
        spinner.succeed(`${tool.name} 恢复成功`);
        success++;
      } else {
        spinner.fail(`${tool.name} 恢复失败: ${result.message}`);
        failed++;
      }
    } catch (error) {
      spinner.fail(`${tool.name} 恢复异常: ${error}`);
      failed++;
    }
  }

  console.log(`\n${colors.bold('恢复汇总')}: ${colors.success(`${success} 成功`)}，${colors.error(`${failed} 失败`)}`);

  if (success > 0) {
    const scanSpinner = createSpinner('更新工具清单...');
    const { Scanner } = await import('../scanner');
    const scanner = new Scanner();
    await scanner.scan('incremental');
    scanSpinner.succeed('工具清单已更新');
  }
}
