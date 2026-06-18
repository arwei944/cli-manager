import type { Recipe } from '../types';
import { loadRecipesFromDir, getRecipeUserDir } from './loader';

export class UserRecipeLoader {
  private watchers: { dir: string; interval: ReturnType<typeof setInterval> }[] = [];

  load(watch = false): Recipe[] {
    const dir = getRecipeUserDir();
    const recipes = loadRecipesFromDir(dir);

    if (watch) {
      this.startWatch(dir);
    }

    return recipes;
  }

  private startWatch(dir: string): void {
    if (this.watchers.some(w => w.dir === dir)) return;
    const interval = setInterval(() => {}, 5000);
    this.watchers.push({ dir, interval });
  }

  stopAll(): void {
    for (const watcher of this.watchers) {
      clearInterval(watcher.interval);
    }
    this.watchers = [];
  }

  getUserDir(): string {
    return getRecipeUserDir();
  }
}
