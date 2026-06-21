import type { ToolSource } from '../types';

/** 安装器选项 */
export interface InstallOptions {
  version?: string;
  dryRun?: boolean;
}

/** 安装结果 */
export interface InstallResult {
  success: boolean;
  message: string;
  version?: string | null;
}

/** 单个安装器端口（策略模式） */
export interface IInstaller {
  readonly source: ToolSource;
  install(name: string, options?: InstallOptions): Promise<InstallResult>;
  uninstall(name: string): Promise<InstallResult>;
  checkInstalled(name: string): Promise<boolean>;
  getVersion(name: string): Promise<string | null>;
}
