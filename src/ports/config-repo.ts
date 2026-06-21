import type { Config, ScanInterval, OutputFormat, InstallSource } from '../types';

/** 配置数据访问层端口 */
export interface IConfigRepository {
  get(): Config;
  set(config: Partial<Config>): void;
  getScanInterval(): ScanInterval;
  getDefaultFormat(): OutputFormat;
  getInstallSources(): InstallSource[];
  isColorEnabled(): boolean;
}
