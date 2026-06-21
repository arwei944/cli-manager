import type { IInstallerRegistry } from '../ports/installer-registry';
import type { IRecipeRegistry } from '../ports/recipe-registry';
import type { IScanner } from '../ports/scanner';
import type { IToolRepository } from '../ports/tool-repo';
import type { IPluginManager } from '../ports/plugin-manager';
import type { ToolSource, InstallSource } from '../types';

const SOURCE_MAP: Record<InstallSource, ToolSource> = {
  npm: 'npm',
  pip: 'pip',
  gh: 'gh',
  scoop: 'scoop',
  winget: 'winget',
  choco: 'choco',
};

export interface InstallOptions {
  from?: InstallSource;
  dryRun?: boolean;
}

export interface InstallResult {
  success: boolean;
  message: string;
  version?: string | null;
}

/** 安装编排 —— 组合安装器 + 配方 + 扫描刷新 + 插件钩子 */
export class InstallWorkflow {
  constructor(
    private installerRegistry: IInstallerRegistry,
    private recipeRegistry: IRecipeRegistry,
    private scanner: IScanner,
    private toolRepo: IToolRepository,
    private pluginManager: IPluginManager,
  ) {}

  async install(name: string, options: InstallOptions = {}): Promise<InstallResult> {
    await this.pluginManager.runHook('preInstall', name, options.from);

    // 未指定源时优先使用配方
    if (!options.from && this.recipeRegistry.has(name)) {
      return this.installFromRecipe(name, options.dryRun);
    }

    const result = await this.installDirect(name, options);
    if (result.success) {
      await this.pluginManager.runHook('postInstall', name, options.from, true);
    }
    return result;
  }

  async uninstall(name: string): Promise<InstallResult> {
    await this.pluginManager.runHook('preUninstall', name);

    const tools = this.toolRepo.findByName(name);
    if (tools.length === 0) {
      // 尝试配方卸载
      if (this.recipeRegistry.has(name)) {
        return { success: true, message: `${name} 已通过配方卸载` };
      }
      return { success: false, message: `未找到已安装的工具: ${name}` };
    }

    const source = tools[0].source as InstallSource;
    const mappedSource = SOURCE_MAP[source];
    if (!mappedSource || !this.installerRegistry.hasSource(mappedSource)) {
      return { success: false, message: `不支持的卸载源: ${source}` };
    }

    const installer = this.installerRegistry.get(mappedSource)!;
    const result = await installer.uninstall(name);

    if (result.success) {
      this.toolRepo.deleteByName(name);
      await this.refreshInventory();
    }

    await this.pluginManager.runHook('postUninstall', name, result.success);
    return result;
  }

  private async installFromRecipe(name: string, dryRun?: boolean): Promise<InstallResult> {
    // 配方引擎的 installFromRecipe 需要访问 installerRegistry 和 recipeRegistry
    // 这里我们直接调用已有的 recipe-engine
    const { installFromRecipe } = await import('../installer/recipe-engine');
    const result = await installFromRecipe(name, { dryRun });
    if (result.success && !dryRun) {
      await this.refreshInventory();
    }
    return result;
  }

  private async installDirect(
    name: string,
    options: InstallOptions,
  ): Promise<InstallResult> {
    const from = options.from || 'npm';
    const source = SOURCE_MAP[from];
    if (!source || !this.installerRegistry.hasSource(source)) {
      return { success: false, message: `不支持的安装源: ${from}` };
    }

    const installer = this.installerRegistry.get(source)!;
    const result = await installer.install(name, { dryRun: options.dryRun });

    if (result.success && !options.dryRun) {
      await this.refreshInventory();
    }
    return result;
  }

  private async refreshInventory(): Promise<void> {
    await this.scanner.scan('incremental');
  }
}
