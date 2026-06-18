import { exec } from '../utils/exec';
import type { Installer, InstallOptions, InstallResult } from './index';

export class ChocoInstaller implements Installer {
  readonly source = 'choco' as const;

  async install(name: string, options?: InstallOptions): Promise<InstallResult> {
    if (options?.dryRun) {
      return { success: true, message: `[dry-run] choco install ${name}` };
    }
    const result = exec(`choco install ${name} -y`, { timeout: 120000 });
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? `${name} 安装成功` : `安装失败: ${result.stderr}`,
    };
  }

  async uninstall(name: string): Promise<InstallResult> {
    const result = exec(`choco uninstall ${name} -y`, { timeout: 60000 });
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? `${name} 卸载成功` : `卸载失败: ${result.stderr}`,
    };
  }

  async checkInstalled(name: string): Promise<boolean> {
    const result = exec(`choco list ${name} --local-only`, { timeout: 10000 });
    return result.exitCode === 0 && result.stdout.includes(name);
  }

  async getVersion(name: string): Promise<string | null> {
    const result = exec(`choco list ${name} --local-only`, { timeout: 10000 });
    if (result.exitCode !== 0) return null;
    const match = result.stdout.match(new RegExp(`${name}\\s+(\\S+)`, 'i'));
    return match ? match[1] : null;
  }
}
