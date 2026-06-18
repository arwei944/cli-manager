import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { HistoryRepo } from '../db/history-repo';
import { initInstallers } from './install';
import { registry } from '../installer';
import { createSpinner } from '../ui/spinner';
import { colors } from '../ui/colors';
import { createTable } from '../ui/table';
import { Scanner } from '../scanner';
import semver from 'semver';
import type { ToolSource } from '../types';

const toolRepo = new ToolRepo();
const historyRepo = new HistoryRepo();

/**
 * 获取最新版本并验证是否有更新
 */
async function resolveLatestVersion(
  source: ToolSource,
  name: string,
  currentVersion?: string,
): Promise<string | null> {
  const installer = registry.get(source);
  if (!installer) return null;

  let latest: string | null = null;
  try {
    latest = await installer.getVersion(name);
  } catch {
    // 忽略版本获取失败
  }

  if (!latest) return null;
  if (currentVersion && !semver.valid(currentVersion)) return latest;
  if (currentVersion && !semver.valid(latest)) return latest;
  if (currentVersion && semver.lte(latest, currentVersion)) return null;

  return latest;
}

export async function updateCommand(name?: string, options?: { source?: string; dryRun?: boolean }) {
  initDatabase();
  initInstallers();

  if (name) {
    await updateSingle(name, options);
  } else {
    await updateBatch(options);
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

  const source = tool.source as ToolSource;
  if (!registry.hasSource(source)) {
    console.log(colors.error(`不支持的更新源: ${source}`));
    return;
  }

  const installer = registry.get(source)!;
  const spinner = createSpinner(`检查 ${name} 更新...`);

  try {
    const currentVersion = tool.version;
    const latestVersion = await resolveLatestVersion(source, name, currentVersion ?? undefined);

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
      await refreshInventory();
    } else {
      spinner.fail(`更新失败: ${result.message}`);
    }
  } catch (error) {
    spinner.fail(`更新失败: ${error}`);
  }
}

async function updateBatch(options?: { dryRun?: boolean }) {
  const tools = toolRepo.findAll();
  const updatable = tools.filter(t =>
    !t.isPinned &&
    t.version !== null &&
    registry.hasSource(t.source as ToolSource),
  );

  if (updatable.length === 0) {
    console.log(colors.info('没有需要更新的工具'));
    return;
  }

  console.log(`\n${colors.bold('批量更新检查')}`);
  console.log(`${'─'.repeat(40)}`);

  const rows: Array<{ name: string; source: string; current: string; latest: string }> = [];
  const spinner = createSpinner('检查更新...');

  for (const tool of updatable) {
    try {
      const latest = await resolveLatestVersion(tool.source as ToolSource, tool.name, tool.version ?? undefined);
      if (latest && latest !== tool.version) {
        rows.push({ name: tool.name, source: tool.source, current: tool.version!, latest });
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
    [{ header: '名称' }, { header: '来源' }, { header: '当前版本' }, { header: '最新版本' }],
    rows.map(r => [r.name, colors.source(r.source), r.current, r.latest]),
  ));

  if (options?.dryRun) {
    console.log(colors.dim('预览模式，未执行实际更新'));
    return;
  }

  let success = 0;
  let failed = 0;
  for (const row of rows) {
    const tool = toolRepo.findByName(row.name)[0];
    if (!tool) continue;
    const source = tool.source as ToolSource;
    const installer = registry.get(source);
    if (!installer) continue;

    const toolSpinner = createSpinner(`更新 ${row.name}...`);
    try {
      const result = await installer.install(row.name, { version: row.latest });
      if (result.success) {
        historyRepo.addVersionChange(row.name, row.current, row.latest, 'update');
        toolSpinner.succeed(`${row.name} 已更新`);
        success++;
      } else {
        toolSpinner.fail(`${row.name} 更新失败: ${result.message}`);
        failed++;
      }
    } catch (error) {
      toolSpinner.fail(`${row.name} 更新异常: ${error}`);
      failed++;
    }
  }

  console.log(`\n${colors.bold('更新汇总')}: ${colors.success(`${success} 成功`)}，${colors.error(`${failed} 失败`)}`);
}

/**
 * 重新扫描工具清单（增量扫描）
 */
async function refreshInventory(): Promise<void> {
  const scanSpinner = createSpinner('更新工具清单...');
  const scanner = new Scanner();
  await scanner.scan('incremental');
  scanSpinner.succeed('工具清单已更新');
}
