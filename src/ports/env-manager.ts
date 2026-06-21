/** 环境变量条目 */
export interface EnvVarEntry {
  name: string;
  value: string;
  description: string;
}

/** 环境管理器端口 */
export interface IEnvManager {
  /** 列出所有 CLI 相关环境变量 */
  list(): EnvVarEntry[];
  /** 获取单个环境变量值 */
  get(name: string): string | undefined;
  /** 检测运行时环境（Node/npm/Python/Git 等是否可用） */
  detectRuntimes(): Array<{ name: string; available: boolean }>;
}
