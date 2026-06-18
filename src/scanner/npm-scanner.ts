import fs from 'node:fs';
import path from 'node:path';
import { exec } from '../utils/exec';
import type { ToolInfo, ToolSource } from '../types';
import { createToolId } from './path-scanner';

interface NpmPackage {
  name: string;
  version: string;
  bin?: Record<string, string>;
}

export function scanNpmGlobalPackages(): ToolInfo[] {
  const tools: ToolInfo[] = [];

  try {
    const npmRoot = exec('npm root -g');
    if (npmRoot.exitCode !== 0 || !npmRoot.stdout) return tools;

    const globalDir = npmRoot.stdout.trim();
    if (!fs.existsSync(globalDir)) return tools;

    const packages = fs.readdirSync(globalDir);
    for (const pkgName of packages) {
      if (pkgName.startsWith('.')) continue;

      const pkgJsonPath = path.join(globalDir, pkgName, 'package.json');
      if (!fs.existsSync(pkgJsonPath)) continue;

      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as NpmPackage;
        if (!pkgJson.bin) continue;

        const now = new Date().toISOString();
        for (const [binName, binPath] of Object.entries(pkgJson.bin)) {
          const fullPath = path.resolve(globalDir, pkgName, binPath);
          if (!fs.existsSync(fullPath)) continue;

          const stat = fs.statSync(fullPath);
          tools.push({
            id: createToolId(binName, fullPath),
            name: binName,
            fullPath,
            version: pkgJson.version || null,
            source: 'npm' as ToolSource,
            category: 'dev',
            fileSize: stat.size,
            fileType: 'script',
            isSigned: false,
            modifiedAt: stat.mtime.toISOString(),
            firstDetectedAt: now,
            lastDetectedAt: now,
            isPinned: false,
            pinnedVersion: null,
            pathPriority: 0,
          });
        }
      } catch {
        // 跳过无法解析的包
      }
    }
  } catch {
    // npm 不可用时优雅降级
  }

  return tools;
}
