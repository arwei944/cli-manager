import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { colors, createTable } from '../ui';

const toolRepo = new ToolRepo();

export function whichCommand(name: string) {
  initDatabase();

  const tools = toolRepo.findByName(name);

  if (tools.length === 0) {
    console.log(colors.error(`未找到工具: ${name}`));
    return;
  }

  const rows = tools.map((t, i) => [
    i === 0 ? colors.success('✓') : '',
    colors.bold(t.name),
    t.fullPath,
    colors.source(t.source),
    t.version || '-',
    String(t.pathPriority),
  ]);

  console.log(createTable(
    [
      { header: '' },
      { header: '名称' },
      { header: '路径' },
      { header: '来源' },
      { header: '版本' },
      { header: '优先级' },
    ],
    rows,
  ));

  console.log(`\n${colors.dim('✓ 标记为当前生效的优先级最高版本')}`);
}
