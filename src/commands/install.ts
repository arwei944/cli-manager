import { initDatabase } from '../db';
import { Scanner } from '../scanner';
import { registry } from '../installer';
import { NpmInstaller } from '../installer/npm-installer';
import { PipInstaller } from '../installer/pip-installer';
import { GithubInstaller } from '../installer/github-installer';
import { ScoopInstaller } from '../installer/scoop-installer';
import { WingetInstaller } from '../installer/winget-installer';
import { ChocoInstaller } from '../installer/choco-installer';
import { installFromRecipe, uninstallFromRecipe, showRecipe, listRecipes } from '../installer/recipe-engine';
import { recipeRegistry } from '../recipe/registry';
import { createSpinner } from '../ui/spinner';
import { colors } from '../ui/colors';
import type { ToolSource, InstallSource } from '../types';

const sourceMap: Record<InstallSource, ToolSource> = {
  npm: 'npm',
  pip: 'pip',
  gh: 'gh',
  scoop: 'scoop',
  winget: 'winget',
  choco: 'choco',
};

export function initInstallers(): void {
  if (registry.getAvailableSources().length > 0) return;
  registry.register(new NpmInstaller());
  registry.register(new PipInstaller());
  registry.register(new GithubInstaller());
  registry.register(new ScoopInstaller());
  registry.register(new WingetInstaller());
  registry.register(new ChocoInstaller());
}

export async function installCommand(name: string, options: { from?: string; dryRun?: boolean }) {
  initDatabase();
  initInstallers();
  recipeRegistry.load();

  // 如果未指定安装源，优先使用配方
  if (!options.from) {
    if (recipeRegistry.has(name)) {
      const result = await installFromRecipe(name, { dryRun: options.dryRun });
      if (result.success) {
        console.log(colors.success(result.message));
        if (!options.dryRun) {
          await refreshInventory();
        }
      } else {
        console.log(colors.warning(`配方安装失败: ${result.message}`));
        console.log(colors.dim('尝试默认源 npm...'));
      }
      return;
    }
  }

  const from = (options.from || 'npm') as InstallSource;
  const source = sourceMap[from];

  if (!source || !registry.hasSource(source)) {
    console.log(colors.error(`不支持的安装源: ${from}`));
    return;
  }

  const installer = registry.get(source)!;
  const spinner = createSpinner(`正在通过 ${from} 安装 ${name}...`);

  try {
    const result = await installer.install(name, { dryRun: options.dryRun });
    if (result.success) {
      spinner.succeed(result.message);

      if (!options.dryRun) {
        await refreshInventory();
      }
    } else {
      spinner.fail(result.message);
    }
  } catch (error) {
    spinner.fail(`安装失败: ${error}`);
  }
}

export async function uninstallCommand(name: string) {
  initDatabase();
  initInstallers();
  recipeRegistry.load();

  const spinner = createSpinner(`正在卸载 ${name}...`);

  try {
    const toolRepo = (await import('../db/tool-repo')).ToolRepo;
    const repo = new toolRepo();
    const tools = repo.findByName(name);

    if (tools.length === 0) {
      // 尝试使用配方卸载
      if (recipeRegistry.has(name)) {
        const result = await uninstallFromRecipe(name);
        if (result.success) {
          spinner.succeed(`${name} 已通过配方卸载`);
        } else {
          spinner.fail(`未找到已安装的工具: ${name}`);
        }
        return;
      }
      spinner.fail(`未找到已安装的工具: ${name}`);
      return;
    }

    const source = tools[0].source as InstallSource;
    const mappedSource = sourceMap[source];

    if (!mappedSource || !registry.hasSource(mappedSource)) {
      spinner.fail(`不支持的卸载源: ${source}`);
      return;
    }

    const installer = registry.get(mappedSource)!;
    const result = await installer.uninstall(name);

    if (result.success) {
      repo.deleteByName(name);
      spinner.succeed(`${name} 已卸载`);
      await refreshInventory();
    } else {
      spinner.fail(result.message);
    }
  } catch (error) {
    spinner.fail(`卸载失败: ${error}`);
  }
}

export async function recipeCommand(action?: string, name?: string) {
  recipeRegistry.load();

  if (action === 'list' || !action) {
    listRecipes();
  } else if (action === 'show' && name) {
    showRecipe(name);
  } else {
    console.log(colors.error('用法: recipe [list | show <name>]'));
  }
}

async function refreshInventory() {
  const scanSpinner = createSpinner('更新工具清单...');
  const scanner = new Scanner();
  await scanner.scan('incremental');
  scanSpinner.succeed('工具清单已更新');
}
