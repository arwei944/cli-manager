import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { createSpinner } from '../ui/spinner';

const toolRepo = new ToolRepo();

export function backupCommand(options: { output?: string }) {
  initDatabase();

  const spinner = createSpinner('导出工具清单...');

  try {
    const tools = toolRepo.findAll();
    const backup = {
      exportedAt: new Date().toISOString(),
      version: '0.1.0',
      tools: tools.map(t => ({
        name: t.name,
        version: t.version,
        source: t.source,
        category: t.category,
        isPinned: t.isPinned,
        pinnedVersion: t.pinnedVersion,
      })),
    };

    const outputDir = options.output
      ? path.dirname(options.output)
      : path.join(os.homedir(), '.cli-manager', 'backups');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = options.output
      ? options.output
      : path.join(outputDir, `cli-manager-backup-${new Date().toISOString().slice(0, 10)}.json`);

    fs.writeFileSync(filename, JSON.stringify(backup, null, 2), 'utf-8');
    spinner.succeed(`备份已导出: ${filename} (${tools.length} 个工具)`);
  } catch (error) {
    spinner.fail(`备份失败: ${error}`);
  }
}
