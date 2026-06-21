/** 版本信息 */
export interface VersionInfo {
  name: string;
  currentVersion: string | null;
  source: string;
  isPinned: boolean;
  pinnedVersion: string | null;
}

/** 版本变更记录 */
export interface VersionChange {
  id: number;
  toolName: string;
  previousVersion: string | null;
  newVersion: string | null;
  operation: string;
  operatedAt: string;
}

/** 版本管理器端口 */
export interface IVersionManager {
  /** 查看工具版本信息 */
  getVersionInfo(name: string): VersionInfo | null;
  /** 锁定版本 */
  pin(name: string, version?: string): boolean;
  /** 解除锁定 */
  unpin(name: string): boolean;
  /** 查询版本变更历史 */
  getHistory(name: string, limit?: number): VersionChange[];
}
