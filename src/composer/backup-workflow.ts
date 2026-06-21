import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { IToolRepository } from '../ports/tool-repo';
import type { ToolInfo } from '../types';

const BACKUP_DIR = path.join(os.homedir(), '.cli-manager', 'backups');

export interface BackupManifest {
  exportedAt: string;
  version: string;
  tools: Array<{
    name: string;
    version: string | null;
    source: string;
    category: string;
    isPinned: boolean;
    pinnedVersion: string | null;
  }>;
}

/** 备份编排 —— 工具清单的备份与恢复 */
export class BackupWorkflow {
  constructor(private toolRepo: IToolRepository) {}

  /** 导出备份 */
  backup(outputPath?: string): { path: string; count: number } {
    const dir = outputPath || BACKUP_DIR;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tools = this.toolRepo.findAll();
    const manifest: BackupManifest = {
      exportedAt: new Date().toISOString(),
      version: '0.1.0',
      tools: tools.map(t => ({
        name: t.name,
        version: t.version,
        source: t.source,
        category: t.category,
        isPinned: t.isPinned,
        pinnedVersion: t.pinnedVersion,
      })),
    };

    const filename = `cli-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf-8');
    return { path: filePath, count: tools.length };
  }

  /** 读取备份文件 */
  load(filePath: string): BackupManifest | null {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as BackupManifest;
  }
}
