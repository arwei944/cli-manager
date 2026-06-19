import { execSync } from 'node:child_process';
import semver from 'semver';
import type { UpstreamVersion } from '../types';

export class UpstreamChecker {
  getLatestVersion(name: string, source: string, currentVersion?: string): UpstreamVersion | null {
    try {
      switch (source) {
        case 'npm': {
          const result = execSync(`npm view ${name} version --registry=https://registry.npmmirror.com`, {
            encoding: 'utf-8', timeout: 8000, stdio: ['ignore', 'pipe', 'ignore'],
          });
          const v = result.trim();
          return v ? { name, source, currentVersion: currentVersion ?? null, latestVersion: v, hasUpdate: false, detectable: true } : null;
        }
        case 'pip': {
          const result = execSync(`pip index versions ${name}`, {
            encoding: 'utf-8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'],
          });
          const match = result.match(/\(([^)]+)\)/);
          if (match && match[1]) {
            const versions = match[1].split(', ');
            const latest = versions[0]?.trim();
            if (latest) return { name, source, currentVersion: currentVersion ?? null, latestVersion: latest, hasUpdate: false, detectable: true };
          }
          return null;
        }
        case 'gh': {
          const [owner, repo] = name.split('/');
          if (!owner || !repo) return { name, source, currentVersion: currentVersion ?? null, latestVersion: null, hasUpdate: false, detectable: false };
          const apiResult = execSync(
            `gh release view --repo ${owner}/${repo} --json tagName --jq .tagName`,
            { encoding: 'utf-8', timeout: 12000, stdio: ['ignore', 'pipe', 'ignore'] }
          );
          const tag = apiResult.trim();
          if (!tag) return { name, source, currentVersion: currentVersion ?? null, latestVersion: null, hasUpdate: false, detectable: true };
          const cleaned = semver.valid(semver.coerce(tag)?.version ?? '') ?? tag.replace(/^v/, '');
          return { name, source, currentVersion: currentVersion ?? null, latestVersion: cleaned || null, hasUpdate: false, detectable: true };
        }
        case 'winget':
        case 'scoop':
        case 'choco':
        case 'system':
        case 'manual':
        default:
          return { name, source, currentVersion: currentVersion ?? null, latestVersion: null, hasUpdate: false, detectable: false };
      }
    } catch {
      return { name, source, currentVersion: currentVersion ?? null, latestVersion: null, hasUpdate: false, detectable: false };
    }
  }

  checkMany(
    tools: Array<{ name: string; source: string; version: string | null }>,
  ): UpstreamVersion[] {
    return tools.map((tool) => {
      if (tool.source === 'system' || tool.source === 'manual') {
        return { name: tool.name, source: tool.source, currentVersion: tool.version, latestVersion: null, hasUpdate: false, detectable: false };
      }
      const info = this.getLatestVersion(tool.name, tool.source, tool.version ?? undefined);
      if (!info) {
        return { name: tool.name, source: tool.source, currentVersion: tool.version, latestVersion: null, hasUpdate: false, detectable: false };
      }
      let hasUpdate = false;
      if (info.latestVersion && tool.version) {
        try { hasUpdate = semver.gt(info.latestVersion, tool.version); } catch { /* ignore */ }
      }
      return { ...info, hasUpdate };
    });
  }
}

export const upstreamChecker = new UpstreamChecker();
