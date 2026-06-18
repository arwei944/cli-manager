import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { initInstallers } from './install';
import { registry } from '../installer';
import { createSpinner } from '../ui/spinner';
import { colors, createTable } from '../ui';

const toolRepo = new ToolRepo();

function isValidNpmPackage(name: string): boolean {
  // npm 包名校验：不能以 . 或 _ 开头，只能包含小写字母数字和 ._- 符号
  return /^@?[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)?$/.test(name);
}

export async function outdatedCommand(options: { source?: string }) {
  initDatabase();
  initInstallers();

  const tools = toolRepo.findAll();
  const checkable = tools.filter(t =>
    !t.isPinned &&
    registry.hasSource(t.source as 'npm' | 'pip') &&
    (options.source ? t.source === options.source : true)
  );

  if (checkable.length === 0) {
    console.log(colors.info('没有可检查更新的工具'));
    return;
  }

  const spinner = createSpinner('检查更新...');
  const rows: string[][] = [];

  for (const tool of checkable) {
    const installer = registry.get(tool.source as 'npm' | 'pip');
    if (!installer) continue;

    // 快速跳过非有效 npm 包名的工具
    if (tool.source === 'npm' && !isValidNpmPackage(tool.name)) continue;

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
  console.log(colors.dim('使用 "update <name>" 更新单个工具，或 "update" 批量更新'));
}
