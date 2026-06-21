import type { IVersionManager, VersionInfo, VersionChange } from '../ports/version-manager';
import type { IToolRepository } from '../ports/tool-repo';
import type { IHistoryRepository } from '../ports/history-repo';

/** 版本管理器 —— 版本查询/锁定/历史 */
export class VersionManager implements IVersionManager {
  constructor(
    private toolRepo: IToolRepository,
    private historyRepo: IHistoryRepository,
  ) {}

  getVersionInfo(name: string): VersionInfo | null {
    const tools = this.toolRepo.findByName(name);
    if (tools.length === 0) return null;

    const tool = tools[0];
    return {
      name: tool.name,
      currentVersion: tool.version,
      source: tool.source,
      isPinned: tool.isPinned,
      pinnedVersion: tool.pinnedVersion,
    };
  }

  pin(name: string, version?: string): boolean {
    const tools = this.toolRepo.findByName(name);
    if (tools.length === 0) return false;

    const pinVersion = version || tools[0].version;
    if (!pinVersion) return false;

    this.toolRepo.updatePinStatus(name, true, pinVersion);
    return true;
  }

  unpin(name: string): boolean {
    const tools = this.toolRepo.findByName(name);
    if (tools.length === 0) return false;

    this.toolRepo.updatePinStatus(name, false);
    return true;
  }

  getHistory(name: string, limit = 20): VersionChange[] {
    return this.historyRepo.getVersionHistory(name, limit).map(r => ({
      id: r.id,
      toolName: r.toolName,
      previousVersion: r.previousVersion,
      newVersion: r.newVersion,
      operation: r.operation,
      operatedAt: r.operatedAt,
    }));
  }
}
