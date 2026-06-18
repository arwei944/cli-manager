import { exec } from '../utils/exec';
import type { Installer, InstallOptions, InstallResult } from './index';

export class PipInstaller implements Installer {
  readonly source = 'pip' as const;

  async install(name: string, options?: InstallOptions): Promise<InstallResult> {
    if (options?.dryRun) {
      return { success: true, message: `[dry-run] pip install ${name}${options.version ? `==${options.version}` : ''}` };
    }
    const versionFlag = options?.version ? `==${options.version}` : '';
    const result = exec(`pip install ${name}${versionFlag}`, { timeout: 120000 });
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? `${name} 安装成功` : `安装失败: ${result.stderr}`,
    };
  }

  async uninstall(name: string): Promise<InstallResult> {
    const result = exec(`pip uninstall -y ${name}`, { timeout: 60000 });
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? `${name} 卸载成功` : `卸载失败: ${result.stderr}`,
    };
  }

  async checkInstalled(name: string): Promise<boolean> {
    const result = exec(`pip show ${name}`, { timeout: 10000 });
    return result.exitCode === 0;
  }

  async getVersion(name: string): Promise<string | null> {
    const result = exec(`pip show ${name}`, { timeout: 10000 });
    if (result.exitCode !== 0) return null;
    const match = result.stdout.match(/^Version:\s*(.+)$/m);
    return match ? match[1].trim() : null;
  }
}
