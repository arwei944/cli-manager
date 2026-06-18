import { scanPathDirectories, pathEntryToToolInfo } from './path-scanner';
import { scanNpmGlobalPackages } from './npm-scanner';
import { scanPipPackages } from './pip-scanner';
import { extractVersion } from './version-extractor';
import { classifySource, autoCategorize, deduplicateTools } from './metadata';
import { ToolRepo } from '../db/tool-repo';
import { HistoryRepo } from '../db/history-repo';
import { createSpinner } from '../ui/spinner';
import type { ToolInfo, ScanResult, ScanType } from '../types';

const BATCH_SIZE = 10;

export class Scanner {
  private toolRepo = new ToolRepo();
  private historyRepo = new HistoryRepo();

  async scan(scanType: ScanType = 'incremental'): Promise<ScanResult> {
    const startedAt = new Date().toISOString();
    const spinner = createSpinner('扫描 PATH 目录...');

    try {
      spinner.update('扫描 PATH 目录...');
      const pathEntries = scanPathDirectories();
      spinner.update(`PATH 中发现 ${pathEntries.length} 个文件`);

      const npmTools = scanNpmGlobalPackages();
      spinner.update(`npm 全局包: ${npmTools.length}`);

      const pipTools = scanPipPackages();
      spinner.update(`pip 包: ${pipTools.length}`);

      spinner.update('提取版本号...');
      const allTools: ToolInfo[] = [];

      for (let i = 0; i < pathEntries.length; i += BATCH_SIZE) {
        const batch = pathEntries.slice(i, i + BATCH_SIZE);
        for (const entry of batch) {
          const version = extractVersion(entry.fullPath, entry.name);
          const source = classifySource(
            entry.fullPath,
            new Set(npmTools.map(t => t.fullPath)),
            new Set(pipTools.map(t => t.fullPath)),
          );
          const category = autoCategorize(entry.name, entry.fullPath);
          allTools.push(pathEntryToToolInfo(entry, source, version, category));
        }
      }

      const npmPaths = new Set(npmTools.map(t => t.fullPath));
      const pipPaths = new Set(pipTools.map(t => t.fullPath));

      for (const tool of npmTools) {
        if (!npmPaths.has(tool.fullPath)) allTools.push(tool);
      }
      for (const tool of pipTools) {
        if (!pipPaths.has(tool.fullPath)) allTools.push(tool);
      }

      const deduplicated = deduplicateTools(allTools);
      spinner.update(`去重后: ${deduplicated.length} 个工具`);

      let added = 0;
      let removed = 0;
      let changed = 0;

      if (scanType === 'full') {
        const existing = this.toolRepo.findAll();
        const existingIds = new Set(existing.map(t => t.id));
        const newIds = new Set(deduplicated.map(t => t.id));

        for (const tool of deduplicated) {
          if (!existingIds.has(tool.id)) added++;
          else {
            const old = existing.find(e => e.id === tool.id);
            if (old && (old.version !== tool.version || old.fileSize !== tool.fileSize)) changed++;
          }
        }
        for (const tool of existing) {
          if (!newIds.has(tool.id)) removed++;
        }

        for (const tool of existing) {
          if (!newIds.has(tool.id)) {
            this.toolRepo.delete(tool.id);
          }
        }
      }

      for (const tool of deduplicated) {
        this.toolRepo.upsert(tool);
      }

      const completedAt = new Date().toISOString();
      const result: ScanResult = {
        scanType,
        startedAt,
        completedAt,
        totalFound: deduplicated.length,
        added,
        removed,
        changed,
        errors: [],
      };

      this.historyRepo.addScanHistory(result);
      spinner.succeed(`扫描完成: 共 ${deduplicated.length} 个工具`);

      return result;
    } catch (error) {
      spinner.fail('扫描失败');
      return {
        scanType,
        startedAt,
        completedAt: new Date().toISOString(),
        totalFound: 0,
        added: 0,
        removed: 0,
        changed: 0,
        errors: [String(error)],
      };
    }
  }
}
