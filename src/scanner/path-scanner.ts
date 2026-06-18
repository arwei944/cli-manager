import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parsePathDirectories, findExecutablesInDir, getFileExtension, isWindows } from '../utils';
import type { ToolInfo, FileType, ToolSource } from '../types';

export interface PathScanEntry {
  fullPath: string;
  name: string;
  fileSize: number;
  fileType: FileType;
  modifiedAt: string;
  pathPriority: number;
}

export function scanPathDirectories(): PathScanEntry[] {
  const dirs = parsePathDirectories();
  const entries: PathScanEntry[] = [];
  const seen = new Set<string>();

  for (let priority = 0; priority < dirs.length; priority++) {
    const dir = dirs[priority];
    const files = findExecutablesInDir(dir);
    for (const fullPath of files) {
      if (seen.has(fullPath)) continue;
      seen.add(fullPath);

      const name = path.basename(fullPath, path.extname(fullPath));
      try {
        const stat = fs.statSync(fullPath);
        entries.push({
          fullPath,
          name,
          fileSize: stat.size,
          fileType: getFileExtension(path.basename(fullPath)) as FileType,
          modifiedAt: stat.mtime.toISOString(),
          pathPriority: priority,
        });
      } catch {
        // 文件不可读则跳过
      }
    }
  }

  return entries;
}

export function detectSignature(fullPath: string): boolean {
  if (!isWindows()) return false;
  try {
    const { exec } = require('../utils/exec');
    const result = exec(`powershell -Command "(Get-AuthenticodeSignature '${fullPath.replace(/'/g, "''")}').Status"`);
    return result.stdout === 'Valid';
  } catch {
    return false;
  }
}

export function createToolId(name: string, fullPath: string): string {
  const hash = crypto.createHash('md5').update(fullPath).digest('hex').slice(0, 8);
  return `${name}@${hash}`;
}

export function pathEntryToToolInfo(entry: PathScanEntry, source: ToolSource, version: string | null, category: string): ToolInfo {
  const now = new Date().toISOString();
  return {
    id: createToolId(entry.name, entry.fullPath),
    name: entry.name,
    fullPath: entry.fullPath,
    version,
    source,
    category: category as ToolInfo['category'],
    fileSize: entry.fileSize,
    fileType: entry.fileType,
    isSigned: false,
    modifiedAt: entry.modifiedAt,
    firstDetectedAt: now,
    lastDetectedAt: now,
    isPinned: false,
    pinnedVersion: null,
    pathPriority: entry.pathPriority,
  };
}
