import type { ToolSource, InstallSource } from '../types';
import type { IInstaller } from './installer';

/** 安装器注册表端口 */
export interface IInstallerRegistry {
  register(installer: IInstaller): void;
  get(source: ToolSource): IInstaller | undefined;
  hasSource(source: ToolSource): boolean;
  getAvailableSources(): ToolSource[];
}
