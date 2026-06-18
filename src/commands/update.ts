import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { HistoryRepo } from '../db/history-repo';
import { initInstallers } from './install';
import { registry } from '../installer';
import { createSpinner } from '../ui/spinner';
import { createTable } from '../ui';
import { colors } from '../ui/colors';
import type { ToolSource } from '../types';

const toolRepo = new ToolRepo();
const historyRepo = new HistoryRepo();

export async function updateCommand(name?: string, options?: { dryRun?: boolean }) {
  initDatabase();
  initInstallers();

  if (name) {
    await updateSingle(name, options);
  } else {
    await updateAll(options);
  }
}

async function updateSingle(name: string, options?: { dryRun?: boolean }) {
  const tools = toolRepo.findByName(name);
  if (tools.length === 0) {
    console.log(colors.error(`未找到工具: ${name}`));
    return;
  }

  const tool = tools[0];
  if (tool.isPinned) {
    console.log(colors.warning(`${name} 已锁定在版本 ${tool.pinnedVersion}，跳过更新`));
    return;
  }

  const source = tool.source as 'npm' | 'pip' | 'gh' | 'scoop' | 'winget' | 'choco';
  if (!registry.hasSource(source as ToolSource)) {
    console.log(colors.error(`不支持的更新源: ${source}`));
    return;
  }

  const installer = registry.get(source as ToolSource)!;
  const spinner = createSpinner(`检查 ${name} 更新...`);

  try {
    const currentVersion = tool.version;
    const latestVersion = await installer.getVersion(name);

    if (!latestVersion || latestVersion === currentVersion) {
      spinner.succeed(`${name} 已是最新版本 (${currentVersion || '未知'})`);
      return;
    }

    if (options?.dryRun) {
      spinner.succeed(`[dry-run] ${name}: ${currentVersion} → ${latestVersion}`);
      return;
    }

    spinner.update(`更新 ${name}: ${currentVersion} → ${latestVersion}...`);
    const result = await installer.install(name, { version: latestVersion });

    if (result.success) {
      historyRepo.addVersionChange(name, currentVersion, latestVersion, 'update');
      spinner.succeed(`${name} 已更新: ${currentVersion} → ${latestVersion}`);

      // 重新扫描更新清单
      const { Scanner } = await import('../scanner');
      const scanner = new Scanner();
      await scanner.scan('incremental');
    } else {
      spinner.fail(`更新失败: ${result.message}`);
    }
  } catch (error) {
    spinner.fail(`更新失败: ${error}`);
  }
}

async function updateAll(options?: { dryRun?: boolean }) {
  const tools = toolRepo.findAll();
  const updatable = tools.filter(t => !t.isPinned && t.version && registry.hasSource(t.source as 'npm' | 'pip'));

  if (updatable.length === 0) {
    console.log(colors.info('没有需要更新的工具'));
    return;
  }

  console.log(`\n${colors.bold('批量更新检查')}`);
  console.log(`${'─'.repeat(40)}`);

  const rows: string[][] = [];
  const spinner = createSpinner('检查更新...');

  for (const tool of updatable) {
    const installer = registry.get(tool.source as 'npm' | 'pip');
    if (!installer) continue;

    try {
      const latestVersion = await installer.getVersion(tool.name);
      if (latestVersion && latestVersion !== tool.version) {
        rows.push([
          tool.name,
          tool.version || '-',
          latestVersion,
          colors.source(tool.source),
        ]);
      }
    } catch {
      // 跳过检查失败的工具
    }
  }

  if (rows.length === 0) {
    spinner.succeed('所有工具已是最新');
    return;
  }

  spinner.succeed(`发现 ${rows.length} 个可更新工具`);

  console.log(createTable(
    [{ header: '名称' }, { header: '当前版本' }, { header: '最新版本' }, { header: '来源' }],
    rows,
  ));

  if (options?.dryRun) {
    console.log(colors.dim('预览模式，未执行实际更新'));
    return;
  }

  // 顺序执行更新
  let success = 0;
  let failed = 0;
  for (const row of rows) {
    const [name] = row;
    const toolSpinner = createSpinner(`更新 ${name}...`);
    try {
      const installer = registry.get(toolRepo.findByName(name)[0]?.source as 'npm' | 'pip');
      if (!installer) continue;
      const result = await installer.install(name);
      if (result.success) {
        toolSpinner.succeed(`${name} 已更新`);
        success++;
      } else {
        toolSpinner.fail(`${name} 更新失败`);
        failed++;
      }
    } catch {
      toolSpinner.fail(`${name} 更新异常`);
      failed++;
    }
  }

  console.log(`\n${colors.bold('更新汇总')}: ${colors.success(`${success} 成功`)}，${colors.error(`${failed} 失败`)}`);
}
