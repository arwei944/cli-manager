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
import type { ToolSource, InstallSource, Recipe } from '../types';

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

export async function recipeCommand(action?: string, name?: string, options?: { source?: string; exec?: string }) {
  recipeRegistry.load();

  switch (action) {
    case 'list':
    case undefined:
      listRecipes();
      break;

    case 'show':
      if (!name) {
        console.log(colors.error('用法: recipe show <name>'));
      } else {
        showRecipe(name);
      }
      break;

    case 'add':
      await handleRecipeAdd(name, options);
      break;

    case 'remove':
      await handleRecipeRemove(name);
      break;

    case 'edit':
      await handleRecipeEdit(name);
      break;

    default:
      console.log(colors.error('用法: recipe [list | show <name> | add <name> --source <source> --exec <executable> | remove <name> | edit <name>]'));
      break;
  }
}

// 添加自定义配方
async function handleRecipeAdd(name?: string, options?: { source?: string; exec?: string }): Promise<void> {
  if (!name) {
    console.log(colors.error('用法: recipe add <name> --source <source> --exec <executable>'));
    return;
  }

  if (!options?.source || !options?.exec) {
    console.log(colors.error('必须指定 --source 和 --exec 参数'));
    console.log(colors.dim('示例: recipe add mytool --source npm --exec mytool'));
    return;
  }

  // 验证 source 是否合法
  const validSources: InstallSource[] = ['npm', 'pip', 'gh', 'scoop', 'winget', 'choco'];
  if (!validSources.includes(options.source as InstallSource)) {
    console.log(colors.error(`不支持的安装源: ${options.source}。合法值: ${validSources.join(', ')}`));
    return;
  }

  const existingRecipe = recipeRegistry.get(name);
  if (existingRecipe) {
    console.log(colors.warning(`配方 "${name}" 已存在，将覆盖`));
  }

  const recipe: Recipe = {
    name,
    displayName: options.source === 'npm' ? name.toUpperCase() : name,
    description: `用户自定义配方: ${name}`,
    category: 'other',
    sources: [
      {
        type: options.source as Recipe['sources'][0]['type'],
        packageName: options.exec,
        executableName: options.exec,
      },
    ],
    versionCmd: options.source === 'npm' ? `${options.exec} --version` : '',
    versionRegex: '\\d+\\.\\d+\\.\\d+',
  };

  try {
    const filePath = recipeRegistry.saveRecipe(recipe);
    console.log(colors.success(`配方已添加: ${name}`));
    console.log(colors.dim(`文件: ${filePath}`));
  } catch (error) {
    console.log(colors.error(`保存配方失败: ${error}`));
  }
}

// 删除配方
async function handleRecipeRemove(name?: string): Promise<void> {
  if (!name) {
    console.log(colors.error('用法: recipe remove <name>'));
    return;
  }

  const exists = recipeRegistry.has(name);
  if (!exists) {
    console.log(colors.warning(`配方 "${name}" 不存在`));
    return;
  }

  // 提示用户确认是否删除内置配方
  const builtinDir = `${process.cwd()}/src/recipe/builtin`;
  const filePath = `${builtinDir}/${name}.yml`;
  const isBuiltin = require('node:fs').existsSync(filePath);

  if (isBuiltin) {
    console.log(colors.warning(`"${name}" 是内置配方，只能移除用户自定义副本`));
    console.log(colors.dim('使用 recipe edit 可以创建用户自定义副本进行覆盖'));
    return;
  }

  const deleted = recipeRegistry.removeRecipe(name);
  if (deleted) {
    console.log(colors.success(`配方 "${name}" 已删除`));
  } else {
    console.log(colors.error(`删除配方 "${name}" 失败`));
  }
}

// 编辑配方（打开编辑器）
async function handleRecipeEdit(name?: string): Promise<void> {
  if (!name) {
    console.log(colors.error('用法: recipe edit <name>'));
    return;
  }

  const existingRecipe = recipeRegistry.get(name);
  const userDir = require('../recipe/loader').getRecipeUserDir();

  // 确保用户配方目录存在
  if (!require('node:fs').existsSync(userDir)) {
    require('node:fs').mkdirSync(userDir, { recursive: true });
  }

  const targetPath = `${userDir}/${name}.yml`;

  // 如果配方不存在，或不存在于用户目录，创建新的用户自定义配方
  const isUserRecipe = require('node:fs').existsSync(targetPath);

  if (!existingRecipe) {
    console.log(colors.warning(`配方 "${name}" 不存在，将创建新配方`));
    const newRecipe: Recipe = {
      name,
      displayName: name,
      description: '用户自定义配方',
      category: 'other',
      sources: [],
      versionCmd: '',
      versionRegex: '',
    };
    const yaml = require('js-yaml');
    const content = yaml.dump(recipeToPlainObject(newRecipe), { indent: 2, noRefs: true });
    require('node:fs').writeFileSync(targetPath, content, 'utf-8');
  } else if (!isUserRecipe) {
    // 内置配方，复制到用户目录进行编辑
    const yaml = require('js-yaml');
    const content = yaml.dump(recipeToPlainObject(existingRecipe), { indent: 2, noRefs: true });
    require('node:fs').writeFileSync(targetPath, content, 'utf-8');
    console.log(colors.dim(`已创建用户副本: ${targetPath}`));
  }

  // 尝试打开编辑器
  const editor = process.env.EDITOR || process.env.VISUAL || (process.platform === 'win32' ? 'notepad' : 'vim');
  const { spawn } = require('node:child_process');

  console.log(colors.info(`正在打开编辑器: ${editor}`));
  console.log(colors.dim(`文件: ${targetPath}`));

  try {
    const child = spawn(editor, [targetPath], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    await new Promise<void>((resolve, reject) => {
      child.on('exit', (code: number | null) => {
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`编辑器退出码: ${code}`));
        }
      });
      child.on('error', reject);
    });

    // 编辑器关闭后重新加载配方
    recipeRegistry.load();
    recipeRegistry.loadUserRecipes();
    const updated = recipeRegistry.get(name);
    if (updated) {
      console.log(colors.success(`配方 "${name}" 已更新`));
    }
  } catch (error) {
    console.log(colors.error(`无法打开编辑器: ${error}`));
    console.log(colors.dim(`请手动编辑文件: ${targetPath}`));
  }
}

// 将 Recipe 转换为 plain object（用于 YAML 序列化）
function recipeToPlainObject(recipe: Recipe): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    name: recipe.name,
    displayName: recipe.displayName,
    description: recipe.description,
    category: recipe.category,
    sources: recipe.sources.map(s => ({
      type: s.type,
      packageName: s.packageName,
      ...(s.executableName ? { executableName: s.executableName } : {}),
    })),
    versionCmd: recipe.versionCmd,
    versionRegex: recipe.versionRegex,
  };

  if (recipe.postInstall && recipe.postInstall.length > 0) {
    obj.postInstall = recipe.postInstall;
  }

  return obj;
}

async function refreshInventory() {
  const scanSpinner = createSpinner('更新工具清单...');
  const scanner = new Scanner();
  await scanner.scan('incremental');
  scanSpinner.succeed('工具清单已更新');
}
