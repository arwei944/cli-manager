import { exec } from '../utils/exec';
import type { Installer, InstallOptions, InstallResult } from './index';

export class GithubInstaller implements Installer {
  readonly source = 'gh' as const;

  async install(name: string, options?: InstallOptions): Promise<InstallResult> {
    const [owner, repo] = name.split('/');
    if (!owner || !repo) {
      return { success: false, message: 'GitHub 安装需要 user/repo 格式' };
    }

    if (options?.dryRun) {
      return { success: true, message: `[dry-run] 从 GitHub 下载 ${owner}/${repo}` };
    }

    const apiResult = exec(`gh release view --repo ${owner}/${repo} --json tagName`, { timeout: 15000 });
    if (apiResult.exitCode !== 0) {
      return { success: false, message: `无法获取 ${owner}/${repo} 的 Release 信息，请确认仓库名和 gh CLI 可用` };
    }

    let tag: string;
    try {
      tag = JSON.parse(apiResult.stdout).tagName;
    } catch {
      tag = options?.version || 'latest';
    }

    const result = exec(`gh release download ${tag} --repo ${owner}/${repo} --dir "%TEMP%\\cli-manager-install"`, { timeout: 120000 });

    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? `${repo} 下载成功，请手动解压并配置 PATH` : `下载失败: ${result.stderr}`,
    };
  }

  async uninstall(_name: string): Promise<InstallResult> {
    return { success: false, message: 'GitHub 安装的工具需要手动卸载' };
  }

  async checkInstalled(name: string): Promise<boolean> {
    const result = exec(`where ${name}`, { timeout: 5000 });
    return result.exitCode === 0;
  }

  async getVersion(name: string): Promise<string | null> {
    const result = exec(`${name} --version`, { timeout: 5000 });
    if (result.exitCode !== 0) return null;
    const match = result.stdout.match(/(\d+\.\d+\.\d+[\w.-]*)/);
    return match ? match[1] : null;
  }
}
