import { exec } from '../utils/exec';
import type { Installer, InstallOptions, InstallResult } from './index';

export class ScoopInstaller implements Installer {
  readonly source = 'scoop' as const;

  async install(name: string, options?: InstallOptions): Promise<InstallResult> {
    if (options?.dryRun) {
      return { success: true, message: `[dry-run] scoop install ${name}` };
    }
    const result = exec(`scoop install ${name}`, { timeout: 120000 });
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? `${name} 安装成功` : `安装失败: ${result.stderr}`,
    };
  }

  async uninstall(name: string): Promise<InstallResult> {
    const result = exec(`scoop uninstall ${name}`, { timeout: 60000 });
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? `${name} 卸载成功` : `卸载失败: ${result.stderr}`,
    };
  }

  async checkInstalled(name: string): Promise<boolean> {
    const result = exec(`scoop which ${name}`, { timeout: 10000 });
    return result.exitCode === 0;
  }

  async getVersion(name: string): Promise<string | null> {
    const result = exec(`scoop info ${name}`, { timeout: 10000 });
    if (result.exitCode !== 0) return null;
    const match = result.stdout.match(/^Version\s*:\s*(.+)$/m);
    return match ? match[1].trim() : null;
  }
}
