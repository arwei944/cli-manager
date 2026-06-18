import { initDatabase, getDbPath } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { colors } from '../ui';
import { parsePathDirectories } from '../utils/path';
import { execSync } from 'node:child_process';
import { pluginManager } from '../plugins';
import fs from 'node:fs';

const toolRepo = new ToolRepo();

interface DiagnosticItem {
  status: 'pass' | 'warn' | 'error';
  message: string;
}

export function doctorCommand() {
  initDatabase();
  const diagnostics: DiagnosticItem[] = [];
  let errors = 0;
  let warnings = 0;

  // 1. 数据库检查
  try {
    const dbPath = getDbPath();
    if (fs.existsSync(dbPath)) {
      const size = fs.statSync(dbPath).size;
      diagnostics.push({ status: 'pass', message: `数据库正常 (${(size / 1024).toFixed(0)} KB)` });
    } else {
      diagnostics.push({ status: 'warn', message: '数据库未创建，请先运行 scan' });
      warnings++;
    }
  } catch {
    diagnostics.push({ status: 'error', message: '数据库访问异常' });
    errors++;
  }

  // 2. PATH 检查
  try {
    const dirs = parsePathDirectories();
    const invalid = dirs.filter(d => !fs.existsSync(d));
    const duplicateCheck = new Map<string, number>();
    for (const d of dirs) duplicateCheck.set(d.toLowerCase(), (duplicateCheck.get(d.toLowerCase()) || 0) + 1);
    const duplicates = Array.from(duplicateCheck.entries()).filter(([, count]) => count > 1);

    if (invalid.length === 0 && duplicates.length === 0) {
      diagnostics.push({ status: 'pass', message: `PATH 正常 (${dirs.length} 个有效路径)` });
    } else {
      if (invalid.length > 0) {
        diagnostics.push({ status: 'error', message: `${invalid.length} 个无效 PATH 条目` });
        errors++;
      }
      if (duplicates.length > 0) {
        diagnostics.push({ status: 'warn', message: `${duplicates.length} 个重复路径` });
        warnings++;
      }
    }
  } catch {
    diagnostics.push({ status: 'error', message: 'PATH 解析失败' });
    errors++;
  }

  // 3. 运行时检查
  const runtimes = [
    { name: 'Node.js', cmd: 'node --version' },
    { name: 'npm', cmd: 'npm --version' },
    { name: 'Python', cmd: 'python --version' },
    { name: 'Git', cmd: 'git --version' },
  ];

  for (const runtime of runtimes) {
    try {
      execSync(runtime.cmd, { encoding: 'utf-8', timeout: 3000, stdio: 'pipe' });
      diagnostics.push({ status: 'pass', message: `${runtime.name} 可用` });
    } catch {
      diagnostics.push({ status: 'warn', message: `${runtime.name} 未安装或不在 PATH 中` });
      warnings++;
    }
  }

  // 4. 工具冲突检查
  const allTools = toolRepo.findAll();
  const nameCount = new Map<string, number>();
  for (const t of allTools) {
    nameCount.set(t.name, (nameCount.get(t.name) || 0) + 1);
  }
  const conflicts = Array.from(nameCount.entries()).filter(([, count]) => count > 1);
  if (conflicts.length > 0) {
    diagnostics.push({ status: 'warn', message: `${conflicts.length} 个工具有多个版本 (如: ${conflicts.slice(0, 5).map(([n]) => n).join(', ')})` });
    warnings++;
  } else {
    diagnostics.push({ status: 'pass', message: '无工具冲突' });
  }

  // 输出报告
  console.log(`\n${colors.bold('系统健康检查报告')}`);
  console.log(`${'─'.repeat(50)}`);

  for (const d of diagnostics) {
    const icon = d.status === 'pass' ? colors.success('✓') : d.status === 'warn' ? colors.warning('⚠') : colors.error('✗');
    const label = d.status === 'pass' ? colors.success('通过') : d.status === 'warn' ? colors.warning('警告') : colors.error('错误');
    console.log(`  ${icon} [${label}] ${d.message}`);
  }

  console.log(`\n${colors.bold('汇总')}: ${colors.success(`${diagnostics.filter(d => d.status === 'pass').length} 通过`)}，${colors.warning(`${warnings} 警告`)}，${colors.error(`${errors} 错误`)}`);

  // 5. 插件系统健康检查
  const plugins = pluginManager.list();
  if (plugins.length > 0) {
    console.log(`\n${colors.bold('插件系统检查')}`);
    console.log(`${'─'.repeat(50)}`);
    diagnostics.push({ status: 'pass', message: `已加载 ${plugins.length} 个插件` });

    console.log(`\n  插件列表:`);
    for (const plugin of plugins) {
      console.log(`    - ${colors.bold(plugin.name)} v${plugin.version}`);
    }

    const usedHookTypes: string[] = [];
    for (const plugin of plugins) {
      if (plugin.hooks) {
        for (const hookName of Object.keys(plugin.hooks) as string[]) {
          if (!usedHookTypes.includes(hookName)) {
            usedHookTypes.push(hookName);
          }
        }
      }
    }
    if (usedHookTypes.length > 0) {
      console.log(`\n  已注册的 Hooks: ${usedHookTypes.map(h => colors.info(h)).join(', ')}`);
      diagnostics.push({ status: 'pass', message: `${usedHookTypes.length} 个 hook 类型的处理器可用` });
    } else {
      diagnostics.push({ status: 'warn', message: '当前无任何插件注册 hook' });
      warnings++;
    }
  } else {
    diagnostics.push({ status: 'warn', message: '未加载任何插件' });
    warnings++;
  }
}
