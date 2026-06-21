import http from 'node:http';
import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { HistoryRepo } from '../db/history-repo';
import { ConfigRepo } from '../db/config-repo';
import { recipeRegistry } from '../recipe/registry';
import { colors } from '../ui/colors';
import { createApiHandler } from '../web/api-handler';
// web-templates/assets.ts 由 scripts/bundle-html.js 在构建时自动生成
import { INDEX_HTML } from '../web-templates/assets';

const toolRepo = new ToolRepo();
const historyRepo = new HistoryRepo();
const configRepo = new ConfigRepo();

let htmlCache: string | null = null;

function loadHtml(_forceReload?: boolean): string {
  if (!htmlCache) {
    htmlCache = INDEX_HTML;
  }
  return htmlCache;
}

export function webCommand(options: { port?: number }) {
  initDatabase();
  recipeRegistry.load();
  loadHtml();

  const port = options.port || 8080;
  const apiHandler = createApiHandler({ toolRepo, historyRepo, configRepo, recipeRegistry });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);

    // 先尝试 API 路由
    const handled = await apiHandler(req, res, url);
    if (handled) return;

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
