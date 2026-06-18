import path from 'node:path';
import fs from 'node:fs';
import { getPathEnv, getPathSeparator, isWindows } from './platform';

export function parsePathDirectories(): string[] {
  const pathEnv = getPathEnv();
  const separator = getPathSeparator();
  const dirs = pathEnv.split(separator).map(d => d.trim()).filter(Boolean);

  const seen = new Set<string>();
  return dirs.filter(dir => {
    const normalized = path.resolve(dir);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function resolveFullPath(dir: string): string {
  return path.resolve(dir);
}

export function findExecutablesInDir(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() || entry.isSymbolicLink()) {
        const fullPath = path.join(dir, entry.name);
        if (isExecutable(entry.name, fullPath)) {
          results.push(fullPath);
        }
      }
    }
  } catch {
    // 目录不可读则跳过
  }
  return results;
}

export function isExecutable(filename: string, fullPath: string): boolean {
  if (isWindows()) {
    const ext = path.extname(filename).toLowerCase();
    return ['.exe', '.cmd', '.bat', '.ps1'].includes(ext) || (!ext && hasExecutableFlag(fullPath));
  }
  return hasExecutableFlag(fullPath);
}

function hasExecutableFlag(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    return !!(stat.mode & 0o111);
  } catch {
    return false;
  }
}

export function getFileExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext) return ext.slice(1);
  return 'script';
}
