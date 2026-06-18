import { parsePathDirectories } from '../utils/path';
import fs from 'node:fs';
import { initDatabase } from '../db';
import { colors, createTable } from '../ui';

export function pathCommand(action?: string, dir?: string) {
  initDatabase();

  switch (action) {
    case 'check':
      pathCheck();
      break;
    case 'add':
      if (!dir) console.log(colors.error('用法: path add <dir>'));
      else pathAdd(dir);
      break;
    case 'remove':
      if (!dir) console.log(colors.error('用法: path remove <dir>'));
      else pathRemove(dir);
      break;
    case 'list':
    default:
      pathList();
      break;
  }
}

function pathList() {
  const dirs = parsePathDirectories();
  const rows = dirs.map((dir, i) => {
    const exists = fs.existsSync(dir);
    return [
      String(i + 1),
      exists ? colors.success('✓') : colors.error('✗'),
      dir,
    ];
  });

  console.log(`\n${colors.bold('PATH 条目')} (${dirs.length} 个)`);
  console.log(createTable(
    [{ header: '#' }, { header: '' }, { header: '路径' }],
    rows,
  ));
}

function pathCheck() {
  const dirs = parsePathDirectories();
  let issues = 0;

  console.log(`\n${colors.bold('PATH 诊断')}`);

  const seen = new Set<string>();
  for (const dir of dirs) {
    if (seen.has(dir.toLowerCase())) {
      console.log(`  ${colors.warning('⚠')} 重复路径: ${dir}`);
      issues++;
    }
    seen.add(dir.toLowerCase());

    if (!fs.existsSync(dir)) {
      console.log(`  ${colors.error('✗')} 路径不存在: ${dir}`);
      issues++;
    }
  }

  if (issues === 0) {
    console.log(`  ${colors.success('✓')} PATH 无问题`);
  } else {
    console.log(`\n  发现 ${issues} 个问题`);
  }
}

function pathAdd(dir: string) {
  const resolved = dir.includes(':') ? dir : `${process.cwd()}\\${dir}`;
  console.log(colors.info(`请手动添加以下目录到 PATH: ${resolved}`));
  console.log(`  Windows: setx PATH "%PATH%;${resolved}"`);
  console.log(`  Unix:    export PATH="$PATH:${resolved}"`);
}

function pathRemove(dir: string) {
  console.log(colors.info(`请手动从 PATH 中移除: ${dir}`));
}
