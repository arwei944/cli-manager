import type { ToolCategory } from './tool';
import type { InstallSource } from './config';

export interface RecipeSource {
  type: InstallSource;
  packageName: string;
  executableName?: string;
}

export interface Recipe {
  name: string;
  displayName: string;
  description: string;
  category: ToolCategory;
  sources: RecipeSource[];
  versionCmd: string;
  versionRegex: string;
  postInstall?: string[];
}
