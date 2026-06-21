import fs from 'node:fs';
import { spawn } from 'node:child_process';
import yaml from 'js-yaml';
import { recipeRegistry } from '../recipe/registry';
import { colors } from '../ui/colors';
import { showRecipe, listRecipes } from '../installer/recipe-engine';
import { getRecipeUserDir } from '../recipe/loader';
import { recipeToPlainObject } from './recipe-utils';
import type { Recipe, InstallSource } from '../types';

const VALID_SOURCES: InstallSource[] = ['npm', 'pip', 'gh', 'scoop', 'winget', 'choco'];

export async function recipeCommand(
  action?: string,
  name?: string,
  options?: { source?: string; exec?: string },
) {
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
      console.log(
        colors.error(
          '用法: recipe [list | show <name> | add <name> --source <source> --exec <executable> | remove <name> | edit <name>]',
        ),
      );
      break;
  }
}

// ─── 添加自定义配方 ───────────────────────────────────────

async function handleRecipeAdd(
  name?: string,
  options?: { source?: string; exec?: string },
): Promise<void> {
  if (!name) {
    console.log(colors.error('用法: recipe add <name> --source <source> --exec <executable>'));
    return;
  }

  if (!options?.source || !options?.exec) {
    console.log(colors.error('必须指定 --source 和 --exec 参数'));
    console.log(colors.dim('示例: recipe add mytool --source npm --exec mytool'));
    return;
  }

  if (!VALID_SOURCES.includes(options.source as InstallSource)) {
    console.log(
      colors.error(`不支持的安装源: ${options.source}。合法值: ${VALID_SOURCES.join(', ')}`),
    );
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

// ─── 删除配方 ───────────────────────────────────────────

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

  // 检查是否为内置配方
  const builtinDir = `${process.cwd()}/src/recipe/builtin`;
  const filePath = `${builtinDir}/${name}.yml`;
  const isBuiltin = fs.existsSync(filePath);

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

// ─── 编辑配方 ───────────────────────────────────────────

async function handleRecipeEdit(name?: string): Promise<void> {
  if (!name) {
    console.log(colors.error('用法: recipe edit <name>'));
    return;
  }

  const existingRecipe = recipeRegistry.get(name);
  const userDir = getRecipeUserDir();

  // 确保用户配方目录存在
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const targetPath = `${userDir}/${name}.yml`;
  const isUserRecipe = fs.existsSync(targetPath);

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
    const content = yaml.dump(recipeToPlainObject(newRecipe), { indent: 2, noRefs: true });
    fs.writeFileSync(targetPath, content, 'utf-8');
  } else if (!isUserRecipe) {
    // 内置配方，复制到用户目录进行编辑
    const content = yaml.dump(recipeToPlainObject(existingRecipe), { indent: 2, noRefs: true });
    fs.writeFileSync(targetPath, content, 'utf-8');
    console.log(colors.dim(`已创建用户副本: ${targetPath}`));
  }

  // 尝试打开编辑器
  const editor =
    process.env.EDITOR || process.env.VISUAL || (process.platform === 'win32' ? 'notepad' : 'vim');

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
