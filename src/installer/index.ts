import type { ToolSource } from '../types';
import type { IInstaller, InstallOptions, InstallResult, IInstallerRegistry } from '../ports';

// 向后兼容的别名导出
export type { IInstaller as Installer, InstallOptions, InstallResult } from '../ports';

export class InstallerRegistry implements IInstallerRegistry {
  private installers = new Map<ToolSource, IInstaller>();

  register(installer: IInstaller): void {
    this.installers.set(installer.source, installer);
  }

  get(source: ToolSource): IInstaller | undefined {
    return this.installers.get(source);
  }

  hasSource(source: ToolSource): boolean {
    return this.installers.has(source);
  }

  getAvailableSources(): ToolSource[] {
    return Array.from(this.installers.keys());
  }
}

export const registry = new InstallerRegistry();
