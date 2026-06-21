import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import type { ToolRepo } from '../db/tool-repo';
import type { HistoryRepo } from '../db/history-repo';
import type { ConfigRepo } from '../db/config-repo';
import type { RecipeRegistry } from '../recipe/registry';
import { Scanner } from '../scanner';

export interface ApiDeps {
  toolRepo: ToolRepo;
  historyRepo: HistoryRepo;
  configRepo: ConfigRepo;
  recipeRegistry: RecipeRegistry;
}

/**
 * 创建 API 请求处理器
 * 返回 true 表示已处理，false 表示未匹配（由调用方继续处理）
 */
export function createApiHandler(deps: ApiDeps) {
  const { toolRepo, historyRepo, configRepo, recipeRegistry } = deps;

  return async function handleApiRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    url: URL,
  ): Promise<boolean> {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return true;
    }

    // API: 工具列表
    if (url.pathname === '/api/tools') {
      const tools = toolRepo.findAll();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ tools, total: tools.length }));
      return true;
    }

    // API: 统计信息
    if (url.pathname === '/api/stats') {
      const tools = toolRepo.findAll();
      const bySource = toolRepo.countBySource();
      const byCategory = toolRepo.countByCategory();
      const pinned = tools.filter(t => t.isPinned).length;
      const noVersion = tools.filter(t => !t.version).length;
      const totalSize = tools.reduce((acc, t) => acc + t.fileSize, 0);
      const lastScan = historyRepo.getLastScan();

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        total: tools.length,
        bySource,
        byCategory,
        pinned,
        noVersion,
        totalSize,
        lastScan: lastScan ? { time: lastScan.startedAt, total: lastScan.totalFound } : null,
      }));
      return true;
    }

    // API: 健康检查
    if (url.pathname === '/api/health') {
      const health = getHealthStatus(toolRepo);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(health));
      return true;
    }

    // API: 配方列表
    if (url.pathname === '/api/recipes') {
      const recipes = recipeRegistry.list();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ recipes, total: recipes.length }));
      return true;
    }

    // API: 配置信息
    if (url.pathname === '/api/config') {
      if (req.method === 'POST') {
        const body = await readBody(req);
        try {
          const updates = JSON.parse(body || '{}');
          configRepo.set(updates);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ message: '配置已保存（已写入 SQLite）' }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ message: '配置格式错误' }));
        }
        return true;
      }
      const config = configRepo.get();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(config));
      return true;
    }

    // API: 历史记录（最近扫描）
    if (url.pathname === '/api/history') {
      const limit = parseInt(new URLSearchParams(url.search).get('limit') || '20');
      const history = historyRepo.getScanHistory(limit);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ history, total: history.length }));
      return true;
    }

    // API: PATH 信息
    if (url.pathname === '/api/path') {
      const pathEnv = process.env.PATH || '';
      const dirs = pathEnv.split(/[;:]/).filter(Boolean);
      const dirsWithStatus = dirs.slice(0, 50).map((dir, i) => ({
        index: i + 1,
        path: dir,
        exists: fs.existsSync(dir),
      }));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ dirs: dirsWithStatus, total: dirs.length }));
      return true;
    }

    // API: 终端信息
    if (url.pathname === '/api/terminal') {
      const runtimes = getRuntimeStatus();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ runtimes, hostname: os.hostname(), platform: os.platform() }));
      return true;
    }

    // API: 触发扫描
    if (url.pathname === '/api/actions/scan' && req.method === 'POST') {
      res.writeHead(202, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ message: '扫描已触发，请稍后刷新查看结果' }));
      setImmediate(async () => {
        const scanner = new Scanner();
        await scanner.scan('incremental');
      });
      return true;
    }

    // API: 触发备份
    if (url.pathname === '/api/actions/backup' && req.method === 'POST') {
      try {
        const backupDir = path.join(os.homedir(), '.cli-manager', 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const tools = toolRepo.findAll();
        const backup = {
          exportedAt: new Date().toISOString(),
          version: '0.1.0',
          tools: tools.map(t => ({
            name: t.name, version: t.version, source: t.source,
            category: t.category, isPinned: t.isPinned, pinnedVersion: t.pinnedVersion,
          })),
        };
        const filename = path.join(backupDir, `cli-manager-backup-${new Date().toISOString().slice(0, 10)}.json`);
        fs.writeFileSync(filename, JSON.stringify(backup, null, 2), 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ message: `备份成功: ${filename}`, tools: tools.length }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ message: `备份失败: ${e}` }));
      }
      return true;
    }

    // API: 安装/卸载
    if (url.pathname === '/api/actions/install' && req.method === 'POST') {
      const body = await readBody(req);
      const { name, from } = JSON.parse(body || '{}');
      res.writeHead(202, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ message: `${name} 安装已提交（通过 ${from || '配方'}）` }));
      return true;
    }

    // API: 工具详情
    if (url.pathname.match(/^\/api\/tools\/[^/]+$/) && req.method === 'GET') {
      const id = decodeURIComponent(url.pathname.split('/')[3]);
      const tool = toolRepo.findById(id);
      if (!tool) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ message: 'Tool not found' }));
        return true;
      }
      const versionHistory = historyRepo.getVersionHistory(tool.name, 10);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ tool, versionHistory }));
      return true;
    }

    // API: 锁定工具
    if (url.pathname.match(/^\/api\/tools\/[^/]+\/pin$/) && req.method === 'POST') {
      const id = decodeURIComponent(url.pathname.split('/')[3]);
      const tool = toolRepo.findById(id);
      if (!tool) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ message: 'Tool not found' }));
        return true;
      }
      const body = await readBody(req);
      const payload = JSON.parse(body || '{}');
      const version = payload.version || tool.version || '';
      toolRepo.updatePinStatus(tool.name, true, version);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ message: `${tool.name} pinned to ${version || '(current)'}` }));
      return true;
    }

    // API: 解锁工具
    if (url.pathname.match(/^\/api\/tools\/[^/]+\/unpin$/) && req.method === 'POST') {
      const id = decodeURIComponent(url.pathname.split('/')[3]);
      const tool = toolRepo.findById(id);
      if (!tool) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ message: 'Tool not found' }));
        return true;
      }
      toolRepo.updatePinStatus(tool.name, false, null);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ message: `${tool.name} unpinned` }));
      return true;
    }

    return false; // 未匹配，由调用方处理
  };
}

