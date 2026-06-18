import { execSync } from 'node:child_process';
import semver from 'semver';

/**
 * 上游版本检查器：根据安装来源获取上游最新版本
 */
export class UpstreamChecker {
  /**
   * 获取上游最新版本
   * @param name 工具标识
   * @param source 来源类型
   * @param currentVersion 本地已安装版本（可选，用于辅助解析）
   * @returns 上游最新版本字符串，无法获取时返回 null
   */
  getLatestVersion(name: string, source: string, currentVersion?: string): string | null {
    try {
      switch (source) {
        case 'npm': {
          const result = execSync(`npm view ${name} version --registry=https://registry.npmmirror.com`, {
            encoding: 'utf-8',
            timeout: 8000,
            stdio: ['ignore', 'pipe', 'ignore'],
          });
          return result.trim() || null;
        }
        case 'pip': {
          const result = execSync(`pip index versions ${name}`, {
            encoding: 'utf-8',
            timeout: 10000,
            stdio: ['ignore', 'pipe', 'ignore'],
          });
          const match = result.match(/\(([^)]+)\)/);
          if (match && match[1]) {
            const versions = match[1].split(', ');
            const latest = versions[0]?.trim();
            if (latest) return latest;
          }
          return null;
        }
        case 'gh': {
          const [owner, repo] = name.split('/');
          if (!owner || !repo) return null;
          const apiResult = execSync(
            `gh release view --repo ${owner}/${repo} --json tagName --jq .tagName`,
            { encoding: 'utf-8', timeout: 12000, stdio: ['ignore', 'pipe', 'ignore'] }
          );
          const tag = apiResult.trim();
          if (!tag) return null;
          const cleaned = semver.valid(semver.coerce(tag)?.version ?? '') ?? tag.replace(/^v/, '');
          return cleaned || (currentVersion ?? null) || null;
        }
        case 'winget':
        case 'scoop':
        case 'choco': {
          return null;
        }
        case 'system':
        case 'manual':
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * 批量检查工具上游版本
   */
  checkMany(
    tools: Array<{ name: string; source: string; version: string | null }>,
  ): Array<{ name: string; source: string; currentVersion: string | null; latestVersion: string | null; hasUpdate: boolean }> {
    const results: Array<{
      name: string;
      source: string;
      currentVersion: string | null;
      latestVersion: string | null;
      hasUpdate: boolean;
    }> = [];

    for (const tool of tools) {
      if (tool.source === 'system' || tool.source === 'manual') continue;
      const latest = this.getLatestVersion(tool.name, tool.source, tool.version ?? undefined);
      let hasUpdate = false;
      if (latest && tool.version) {
        try {
          hasUpdate = semver.gt(latest, tool.version);
        } catch {
          hasUpdate = false;
        }
      }
      results.push({
        name: tool.name,
        source: tool.source,
        currentVersion: tool.version,
        latestVersion: latest,
        hasUpdate,
      });
    }

    return results;
  }
}

export const upstreamChecker = new UpstreamChecker();
