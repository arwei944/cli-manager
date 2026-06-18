import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { ConfigRepo } from '../db/config-repo';
import { initInstallers } from './install';
import { createSpinner } from '../ui/spinner';
import { colors, createTable, formatOutput } from '../ui';
import { UpstreamChecker } from '../scanner/upstream';
import semver from 'semver';
import type { OutputFormat, ToolSource } from '../types';

const toolRepo = new ToolRepo();
const configRepo = new ConfigRepo();
const upstreamChecker = new UpstreamChecker();

/**
 * 上游版本结果接口
 */
interface UpstreamResult {
  name: string;
  source: string;
  currentVersion: string | null;
  latestVersion: string | null;
  hasUpdate: boolean;
}

export async function outdatedCommand(options: { source?: string; json?: boolean }) {
  initDatabase();
  initInstallers();

  const config = configRepo.get();
  const format: OutputFormat = options.json ? 'json' : config.defaultFormat;
  const noColor = !config.colorEnabled;

  const tools = toolRepo.findAll();
  const checkable = tools.filter(t =>
    !t.isPinned &&
    t.version &&
    !['system', 'manual'].includes(t.source) &&
    (options.source ? t.source === options.source : true)
  );

  if (checkable.length === 0) {
    console.log(colors.info('没有可检查更新的工具'));
    return;
  }

  const spinner = createSpinner('检查更新...');
  const versionMap = new Map<string, { source: string; currentVersion: string | null; latestVersion: string | null }>();

  // 优先支持 npm/pip/gh，其余来源降级处理
  const upstreamSources = new Set<ToolSource>(['npm', 'pip', 'gh']);

  for (const tool of checkable) {
    if (!upstreamSources.has(tool.source as ToolSource)) {
      versionMap.set(tool.name, { source: tool.source, currentVersion: tool.version, latestVersion: null });
      continue;
    }

    try {
      const latestVersion = upstreamChecker.getLatestVersion(tool.name, tool.source, tool.version ?? undefined);
      versionMap.set(tool.name, { source: tool.source, currentVersion: tool.version, latestVersion: latestVersion });
    } catch {
      versionMap.set(tool.name, { source: tool.source, currentVersion: tool.version, latestVersion: null });
    }
  }

  const results: UpstreamResult[] = Array.from(versionMap.entries()).map(([name, { source, currentVersion, latestVersion }]) => {
    let hasUpdate = false;
    if (latestVersion && currentVersion) {
      try {
        hasUpdate = semver.gt(latestVersion, currentVersion);
      } catch {
        hasUpdate = false;
      }
    }
    return { name, source, currentVersion, latestVersion, hasUpdate };
  });

  if (format === 'json') {
    console.log(formatOutput(results as unknown as Array<Record<string, unknown>>, [
      { header: 'name' },
      { header: 'source' },
      { header: 'currentVersion' },
      { header: 'latestVersion' },
      { header: 'hasUpdate' },
    ], { format: 'json', noColor }));
    return;
  }

  const updatable = results.filter(r => r.hasUpdate);

  if (updatable.length === 0) {
    spinner.succeed('所有工具已是最新');
    return;
  }

  spinner.succeed(`发现 ${updatable.length} 个可更新工具`);
  console.log(createTable(
    [
      { header: '名称' },
      { header: '来源' },
      { header: '当前版本' },
      { header: '最新版本' },
    ],
    updatable.map(row => [row.name, colors.source(row.source), row.currentVersion ?? '-', row.latestVersion ?? '-']),
  ));
  console.log(colors.dim('使用 "update <name>" 更新单个工具，或 "update" 批量更新'));
}
