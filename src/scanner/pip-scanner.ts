import fs from 'node:fs';
import path from 'node:path';
import { exec } from '../utils/exec';
import { isWindows } from '../utils/platform';
import type { ToolInfo, ToolSource } from '../types';
import { createToolId } from './path-scanner';

interface PipPackage {
  name: string;
  version: string;
  location?: string;
}

export function scanPipPackages(): ToolInfo[] {
  const tools: ToolInfo[] = [];

  try {
    const result = exec('pip list --format=json --disable-pip-version-check', { timeout: 15000 });
    if (result.exitCode !== 0 || !result.stdout) return tools;

    const packages: PipPackage[] = JSON.parse(result.stdout);
    const now = new Date().toISOString();

    for (const pkg of packages) {
      const scriptsDir = findPipScriptsDir(pkg);
      if (!scriptsDir || !fs.existsSync(scriptsDir)) continue;

      const entries = fs.readdirSync(scriptsDir);
      for (const entry of entries) {
        const fullPath = path.join(scriptsDir, entry);
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) continue;

        const ext = path.extname(entry).toLowerCase();
        if (isWindows() && !['.exe', '.cmd', '.bat', '.ps1'].includes(ext)) continue;
        if (!isWindows() && !(stat.mode & 0o111)) continue;

        const name = path.basename(entry, path.extname(entry));
        tools.push({
          id: createToolId(name, fullPath),
          name,
          fullPath,
          version: pkg.version,
          source: 'pip' as ToolSource,
          category: 'dev',
          fileSize: stat.size,
          fileType: ext ? ext.slice(1) as ToolInfo['fileType'] : 'script',
          isSigned: false,
          modifiedAt: stat.mtime.toISOString(),
          firstDetectedAt: now,
          lastDetectedAt: now,
          isPinned: false,
          pinnedVersion: null,
          pathPriority: 0,
        });
      }
    }
  } catch {
    // pip 不可用时优雅降级
  }

  return tools;
}

function findPipScriptsDir(pkg: PipPackage): string | null {
  if (pkg.location && fs.existsSync(pkg.location)) {
    const scriptsDir = path.join(pkg.location, '..', 'Scripts');
    if (fs.existsSync(scriptsDir)) return scriptsDir;

    const binDir = path.join(pkg.location, '..', 'bin');
    if (fs.existsSync(binDir)) return binDir;
  }

  const userBase = exec('python -m site --user-site', { timeout: 5000 });
  if (userBase.exitCode === 0 && userBase.stdout) {
    const sitePackages = userBase.stdout.trim();
    const base = path.resolve(sitePackages, '..');
    const scriptsDir = path.join(base, 'Scripts');
    if (fs.existsSync(scriptsDir)) return scriptsDir;
    const binDir = path.join(base, 'bin');
    if (fs.existsSync(binDir)) return binDir;
  }

  return null;
}
