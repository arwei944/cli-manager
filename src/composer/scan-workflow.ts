import type { IScanner } from '../ports/scanner';
import type { IPluginManager } from '../ports/plugin-manager';
import type { IHistoryRepository } from '../ports/history-repo';
import type { IToolRepository } from '../ports/tool-repo';
import type { ScanResult, ScanType } from '../types';

/** 扫描编排 —— 组合 Scanner + 插件钩子 + 历史记录 */
export class ScanWorkflow {
  constructor(
    private scanner: IScanner,
    private pluginManager: IPluginManager,
    private historyRepo: IHistoryRepository,
    private toolRepo: IToolRepository,
  ) {}

  async scan(scanType: ScanType = 'incremental'): Promise<ScanResult> {
    await this.pluginManager.runHook('preScan', scanType);
    const result = await this.scanner.scan(scanType);
    await this.pluginManager.runHook('postScan', result);
    return result;
  }

  getStats() {
    const tools = this.toolRepo.findAll();
    return {
      total: tools.length,
      bySource: this.toolRepo.countBySource(),
      byCategory: this.toolRepo.countByCategory(),
      pinned: tools.filter(t => t.isPinned).length,
      noVersion: tools.filter(t => !t.version).length,
      lastScan: this.historyRepo.getLastScan(),
    };
  }
}
