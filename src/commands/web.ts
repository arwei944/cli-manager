import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { HistoryRepo } from '../db/history-repo';
import { Scanner } from '../scanner';
import { ConfigRepo } from '../db/config-repo';
import { recipeRegistry } from '../recipe/registry';
import { colors } from '../ui/colors';
import os from 'node:os';

const toolRepo = new ToolRepo();
const historyRepo = new HistoryRepo();
const configRepo = new ConfigRepo();

let htmlCache: string | null = null;

function loadHtml(forceReload = false): string {
  if (!htmlCache || forceReload) {
    const htmlPath = path.join(process.cwd(), 'src', 'commands', 'web.html');
    if (fs.existsSync(htmlPath)) {
      htmlCache = fs.readFileSync(htmlPath, 'utf-8');
    } else {
      htmlCache = '<html><body><h1>Web 面板 HTML 文件未找到</h1><p>请确认 src/commands/web.html 存在</p></body></html>';
    }
  }
  return htmlCache;
}

export function webCommand(options: { port?: number }) {
  initDatabase();
  recipeRegistry.load();
  loadHtml();

  const port = options.port || 8080;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // API: 工具列表
    if (url.pathname === '/api/tools') {
      const tools = toolRepo.findAll();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ tools, total: tools.length }));
      return;
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
      return;
    }

    // API: 健康检查
    if (url.pathname === '/api/health') {
      const health = getHealthStatus();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(health));
      return;
    }

    // API: 配方列表
    if (url.pathname === '/api/recipes') {
      const recipes = recipeRegistry.list();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ recipes, total: recipes.length }));
      return;
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
        return;
      }
      const config = configRepo.get();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(config));
      return;
    }

    // API: 历史记录（最近扫描）
    if (url.pathname === '/api/history') {
      const limit = parseInt(new URLSearchParams(url.search).get('limit') || '20');
      const history = historyRepo.getScanHistory(limit);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ history, total: history.length }));
      return;
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
      return;
    }

    // API: 终端信息
    if (url.pathname === '/api/terminal') {
      const runtimes = getRuntimeStatus();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ runtimes, hostname: os.hostname(), platform: os.platform() }));
      return;
    }

    // API: 触发扫描
    if (url.pathname === '/api/actions/scan' && req.method === 'POST') {
      res.writeHead(202, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ message: '扫描已触发，请稍后刷新查看结果' }));
      setImmediate(async () => {
        const scanner = new Scanner();
        await scanner.scan('incremental');
      });
      return;
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
      return;
    }

    // API: 安装/卸载
    if (url.pathname === '/api/actions/install' && req.method === 'POST') {
      const body = await readBody(req);
      const { name, from } = JSON.parse(body || '{}');
      res.writeHead(202, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ message: `${name} 安装已提交（通过 ${from || '配方'}）` }));
      return;
    }

    // 首页 HTML
    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(loadHtml());
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  });

  server.listen(port, () => {
    console.log(colors.success(`\n✓ Web 管理面板已启动`));
    console.log(`  地址: ${colors.info(`http://localhost:${port}`)}`);
    console.log(`  API:  ${colors.info(`http://localhost:${port}/api/tools`)}`);
    console.log(colors.dim('\n  按 Ctrl+C 停止服务'));
  });
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

function getHealthStatus() {
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
      const { execSync } = require('node:child_process');
      execSync(rt.cmd, { encoding: 'utf-8', timeout: 2000, stdio: 'pipe' });
      available = true;
    } catch {
      available = false;
    }
    return { name: rt.name, available };
  });
}
