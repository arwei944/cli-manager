import type { ToolInfo } from '../types';
import { ToolRepo } from '../db/tool-repo';
import { HistoryRepo } from '../db/history-repo';

// 检测 blessed 是否可用：Windows 上通常缺少 ncurses 支持，加载时会抛错
let blessedLib: any = null;
let blessedSupported = false;

try {
  // @ts-ignore - blessed 仅提供 JS 类型
  const mod = require('blessed');
  const testScreen = mod.screen({ smartCSR: true });
  testScreen.destroy();
  blessedLib = mod;
  blessedSupported = true;
} catch {
  blessedSupported = false;
}

export function isBlessedSupported(): boolean {
  return blessedSupported;
}

export function launchBlessedUI(): void {
  if (!blessedSupported || !blessedLib) {
    throw new Error('当前环境不支持 blessed TUI（缺少 ncurses / 终端兼容层）');
  }

  const blessed = blessedLib;
  const screen = blessed.screen({
    smartCSR: true,
    title: 'CLI 工具管理器 - 仪表盘',
    fullUnicode: true,
  });

  const toolRepo = new ToolRepo();
  const historyRepo = new HistoryRepo();

  let tools: ToolInfo[] = [];

  // 左侧面板：工具列表
  const toolsList = blessed.list({
    parent: screen,
    label: ' {bold}{cyan-fg} 工具列表 {/cyan-fg}{/bold} ',
    top: 0,
    left: 0,
    width: '50%',
    height: '70%',
    mouse: true,
    keys: true,
    vi: true,
    border: { type: 'line' },
    scrollbar: {
      ch: ' ',
      style: { fg: 'grey' },
    },
    style: {
      fg: 'white',
      bg: 'black',
      selected: { bg: 'blue', fg: 'white' },
      item: { fg: 'white' },
    },
  });

  // 右上：统计信息（使用 blessed box 组件 + HTML-like 标签）
  const statsBox = blessed.box({
    parent: screen,
    label: ' {bold}{green-fg} 核心指标与分布 {/green-fg}{/bold} ',
    top: 0,
    left: '50%',
    width: '50%',
    height: '70%',
    border: { type: 'line' },
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    style: { fg: 'white', bg: 'black' },
  });

  // 底部面板：日志
  const logBox = blessed.log({
    parent: screen,
    label: ' {bold}{yellow-fg} 近期扫描历史与日志 {/yellow-fg}{/bold} ',
    top: '70%',
    left: 0,
    width: '100%',
    height: '30%',
    border: { type: 'line' },
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    style: { fg: 'white', bg: 'black' },
  });

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} GB`;
  }

  // 构建彩色条形图
  function buildBar(
    label: string,
    count: number,
    maxCount: number,
    color: string,
  ): string {
    const barLen = Math.round((count / maxCount) * 20);
    const filled = '█'.repeat(Math.max(barLen, 1));
    const empty = '░'.repeat(20 - Math.max(barLen, 1));
    return `{${color}-fg}${label.padEnd(10)}{/${color}-fg} ${filled}${empty} {white-fg}${String(count).padStart(5)}{/white-fg}`;
  }

  // 加载所有数据并刷新界面
  function loadData(): void {
    tools = toolRepo.findAll();
    const bySource = toolRepo.countBySource();
    const byCategory = toolRepo.countByCategory();
    const lastScan = historyRepo.getLastScan();

    const pinned = tools.filter(t => t.isPinned).length;
    const noVersion = tools.filter(t => !t.version).length;
    const totalSize = tools.reduce((acc, t) => acc + t.fileSize, 0);

    // 更新工具列表
    const items = tools.map(t => {
      const pin = t.isPinned ? '📌' : '  ';
      const ver = t.version || '?';
      return `${pin} ${t.name} (${ver}) [${t.source}]`;
    });
    toolsList.setItems(items);
    toolsList.select(0);

    // 更新统计面板
    const maxSourceCount = Math.max(...Object.values(bySource), 1);
    const maxCatCount = Math.max(...Object.values(byCategory), 1);

    const lines: string[] = [];
    lines.push('{bold}核心指标{/bold}');
    lines.push(`  工具总数: {cyan-fg}${tools.length}{/cyan-fg} | 锁定: ${pinned} | 未知版本: ${noVersion} | 磁盘占用: ${formatSize(totalSize)}`);
    lines.push('');
    lines.push('{bold}来源分布{/bold}');
    for (const [src, count] of Object.entries(bySource).sort(
      (a, b) => b[1] - a[1],
    )) {
      const color =
        src === 'system'
          ? 'red'
          : src === 'npm'
            ? 'green'
            : src === 'pip'
              ? 'yellow'
              : src === 'winget'
                ? 'magenta'
                : src === 'scoop'
                  ? 'cyan'
                  : src === 'gh'
                    ? 'blue'
                    : 'grey';
      lines.push('  ' + buildBar(src, count, maxSourceCount, color));
    }

    lines.push('');
    lines.push('{bold}分类分布{/bold}');
    for (const [cat, count] of Object.entries(byCategory).sort(
      (a, b) => b[1] - a[1],
    )) {
      const color =
        cat === 'dev'
          ? 'cyan'
          : cat === 'ai'
            ? 'magenta'
            : cat === 'system'
              ? 'red'
              : cat === 'editor'
                ? 'blue'
                : 'grey';
      lines.push('  ' + buildBar(cat, count, maxCatCount, color));
    }

    if (lastScan) {
      lines.push('');
      lines.push('{bold}最近扫描{/bold}');
      lines.push(`  时间: ${new Date(lastScan.startedAt).toLocaleString()}`);
      lines.push(`  发现工具: ${lastScan.totalFound}`);
    }

    statsBox.setContent(lines.join('\n'));

    // 更新底部日志
    logBox.log(
      `加载完成: 共 ${tools.length} 个工具，来源 ${Object.keys(bySource).length} 种，分类 ${Object.keys(byCategory).length} 种`,
    );
    if (lastScan) {
      logBox.log(
        `最近扫描: ${new Date(lastScan.startedAt).toLocaleString()}，发现 ${lastScan.totalFound} 个工具`,
      );
    }
    const recentHistory = historyRepo.getScanHistory(10);
    for (const h of recentHistory) {
      logBox.log(
        `${new Date(h.startedAt).toLocaleString()} | 扫描类型: ${h.scanType} | 发现: ${h.totalFound}`,
      );
    }

    screen.render();
  }

  // 工具详情弹窗
  function showDetail(tool: ToolInfo): void {
    const detailBox = blessed.box({
      parent: screen,
      label: ` 工具详情: ${tool.name} `,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '60%',
      border: { type: 'line' },
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      style: { fg: 'white', bg: 'black' },
      keys: true,
      mouse: true,
    });

    const lines: string[] = [];
    lines.push(`名称:      ${tool.name}`);
    lines.push(`来源:      ${tool.source}`);
    lines.push(`分类:      ${tool.category}`);
    lines.push(`版本:      ${tool.version || '未知'}`);
    lines.push(`路径:      ${tool.fullPath}`);
    lines.push(`大小:      ${formatSize(tool.fileSize)}`);
    lines.push(`文件类型: ${tool.fileType}`);
    lines.push(`是否签名: ${tool.isSigned ? '已签名' : '未签名'}`);
    lines.push(`锁定状态: ${tool.isPinned ? '已锁定' : '未锁定'} ${tool.pinnedVersion ? `(${tool.pinnedVersion})` : ''}`);
    lines.push(`修改时间: ${new Date(tool.modifiedAt).toLocaleString()}`);
    lines.push(`首次发现: ${new Date(tool.firstDetectedAt).toLocaleString()}`);
    lines.push(`最近发现: ${new Date(tool.lastDetectedAt).toLocaleString()}`);
    lines.push('');
    lines.push('按键提示: Esc / q 关闭');

    detailBox.setContent(lines.join('\n'));
    detailBox.focus();
    screen.render();

    detailBox.on('keypress', (_ch: string, key: { name: string }) => {
      if (key.name === 'escape' || key.name === 'q') {
        detailBox.detach();
        screen.render();
        toolsList.focus();
        screen.render();
      }
    });
  }

  // 搜索弹窗
  function showSearch(): void {
    const searchForm = blessed.form({
      parent: screen,
      top: 'center',
      left: 'center',
      width: '60%',
      height: 10,
      label: ' 搜索工具 ',
      border: { type: 'line' },
      keys: true,
      style: { fg: 'white', bg: 'black' },
    });

    const input = blessed.textbox({
      parent: searchForm,
      top: 1,
      left: 1,
      width: '100%-2',
      height: 3,
      label: '关键词',
      style: { fg: 'white', bg: 'black' },
      inputOnFocus: true,
    });

    searchForm.focus();
    screen.render();

    input.on('submit', (value: string) => {
      const keyword = (value || '').trim();
      if (!keyword) {
        searchForm.detach();
        loadData();
        toolsList.focus();
        screen.render();
        return;
      }

      const results = toolRepo.search(keyword);
      const newItems = results.map(t => {
        const pin = t.isPinned ? '📌' : '  ';
        const ver = t.version || '?';
        return `${pin} ${t.name} (${ver}) [${t.source}]`;
      });
      toolsList.setItems(newItems);
      toolsList.select(0);

      logBox.log(
        `搜索: "${keyword}" => 找到 ${results.length} 个工具`,
      );
      searchForm.detach();
      screen.render();
      toolsList.focus();
      screen.render();
    });
  }

  // 全局键盘事件
  screen.key(['q', 'escape', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });

  screen.key(['r'], () => {
    loadData();
  });

  screen.key(['s'], () => {
    logBox.log('触发扫描...（请使用独立 scan 命令执行）');
    screen.render();
  });

  screen.key(['/'], () => {
    showSearch();
  });

  // 工具列表按键事件
  toolsList.on('keypress', (_ch: string, key: { name: string }) => {
    if (key.name === 'return' || key.name === 'enter') {
      const idx = toolsList.selected ?? 0;
      if (tools[idx]) {
        showDetail(tools[idx]);
      }
    }
    if (key.name === 'space') {
      const idx = toolsList.selected ?? 0;
      const tool = tools[idx];
      if (!tool) return;

      const newPinned = !tool.isPinned;
      toolRepo.updatePinStatus(
        tool.name,
        newPinned,
        newPinned ? tool.version : null,
      );
      logBox.log(
        `${newPinned ? '已锁定' : '已解锁'} ${tool.name}`,
      );
      loadData();
      toolsList.select(idx);
      screen.render();
    }
  });

  // 首次加载
  loadData();
  toolsList.focus();
  screen.render();
}
