import type { Recipe } from '../types';

/** 配方注册表端口 */
export interface IRecipeRegistry {
  load(): void;
  loadUserRecipes(): void;
  get(name: string): Recipe | null;
  has(name: string): boolean;
  list(): Recipe[];
  add(recipe: Recipe): void;
  saveRecipe(recipe: Recipe): string;
  removeRecipe(name: string): boolean;
  search(keyword: string): Recipe[];
  loadFromFile(filePath: string): boolean;
}
