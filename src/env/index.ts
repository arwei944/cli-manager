import { execSync } from 'node:child_process';
import type { IEnvManager, EnvVarEntry } from '../ports/env-manager';

/** CLI 相关环境变量定义 */
const CLI_ENV_VARS: Array<{ name: string; description: string }> = [
  { name: 'PATH', description: '可执行文件搜索路径' },
  { name: 'HOME', description: '用户主目录' },
  { name: 'USERPROFILE', description: 'Windows 用户配置文件目录' },
  { name: 'NODE_PATH', description: 'Node.js 模块搜索路径' },
  { name: 'NPM_CONFIG_PREFIX', description: 'npm 全局安装前缀' },
  { name: 'EDITOR', description: '默认文本编辑器' },
  { name: 'VISUAL', description: '可视化编辑器' },
  { name: 'SHELL', description: '默认 Shell' },
  { name: 'TERM', description: '终端类型' },
  { name: 'FORCE_COLOR', description: '强制彩色输出' },
  { name: 'CLICOLOR', description: '终端颜色支持' },
];

export class EnvManager implements IEnvManager {
  list(): EnvVarEntry[] {
    return CLI_ENV_VARS.map(v => ({
      name: v.name,
      value: process.env[v.name] || '',
      description: v.description,
    }));
  }

  get(name: string): string | undefined {
    return process.env[name];
  }

  detectRuntimes(): Array<{ name: string; available: boolean }> {
    const runtimes = [
      { name: 'Node.js', cmd: 'node --version' },
      { name: 'npm', cmd: 'npm --version' },
      { name: 'Python', cmd: 'python --version' },
      { name: 'Git', cmd: 'git --version' },
    ];
    return runtimes.map(rt => {
      try {
        execSync(rt.cmd, { encoding: 'utf-8', timeout: 2000, stdio: 'pipe' });
        return { name: rt.name, available: true };
      } catch {
        return { name: rt.name, available: false };
      }
    });
  }
}
