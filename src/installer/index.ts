import type { ToolSource } from '../types';

export interface Installer {
  readonly source: ToolSource;
  install(name: string, options?: InstallOptions): Promise<InstallResult>;
  uninstall(name: string): Promise<InstallResult>;
  checkInstalled(name: string): Promise<boolean>;
  getVersion(name: string): Promise<string | null>;
}

export interface InstallOptions {
  version?: string;
  dryRun?: boolean;
}

export interface InstallResult {
  success: boolean;
  message: string;
  version?: string | null;
}

export class InstallerRegistry {
  private installers = new Map<ToolSource, Installer>();

  register(installer: Installer): void {
    this.installers.set(installer.source, installer);
  }

  get(source: ToolSource): Installer | undefined {
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
