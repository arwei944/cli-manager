import type { InstallOptions } from './index';
import { recipeRegistry } from '../recipe/registry';
import { registry as installerRegistry } from './index';
import { createSpinner } from '../ui/spinner';
import { colors } from '../ui/colors';
import type { InstallResult } from './index';

export interface RecipeInstallOptions extends InstallOptions {
  preferredSource?: string;
}

export async function installFromRecipe(name: string, options: RecipeInstallOptions = {}): Promise<InstallResult> {
  recipeRegistry.load();

  const recipe = recipeRegistry.get(name);
  if (!recipe) {
    return { success: false, message: `未找到 ${name} 的安装配方` };
  }

  if (options.dryRun) {
    const plan = recipe.sources.map(s => `  - ${s.type}: ${s.packageName}`).join('\n');
    return {
      success: true,
      message: `[dry-run] 安装 ${name} 的计划:\n${plan}`,
    };
  }

  // 优先使用用户指定的源，否则按配方的源顺序尝试
  const preferred = options.preferredSource;
  const sources = preferred
    ? recipe.sources.filter(s => s.type === preferred)
    : recipe.sources;

  if (sources.length === 0) {
    return { success: false, message: `配方中没有可用的安装源` };
  }

  const spinner = createSpinner(`使用配方安装 ${name}...`);

  for (const source of sources) {
    const toolSource = source.type as 'npm' | 'pip' | 'gh' | 'scoop' | 'winget' | 'choco';
    if (!installerRegistry.hasSource(toolSource)) {
      continue;
    }

    spinner.update(`尝试通过 ${source.type} 安装 ${source.packageName}...`);
    const installer = installerRegistry.get(toolSource)!;

    try {
      const result = await installer.install(source.packageName, { version: options.version });
      if (result.success) {
        spinner.succeed(`${name} 通过 ${source.type} 安装成功`);

        // 执行安装后操作
        if (recipe.postInstall && recipe.postInstall.length > 0) {
          for (const cmd of recipe.postInstall) {
            try {
              const { exec } = await import('../utils/exec');
              exec(cmd, { timeout: 30000 });
            } catch {
              // 忽略 post-install 失败
            }
          }
        }

        return { success: true, message: result.message, version: result.version };
      }
    } catch (error) {
      spinner.update(`${source.type} 失败: ${error}，尝试下一个源...`);
    }
  }

  spinner.fail(`${name} 安装失败：所有可用源均尝试失败`);
  return { success: false, message: '所有可用源均尝试失败' };
}

export async function uninstallFromRecipe(name: string): Promise<InstallResult> {
  recipeRegistry.load();

  const recipe = recipeRegistry.get(name);
  if (!recipe) {
    return { success: false, message: `未找到 ${name} 的安装配方` };
  }

  const spinner = createSpinner(`使用配方卸载 ${name}...`);

  for (const source of recipe.sources) {
    const toolSource = source.type as 'npm' | 'pip' | 'gh' | 'scoop' | 'winget' | 'choco';
    if (!installerRegistry.hasSource(toolSource)) continue;

    const installer = installerRegistry.get(toolSource)!;
    try {
      const result = await installer.uninstall(source.packageName);
      if (result.success) {
        spinner.succeed(`${name} 卸载成功`);
        return result;
      }
    } catch {
      // 尝试下一个源
    }
  }

  spinner.fail(`${name} 卸载失败`);
  return { success: false, message: '所有可用源均尝试失败' };
}

export function showRecipe(name: string): void {
  recipeRegistry.load();
  const recipe = recipeRegistry.get(name);

  if (!recipe) {
    console.log(colors.error(`未找到配方: ${name}`));
    return;
  }

  console.log(`\n${colors.bold(recipe.displayName)} ${colors.dim(`(${recipe.name})`)}`);
  console.log(`  分类: ${colors.category(recipe.category)}`);
  console.log(`  描述: ${recipe.description || colors.dim('无')}`);
  console.log(`  安装源:`);
  for (const source of recipe.sources) {
    console.log(`    - ${colors.source(source.type)}: ${source.packageName}`);
    if (source.executableName) {
      console.log(`      可执行名: ${source.executableName}`);
    }
  }
  if (recipe.versionCmd) {
    console.log(`  版本命令: ${recipe.versionCmd}`);
  }
  if (recipe.versionRegex) {
    console.log(`  版本正则: ${recipe.versionRegex}`);
  }
  if (recipe.postInstall && recipe.postInstall.length > 0) {
    console.log(`  安装后操作:`);
    for (const cmd of recipe.postInstall) {
      console.log(`    - ${cmd}`);
    }
  }
}

export function listRecipes(): void {
  recipeRegistry.load();
  const recipes = recipeRegistry.list();

  if (recipes.length === 0) {
    console.log(colors.dim('暂无安装配方'));
    return;
  }

  console.log(`\n${colors.bold('内置安装配方')} (${recipes.length} 个)`);
  for (const recipe of recipes) {
    const sources = recipe.sources.map(s => s.type).join(', ');
    console.log(`  ${colors.bold(recipe.name.padEnd(20))} ${colors.category(recipe.category)}  [${sources}]`);
    if (recipe.description) {
      console.log(`  ${' '.repeat(20)} ${colors.dim(recipe.description)}`);
    }
  }
}
