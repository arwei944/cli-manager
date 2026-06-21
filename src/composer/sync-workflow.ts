import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { IToolRepository } from '../ports/tool-repo';
import type { ToolInfo } from '../types';

const SYNC_DIR = path.join(os.homedir(), '.cli-manager', 'sync');

export interface SyncSnapshot {
  exportedAt: string;
  version: string;
  tools: Array<{
    name: string;
    version: string | null;
    source: string;
    category: string;
  }>;
}

/** 同步编排 —— 工具清单的导入导出 */
export class SyncWorkflow {
  constructor(private toolRepo: IToolRepository) {}

  /** 导出快照到本地文件 */
  push(): string {
    if (!fs.existsSync(SYNC_DIR)) {
      fs.mkdirSync(SYNC_DIR, { recursive: true });
    }

    const tools = this.toolRepo.findAll();
    const snapshot: SyncSnapshot = {
      exportedAt: new Date().toISOString(),
      version: '0.1.0',
      tools: tools.map(t => ({
        name: t.name,
        version: t.version,
        source: t.source,
        category: t.category,
      })),
    };

    const filename = `cli-manager-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    const filePath = path.join(SYNC_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
    return filePath;
  }

  /** 列出本地所有快照文件 */
  listSnapshots(): string[] {
    if (!fs.existsSync(SYNC_DIR)) return [];
    return fs.readdirSync(SYNC_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();
  }

  /** 从快照文件恢复 */
  pull(snapshotFile: string): SyncSnapshot | null {
    const filePath = path.isAbsolute(snapshotFile)
      ? snapshotFile
      : path.join(SYNC_DIR, snapshotFile);

    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as SyncSnapshot;
  }
}
