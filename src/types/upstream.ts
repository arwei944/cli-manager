/**
 * 上游版本信息接口
 */
export interface UpstreamVersion {
  /** 工具名称 */
  name: string;
  /** 安装来源 */
  source: string;
  /** 本地当前版本 */
  currentVersion: string | null;
  /** 上游最新版本 */
  latestVersion: string | null;
  /** 是否有可用更新 */
  hasUpdate: boolean;
}
