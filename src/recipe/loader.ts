import type { Recipe } from '../types';
import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';
import { getHomeDir } from '../utils/platform';

export function loadRecipeFromFile(filePath: string): Recipe | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = yaml.load(content) as Record<string, unknown>;
    return validateRecipe(data);
  } catch (error) {
    console.error(`加载配方失败 ${filePath}:`, error);
    return null;
  }
}

export function loadRecipesFromDir(dir: string): Recipe[] {
  const recipes: Recipe[] = [];
  if (!fs.existsSync(dir)) return recipes;

  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    if (!entry.endsWith('.yml') && !entry.endsWith('.yaml')) continue;
    const recipe = loadRecipeFromFile(path.join(dir, entry));
    if (recipe) recipes.push(recipe);
  }
  return recipes;
}

// 获取用户配方目录路径（优先使用项目根目录 recipes/， fallback 到 ~/.cli-manager/recipes/）
export function getRecipeUserDir(): string {
  const projectDir = path.join(process.cwd(), 'recipes');
  if (fs.existsSync(projectDir)) {
    return projectDir;
  }
  const homeDir = path.join(getHomeDir(), '.cli-manager', 'recipes');
  return homeDir;
}

// 获取内置配方目录路径
export function getRecipeBuiltinDir(): string {
  return path.join(process.cwd(), 'src', 'recipe', 'builtin');
}

export function getRecipeSearchPaths(): string[] {
  const builtinDir = getRecipeBuiltinDir();
  const userDir = getRecipeUserDir();
  return [builtinDir, userDir];
}

export function loadAllRecipes(): Recipe[] {
  const allRecipes: Recipe[] = [];
  const seen = new Set<string>();

  // 先加载内置配方（低优先级）
  const builtinDir = getRecipeBuiltinDir();
  if (fs.existsSync(builtinDir)) {
    const builtinRecipes = loadRecipesFromDir(builtinDir);
    for (const recipe of builtinRecipes) {
      if (!seen.has(recipe.name)) {
        seen.add(recipe.name);
        allRecipes.push(recipe);
      }
    }
  }

  // 再加载用户配方（高优先级，覆盖同名内置配方）
  const userDir = getRecipeUserDir();
  if (fs.existsSync(userDir)) {
    const userRecipes = loadRecipesFromDir(userDir);
    for (const recipe of userRecipes) {
      // 用户配方覆盖同名内置配方
      const existingIndex = allRecipes.findIndex(r => r.name === recipe.name);
      if (existingIndex >= 0) {
        allRecipes[existingIndex] = recipe;
      } else {
        allRecipes.push(recipe);
      }
    }
  }

  return allRecipes;
}

// 仅加载用户目录中的配方（用于增量加载）
export function loadUserRecipesFromDir(dir: string): Recipe[] {
  return loadRecipesFromDir(dir);
}

// 保存配方到用户目录
export function saveRecipeToFile(dir: string, recipe: Recipe): string {
  // 确保目录存在
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, `${recipe.name}.yml`);
  const yamlContent = yaml.dump(recipeToYaml(recipe), {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  });

  fs.writeFileSync(filePath, yamlContent, 'utf-8');
  return filePath;
}

// 将 Recipe 对象转换为 YAML 友好的 plain object
function recipeToYaml(recipe: Recipe): Record<string, unknown> {
  const data: Record<string, unknown> = {
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
    data.postInstall = recipe.postInstall;
  }

  return data;
}

function validateRecipe(data: Record<string, unknown>): Recipe | null {
  if (!data || typeof data !== 'object') return null;

  const name = String(data.name || '');
  if (!name) return null;

  const sources = (data.sources || []) as Array<{ type: string; packageName: string; executableName?: string }>;
  const validSources = sources
    .filter(s => s && typeof s === 'object' && s.type && s.packageName)
    .map(s => ({
      type: s.type as Recipe['sources'][0]['type'],
      packageName: String(s.packageName),
      executableName: s.executableName ? String(s.executableName) : undefined,
    }));

  if (validSources.length === 0) return null;

  return {
    name,
    displayName: String(data.displayName || name),
    description: String(data.description || ''),
    category: (data.category as Recipe['category']) || 'other',
    sources: validSources,
    versionCmd: String(data.versionCmd || ''),
    versionRegex: String(data.versionRegex || ''),
    postInstall: Array.isArray(data.postInstall) ? data.postInstall.map(String) : undefined,
  };
}
