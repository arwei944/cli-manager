import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { colors, createTable } from '../ui';

const toolRepo = new ToolRepo();

export function categoryCommand(action?: string, tool?: string, category?: string) {
  initDatabase();

  switch (action) {
    case 'set': {
      if (!tool || !category) {
        console.log(colors.error('用法: category set <tool> <category>'));
        return;
      }
      const validCats = ['dev', 'ai', 'system', 'editor', 'other'];
      if (!validCats.includes(category)) {
        console.log(colors.error(`无效分类: ${category}，有效值: ${validCats.join(', ')}`));
        return;
      }
      toolRepo.updateCategory(tool, category);
      console.log(colors.success(`工具 ${tool} 分类已设置为 ${category}`));
      break;
    }

    case 'unset': {
      if (!tool) {
        console.log(colors.error('用法: category unset <tool>'));
        return;
      }
      toolRepo.updateCategory(tool, 'other');
      console.log(colors.success(`工具 ${tool} 分类已重置为 other`));
      break;
    }

    case 'list':
    default: {
      const byCategory = toolRepo.countByCategory();
      console.log(`\n${colors.bold('工具分类')}`);
      const rows = Object.entries(byCategory).map(([cat, count]) => [
        colors.category(cat),
        String(count),
      ]);
      console.log(createTable(
        [{ header: '分类' }, { header: '工具数' }],
        rows,
      ));
      break;
    }
  }
}
