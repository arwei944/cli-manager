import { exec } from '../utils/exec';
import type { Installer, InstallOptions, InstallResult } from './index';

export class NpmInstaller implements Installer {
  readonly source = 'npm' as const;

  async install(name: string, options?: InstallOptions): Promise<InstallResult> {
    if (options?.dryRun) {
      return { success: true, message: `[dry-run] npm install -g ${name}${options.version ? `@${options.version}` : ''}` };
    }
    const versionFlag = options?.version ? `@${options.version}` : '';
    const result = exec(`npm install -g ${name}${versionFlag}`, { timeout: 120000 });
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? `${name} 安装成功` : `安装失败: ${result.stderr}`,
    };
  }

  async uninstall(name: string): Promise<InstallResult> {
    const result = exec(`npm uninstall -g ${name}`, { timeout: 60000 });
    return {
      success: result.exitCode === 0,
      message: result.exitCode === 0 ? `${name} 卸载成功` : `卸载失败: ${result.stderr}`,
    };
  }

  async checkInstalled(name: string): Promise<boolean> {
    const result = exec(`npm list -g ${name} --depth=0`, { timeout: 8000 });
    return result.exitCode === 0;
  }

  async getVersion(name: string): Promise<string | null> {
    // 使用 npm view 更可靠且快速
    const result = exec(`npm view ${name} version --registry=https://registry.npmmirror.com`, { timeout: 5000 });
    if (result.exitCode !== 0) return null;
    return result.stdout.trim() || null;
  }
}
