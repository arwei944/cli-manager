import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { colors, createTable } from '../ui';

const toolRepo = new ToolRepo();

export function listCommand(options: { category?: string; source?: string; filter?: string; all?: boolean; format?: string }) {
  initDatabase();

  let tools = toolRepo.findAll();

  if (options.category) {
    tools = tools.filter(t => t.category === options.category);
  }
  if (options.source) {
    tools = tools.filter(t => t.source === options.source);
  }
  if (options.filter) {
    const kw = options.filter.toLowerCase();
    tools = tools.filter(t => t.name.toLowerCase().includes(kw) || t.fullPath.toLowerCase().includes(kw));
  }

  const categoryMap = new Map<string, typeof tools>();
  for (const tool of tools) {
    const cat = tool.category || 'other';
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(tool);
  }

  for (const [cat, catTools] of categoryMap) {
    console.log(`\n${colors.category(cat)} (${catTools.length})`);

    const rows = catTools.map(t => [
      t.name,
      options.all ? t.fullPath : shortenPath(t.fullPath),
      t.version || '-',
      colors.source(t.source),
      t.isPinned ? '🔒' : '',
    ]);

    console.log(createTable(
      [
        { header: '名称' },
        { header: '路径' },
        { header: '版本' },
        { header: '来源' },
        { header: '锁定' },
      ],
      rows,
    ));
  }

  console.log(`\n${colors.dim(`共 ${tools.length} 个工具，${categoryMap.size} 个分类`)}`);
}

function shortenPath(fullPath: string): string {
  const parts = fullPath.split(/[\\/]/);
  if (parts.length <= 3) return fullPath;
  return `.../${parts.slice(-2).join('/')}`;
}
