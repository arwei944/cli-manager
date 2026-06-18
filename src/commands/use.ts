import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { HistoryRepo } from '../db/history-repo';
import { initInstallers } from './install';
import { registry } from '../installer';
import { createSpinner } from '../ui/spinner';
import { colors } from '../ui';
import type { InstallSource } from '../types';

const toolRepo = new ToolRepo();
const historyRepo = new HistoryRepo();

const sourceMap: Record<string, InstallSource> = {
  npm: 'npm',
  pip: 'pip',
  gh: 'gh',
  scoop: 'scoop',
  winget: 'winget',
  choco: 'choco',
};

export async function useCommand(name: string, version?: string) {
  initDatabase();
  initInstallers();

  const tools = toolRepo.findByName(name);
  if (tools.length === 0) {
    console.log(colors.error(`未找到工具: ${name}`));
    return;
  }

  const tool = tools[0];
  const source = sourceMap[tool.source];

  if (!source || !registry.hasSource(tool.source as 'npm' | 'pip')) {
    console.log(colors.error(`工具 ${name} 的来源 (${tool.source}) 不支持版本切换`));
    console.log(colors.dim('支持切换的来源: npm、pip'));
    return;
  }

  // 未指定版本时，列出可选版本
  if (!version) {
    const versions = await listAvailableVersions(name, source);
    if (versions.length === 0) {
      console.log(colors.error(`无法获取 ${name} 的可用版本`));
      return;
    }
    console.log(`\n${colors.bold(`${name} 可用版本`)}`);
    versions.slice(0, 20).forEach((v, i) => {
      const mark = v === tool.version ? colors.success('← 当前') : '';
      console.log(`  ${String(i + 1).padStart(3)}. ${v} ${mark}`);
    });
    console.log(colors.dim(`\n使用 "cli-manager use ${name} <version>" 切换版本`));
    return;
  }

  const spinner = createSpinner(`切换 ${name} 到版本 ${version}...`);

  try {
    const installer = registry.get(tool.source as 'npm' | 'pip')!;
    const currentVersion = tool.version;

    const result = await installer.install(name, { version });
    if (result.success) {
      historyRepo.addVersionChange(name, currentVersion, version, 'switch');
      spinner.succeed(`${name} 已切换到版本 ${version}`);

      // 重新扫描更新清单
      const { Scanner } = await import('../scanner');
      const scanner = new Scanner();
      await scanner.scan('incremental');
    } else {
      spinner.fail(`版本切换失败: ${result.message}`);
    }
  } catch (error) {
    spinner.fail(`版本切换失败: ${error}`);
  }
}

export async function rollbackCommand(name: string) {
  initDatabase();

  const history = historyRepo.getVersionHistory(name, 10);

  if (history.length === 0) {
    console.log(colors.error(`${name} 没有版本变更记录，无法回退`));
    return;
  }

  // 找到最近一次有效的更新/切换记录
  const lastChange = history.find(h => h.operation === 'update' || h.operation === 'switch');

  if (!lastChange || !lastChange.previousVersion) {
    console.log(colors.error(`${name} 没有可回退的上一版本`));
    return;
  }

  console.log(`\n${colors.bold(`${name} 版本回退`)}`);
  console.log(`  当前版本: ${lastChange.newVersion || '未知'}`);
  console.log(`  回退到: ${colors.success(lastChange.previousVersion)}`);

  const spinner = createSpinner(`回退 ${name} 到版本 ${lastChange.previousVersion}...`);

  try {
    initInstallers();
    const tools = toolRepo.findByName(name);
    if (tools.length === 0) {
      spinner.fail(`未找到工具: ${name}`);
      return;
    }

    const source = sourceMap[tools[0].source];
    if (!source || !registry.hasSource(tools[0].source as 'npm' | 'pip')) {
      spinner.fail(`工具来源 (${tools[0].source}) 不支持版本回退`);
      return;
    }

    const installer = registry.get(tools[0].source as 'npm' | 'pip')!;
    const result = await installer.install(name, { version: lastChange.previousVersion });

    if (result.success) {
      historyRepo.addVersionChange(name, lastChange.newVersion, lastChange.previousVersion, 'rollback');
      spinner.succeed(`${name} 已回退到版本 ${lastChange.previousVersion}`);

      const { Scanner } = await import('../scanner');
      const scanner = new Scanner();
      await scanner.scan('incremental');
    } else {
      spinner.fail(`回退失败: ${result.message}`);
    }
  } catch (error) {
    spinner.fail(`回退失败: ${error}`);
  }
}

async function listAvailableVersions(name: string, source: InstallSource): Promise<string[]> {
  try {
    const { exec } = await import('../utils/exec');
    if (source === 'npm') {
      const result = exec(`npm view ${name} versions --json`, { timeout: 10000 });
      if (result.exitCode === 0) {
        const versions = JSON.parse(result.stdout);
        return Array.isArray(versions) ? versions.reverse() : [];
      }
    } else if (source === 'pip') {
      const result = exec(`pip index versions ${name}`, { timeout: 10000 });
      if (result.exitCode === 0) {
        const match = result.stdout.match(/Available versions:\s*(.+)/);
        if (match) {
          return match[1].split(',').map(v => v.trim()).filter(Boolean);
        }
      }
    }
  } catch {
    // 忽略错误
  }
  return [];
}
