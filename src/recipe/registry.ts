import { loadAllRecipes, loadRecipeFromFile, loadUserRecipesFromDir, saveRecipeToFile, getRecipeUserDir } from './loader';
import type { Recipe } from '../types';

export class RecipeRegistry {
  private recipes = new Map<string, Recipe>();

  load(): void {
    this.recipes.clear();
    const recipes = loadAllRecipes();
    for (const recipe of recipes) {
      this.recipes.set(recipe.name, recipe);
    }
  }

  // 加载用户自定义配方，优先于内置配方
  loadUserRecipes(): void {
    const userRecipes = loadUserRecipesFromDir(getRecipeUserDir());
    for (const recipe of userRecipes) {
      this.recipes.set(recipe.name, recipe);
    }
  }

  get(name: string): Recipe | null {
    return this.recipes.get(name) || null;
  }

  has(name: string): boolean {
    return this.recipes.has(name);
  }

  list(): Recipe[] {
    return Array.from(this.recipes.values());
  }

  add(recipe: Recipe): void {
    this.recipes.set(recipe.name, recipe);
  }

  // 保存配方到用户配方目录
  saveRecipe(recipe: Recipe): string {
    const userDir = getRecipeUserDir();
    const filePath = saveRecipeToFile(userDir, recipe);
    this.recipes.set(recipe.name, recipe);
    return filePath;
  }

  // 删除配方文件
  removeRecipe(name: string): boolean {
    const recipe = this.recipes.get(name);
    if (!recipe) return false;

    const userDir = getRecipeUserDir();
    const filePath = `${userDir}/${name}.yml`;
    const altPath = `${userDir}/${name}.yaml`;

    let deleted = false;
    for (const path of [filePath, altPath]) {
      if (require('node:fs').existsSync(path)) {
        require('node:fs').unlinkSync(path);
        deleted = true;
      }
    }

    if (deleted) {
      this.recipes.delete(name);
    }
    return deleted;
  }

  loadFromFile(filePath: string): boolean {
    const recipe = loadRecipeFromFile(filePath);
    if (recipe) {
      this.recipes.set(recipe.name, recipe);
      return true;
    }
    return false;
  }

  search(keyword: string): Recipe[] {
    const lower = keyword.toLowerCase();
    return this.list().filter(r =>
      r.name.toLowerCase().includes(lower) ||
      r.displayName.toLowerCase().includes(lower) ||
      r.description.toLowerCase().includes(lower)
    );
  }
}

export const recipeRegistry = new RecipeRegistry();
