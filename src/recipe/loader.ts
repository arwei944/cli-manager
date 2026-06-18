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

export function getRecipeSearchPaths(): string[] {
  const builtinDir = path.join(process.cwd(), 'src', 'recipe', 'builtin');
  const userDir = path.join(getHomeDir(), '.cli-manager', 'recipes');
  const projectDir = path.join(process.cwd(), 'recipes');
  return [builtinDir, userDir, projectDir];
}

export function loadAllRecipes(): Recipe[] {
  const allRecipes: Recipe[] = [];
  const seen = new Set<string>();

  for (const dir of getRecipeSearchPaths()) {
    const recipes = loadRecipesFromDir(dir);
    for (const recipe of recipes) {
      if (!seen.has(recipe.name)) {
        seen.add(recipe.name);
        allRecipes.push(recipe);
      }
    }
  }

  return allRecipes;
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
