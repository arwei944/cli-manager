import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { colors } from '../ui';

const toolRepo = new ToolRepo();

export function infoCommand(name: string) {
  initDatabase();

  const tools = toolRepo.findByName(name);

  if (tools.length === 0) {
    console.log(colors.error(`未找到工具: ${name}`));
    return;
  }

  const tool = tools[0];
  console.log(`\n${colors.bold(tool.name)}`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`  路径: ${tool.fullPath}`);
  console.log(`  版本: ${tool.version || colors.dim('未知')}`);
  console.log(`  来源: ${colors.source(tool.source)}`);
  console.log(`  分类: ${colors.category(tool.category)}`);
  console.log(`  大小: ${formatSize(tool.fileSize)}`);
  console.log(`  类型: ${tool.fileType}`);
  console.log(`  签名: ${tool.isSigned ? colors.success('是') : colors.dim('否')}`);
  console.log(`  修改时间: ${new Date(tool.modifiedAt).toLocaleString()}`);
  console.log(`  首次发现: ${new Date(tool.firstDetectedAt).toLocaleString()}`);
  console.log(`  最近扫描: ${new Date(tool.lastDetectedAt).toLocaleString()}`);
  console.log(`  锁定: ${tool.isPinned ? `${colors.warning('是')} (${tool.pinnedVersion})` : colors.dim('否')}`);
  console.log(`  PATH 优先级: ${tool.pathPriority}`);

  if (tools.length > 1) {
    console.log(`\n${colors.warning(`有 ${tools.length} 个同名工具，当前显示优先级最高的`)}`);
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
