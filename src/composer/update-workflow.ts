import semver from 'semver';
import type { IInstallerRegistry } from '../ports/installer-registry';
import type { IToolRepository } from '../ports/tool-repo';
import type { IHistoryRepository } from '../ports/history-repo';
import type { IScanner } from '../ports/scanner';
import type { ToolSource } from '../types';

export interface UpdateResult {
  name: string;
  success: boolean;
  currentVersion?: string | null;
  latestVersion?: string | null;
  message: string;
}

/** 更新编排 —— 版本检查 + 更新 + 历史记录 */
export class UpdateWorkflow {
  constructor(
    private installerRegistry: IInstallerRegistry,
    private toolRepo: IToolRepository,
    private historyRepo: IHistoryRepository,
    private scanner: IScanner,
  ) {}

  async updateSingle(name: string, dryRun?: boolean): Promise<UpdateResult> {
    const tools = this.toolRepo.findByName(name);
    if (tools.length === 0) {
      return { name, success: false, message: `未找到工具: ${name}` };
    }

    const tool = tools[0];
    if (tool.isPinned) {
      return { name, success: true, message: `${name} 已锁定，跳过更新` };
    }

    const source = tool.source as ToolSource;
    const installer = this.installerRegistry.get(source);
    if (!installer) {
      return { name, success: false, message: `不支持的更新源: ${source}` };
    }

    try {
      const currentVersion = tool.version;
      let latestVersion: string | null = null;
      try {
        latestVersion = await installer.getVersion(name);
      } catch {
        // 忽略版本获取失败
      }

      if (!latestVersion) {
        return { name, success: true, message: `${name}: 无法获取最新版本` };
      }

      const hasUpdate = currentVersion
        ? semver.valid(currentVersion) && semver.valid(latestVersion)
          ? semver.lt(currentVersion, latestVersion)
          : currentVersion !== latestVersion
        : true;

      if (!hasUpdate) {
        return { name, success: true, message: `${name} 已是最新版本 (${currentVersion})` };
      }

      if (dryRun) {
        return { name, success: true, message: `[dry-run] ${name}: ${currentVersion} → ${latestVersion}`, currentVersion, latestVersion };
      }

      const result = await installer.install(name, { version: latestVersion });
      if (result.success) {
        this.historyRepo.addVersionChange(name, currentVersion, latestVersion, 'update');
        await this.scanner.scan('incremental');
        return { name, success: true, message: `${name}: ${currentVersion} → ${latestVersion}`, currentVersion, latestVersion };
      }

      return { name, success: false, message: `更新失败: ${result.message}` };
    } catch (error) {
      return { name, success: false, message: `更新异常: ${error}` };
    }
  }

  async updateBatch(dryRun?: boolean): Promise<UpdateResult[]> {
    const tools = this.toolRepo.findAll();
    const results: UpdateResult[] = [];

    for (const tool of tools) {
      if (tool.isPinned) continue;
      if (!tool.version) continue;
      const source = tool.source as ToolSource;
      if (!this.installerRegistry.hasSource(source)) continue;

      const result = await this.updateSingle(tool.name, dryRun);
      results.push(result);
    }

    return results;
  }

  async switchVersion(name: string, version: string): Promise<UpdateResult> {
    const tools = this.toolRepo.findByName(name);
    if (tools.length === 0) {
      return { name, success: false, message: `未找到工具: ${name}` };
    }

    const tool = tools[0];
    const source = tool.source as ToolSource;
    const installer = this.installerRegistry.get(source);
    if (!installer) {
      return { name, success: false, message: `工具来源 (${source}) 不支持版本切换` };
    }

    try {
      const currentVersion = tool.version;
      const result = await installer.install(name, { version });

      if (result.success) {
        this.historyRepo.addVersionChange(name, currentVersion, version, 'switch');
        await this.scanner.scan('incremental');
        return { name, success: true, message: `${name} 已切换到版本 ${version}`, currentVersion, latestVersion: version };
      }

      return { name, success: false, message: `版本切换失败: ${result.message}` };
    } catch (error) {
      return { name, success: false, message: `版本切换异常: ${error}` };
    }
  }

  async rollback(name: string): Promise<UpdateResult> {
    const history = this.historyRepo.getVersionHistory(name, 10);
    if (history.length === 0) {
      return { name, success: false, message: `${name} 没有版本变更记录` };
    }

    const lastChange = history.find(h => h.operation === 'update' || h.operation === 'switch');
    if (!lastChange || !lastChange.previousVersion) {
      return { name, success: false, message: `${name} 没有可回退的版本` };
    }

    return this.switchVersion(name, lastChange.previousVersion);
  }
}
