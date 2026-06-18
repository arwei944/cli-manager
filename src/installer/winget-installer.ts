import { exec } from '../utils/exec';
import type { Installer, InstallOptions, InstallResult } from './index';

export class WingetInstaller implements Installer {
  readonly source = 'winget' as const;

  async install(name: string, options?: InstallOptions): Promise<InstallResult> {
    if (options?.dryRun) {
      return { success: true, message: `[dry-run] winget install ${name}` };
    }
    const result = exec(`winget install --name "${name}" --accept-package-agreements --accept-source-agreements`, { timeout: 120000 });
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? `${name} 安装成功` : `安装失败: ${result.stderr}`,
    };
  }

  async uninstall(name: string): Promise<InstallResult> {
    const result = exec(`winget uninstall --name "${name}"`, { timeout: 60000 });
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? `${name} 卸载成功` : `卸载失败: ${result.stderr}`,
    };
  }

  async checkInstalled(name: string): Promise<boolean> {
    const result = exec(`winget list --name "${name}"`, { timeout: 10000 });
    return result.exitCode === 0 && result.stdout.includes(name);
  }

  async getVersion(name: string): Promise<string | null> {
    const result = exec(`winget list --name "${name}"`, { timeout: 10000 });
    if (result.exitCode !== 0) return null;
    const lines = result.stdout.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes(name.toLowerCase())) {
        const parts = line.trim().split(/\s+/);
        return parts[parts.length - 1] || null;
      }
    }
    return null;
  }
}
