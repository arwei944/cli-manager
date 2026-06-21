import type { Recipe } from '../types';

/**
 * 将 Recipe 转换为 plain object（用于 YAML 序列化）
 */
export function recipeToPlainObject(recipe: Recipe): Record<string, unknown> {
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