// ─── 辅助函数 ────────────────────────────────────────────

async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

function getHealthStatus(toolRepo: ToolRepo) {
  const issues: string[] = [];
  const warnings: string[] = [];

  const pathEnv = process.env.PATH || '';
  const dirs = pathEnv.split(/[;:]/).filter(Boolean);
  const invalid = dirs.filter(d => !fs.existsSync(d));
  if (invalid.length > 0) issues.push(`${invalid.length} 个无效 PATH 条目`);

  const tools = toolRepo.findAll();
  const nameCount = new Map<string, number>();
  for (const t of tools) nameCount.set(t.name, (nameCount.get(t.name) || 0) + 1);
  const conflicts = Array.from(nameCount.entries()).filter(([, c]) => c > 1);
  if (conflicts.length > 0) warnings.push(`${conflicts.length} 个工具有多个版本`);

  const runtimes = getRuntimeStatus();
  for (const rt of runtimes) {
    if (!rt.available) warnings.push(`${rt.name} 未安装或不在 PATH 中`);
  }

  return {
    status: issues.length === 0 ? 'healthy' : 'degraded',
    issues,
    warnings,
    summary: {
      tools: tools.length,
      pinned: tools.filter(t => t.isPinned).length,
      noVersion: tools.filter(t => !t.version).length,
      dirs: dirs.length,
      invalidDirs: invalid.length,
    },
  };
}

function getRuntimeStatus() {
  const runtimes = [
    { name: 'Node.js', cmd: 'node --version' },
    { name: 'npm', cmd: 'npm --version' },
    { name: 'Python', cmd: 'python --version' },
    { name: 'Git', cmd: 'git --version' },
  ];
  return runtimes.map(rt => {
    let available = false;
    try {
      execSync(rt.cmd, { encoding: 'utf-8', timeout: 2000, stdio: 'pipe' });
      available = true;
    } catch {
      available = false;
    }
    return { name: rt.name, available };
  });
}
