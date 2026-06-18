import { loadAllRecipes, loadRecipeFromFile } from './loader';
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
