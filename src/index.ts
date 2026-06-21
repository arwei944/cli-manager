import { Command } from 'commander';
import { initContext, services } from './composer/context';
import { loadBuiltinPlugins, loadUserPlugins } from './plugins';

// 初始化 DI 容器（在模块加载阶段完成）
initContext();
import { scanCommand } from './commands/scan';
import { configCommand } from './commands/config';
import { listCommand } from './commands/list';
import { infoCommand } from './commands/info';
import { whichCommand } from './commands/which';
import { statusCommand } from './commands/status';
import { categoryCommand } from './commands/category';
import { installCommand, uninstallCommand } from './commands/install';
import { recipeCommand } from './commands/recipe-handler';
import { versionCommand, pinCommand, unpinCommand, historyCommand } from './commands/version';
import { useCommand, rollbackCommand } from './commands/use';
import { updateCommand } from './commands/update';
import { outdatedCommand } from './commands/outdated';
import { pathCommand } from './commands/path';
import { doctorCommand } from './commands/doctor';
import { envCommand } from './commands/env';
import { backupCommand } from './commands/backup';
import { restoreCommand } from './commands/restore';
import { syncCommand } from './commands/sync';
import { statsCommand } from './commands/stats';
import { reportCommand } from './commands/report';
import { completionCommand } from './commands/completion';
import { initCommand } from './commands/init';
import { webCommand } from './commands/web';
import { dashboardCommand } from './commands/dashboard';
import { recipeRegistry } from './recipe/registry';

const program = new Command();

program
  .name('cli-manager')
  .description('通用命令行工具管理器 - 统一发现、安装、更新、配置和卸载系统中所有的 CLI 工具')
  .version('0.1.0')
  .option('--no-color', '禁用彩色输出')
  .option('--format <type>', '输出格式: table | json | text', 'table')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.optsWithGlobals();
    if (opts.color === false) {
      process.env.FORCE_COLOR = '0';
    }
  });

// P0 命令
program
  .command('scan')
  .description('扫描系统中的 CLI 工具')
  .option('--full', '强制全量扫描')
  .action((options) => {
    scanCommand(options);
  });

program
  .command('config')
  .description('管理配置')
  .argument('[action]', 'get | set | list')
  .argument('[key]', '配置键')
  .argument('[value]', '配置值')
  .action((action, key, value) => {
    configCommand(action, key, value);
  });

program
  .command('init')
  .description('初始化配置向导（首次运行推荐）')
  .action(() => {
    initCommand();
  });

// P1 命令
program
  .command('list')
  .description('列出所有已扫描的工具')
  .option('-c, --category <name>', '按分类过滤')
  .option('-s, --source <source>', '按来源过滤')
  .option('-f, --filter <keyword>', '按关键词搜索')
  .option('-a, --all', '显示完整路径')
  .action((options) => {
    listCommand(options);
  });

program
  .command('info')
  .description('显示工具详细信息')
  .argument('<name>', '工具名称')
  .action((name) => {
    infoCommand(name);
  });

program
  .command('which')
  .description('定位工具路径')
  .argument('<name>', '工具名称')
  .action((name) => {
    whichCommand(name);
  });

program
  .command('status')
  .description('显示概览仪表盘')
  .action(() => {
    statusCommand();
  });

program
  .command('outdated')
  .description('列出可更新的工具')
  .option('-s, --source <source>', '按来源过滤')
  .action((options) => {
    outdatedCommand(options);
  });

program
  .command('category')
  .description('管理工具分类')
  .argument('[action]', 'list | set | unset')
  .argument('[tool]', '工具名称')
  .argument('[category]', '分类名称')
  .action((action, tool, category) => {
    categoryCommand(action, tool, category);
  });

// P2 命令
program
  .command('install')
  .description('安装工具')
  .argument('<name>', '工具名称')
  .option('--from <source>', '指定安装源 (npm|pip|gh|scoop|winget|choco)')
  .option('--dry-run', '预览安装计划')
  .action((name, options) => {
    installCommand(name, options);
  });

program
  .command('uninstall')
  .description('卸载工具')
  .argument('<name>', '工具名称')
  .action((name) => {
    uninstallCommand(name);
  });

// 注册 recipe 子命令（逐个链式注册，避免 addCommand 在根重复注册）
const recipeCmd = program.command('recipe').description('管理安装配方');
recipeCmd
  .command('list')
  .description('列出所有配方')
  .action(() => {
    recipeCommand('list');
  });
recipeCmd
  .command('show')
  .description('查看配方详情')
  .argument('<name>', '配方名称')
  .action((name) => {
    recipeCommand('show', name);
  });
recipeCmd
  .command('add')
  .description('添加自定义配方')
  .argument('<name>', '配方名称')
  .option('--source <source>', '安装源 (npm|pip|gh|scoop|winget|choco)')
  .option('--exec <executable>', '可执行文件名')
  .action((name, options) => {
    recipeCommand('add', name, options);
  });
recipeCmd
  .command('remove')
  .description('删除配方')
  .argument('<name>', '配方名称')
  .action((name) => {
    recipeCommand('remove', name);
  });
recipeCmd
  .command('edit')
  .description('打开编辑器编辑配方')
  .argument('<name>', '配方名称')
  .action((name) => {
    recipeCommand('edit', name);
  });

// P3 命令
program
  .command('update')
  .description('更新工具')
  .argument('[name]', '工具名称 (不指定则批量更新)')
  .option('--dry-run', '预览更新计划')
  .action((name, options) => {
    updateCommand(name, options);
  });

program
  .command('version')
  .description('查看工具版本信息')
  .argument('<name>', '工具名称')
  .action((name) => {
    versionCommand(name);
  });

program
  .command('use')
  .description('切换工具版本')
  .argument('<name>', '工具名称')
  .argument('[version]', '目标版本')
  .action((name, version) => {
    useCommand(name, version);
  });

program
  .command('pin')
  .description('锁定工具版本')
  .argument('<name>', '工具名称')
  .argument('[version]', '锁定版本')
  .action((name, version) => {
    pinCommand(name, version);
  });

program
  .command('unpin')
  .description('解除工具版本锁定')
  .argument('<name>', '工具名称')
  .action((name) => {
    unpinCommand(name);
  });

program
  .command('rollback')
  .description('回退工具版本')
  .argument('<name>', '工具名称')
  .action((name) => {
    rollbackCommand(name);
  });

program
  .command('history')
  .description('查看版本变更历史')
  .argument('<name>', '工具名称')
  .action((name) => {
    historyCommand(name);
  });

// P4 命令
program
  .command('path')
  .description('管理 PATH 环境变量')
  .argument('[action]', 'list | check | add | remove')
  .argument('[dir]', '目录路径')
  .action((action, dir) => {
    pathCommand(action, dir);
  });

program
  .command('env')
  .description('管理环境变量')
  .argument('[action]', 'list | get | set')
  .argument('[name]', '变量名')
  .argument('[value]', '变量值')
  .action((action, name, value) => {
    envCommand(action, name, value);
  });

program
  .command('doctor')
  .description('系统健康检查')
  .action(() => {
    doctorCommand();
  });

// P5 命令
program
  .command('backup')
  .description('导出工具清单备份')
  .option('-o, --output <path>', '导出路径')
  .action((options) => {
    backupCommand(options);
  });

program
  .command('restore')
  .description('从备份恢复工具')
  .argument('<file>', '备份文件路径')
  .option('--dry-run', '预览恢复计划')
  .action((file, options) => {
    restoreCommand(file, options);
  });

program
  .command('sync')
  .description('多机同步工具清单')
  .argument('<action>', 'push | pull')
  .option('--remote <url>', '远程仓库地址')
  .action((action, options) => {
    syncCommand(action, options);
  });

program
  .command('stats')
  .description('显示使用统计')
  .option('-c, --category <name>', '按分类筛选')
  .action((options) => {
    statsCommand(options);
  });

// 加载内置插件并注册用户插件到 Commander
async function initializePlugins(): Promise<void> {
  loadBuiltinPlugins();
  const projectRoot = process.cwd();
  loadUserPlugins(projectRoot).then((loaded) => {
    if (loaded.length > 0) {
      console.log(`已加载 ${loaded.length} 个用户插件: ${loaded.join(', ')}`);
    }
  }).catch(() => {
    // 用户插件加载失败不影响主程序
  });
  services.pluginManager.setCommandProgram(program);
  services.pluginManager.registerCommands();
}

initializePlugins();

program
  .command('report')
  .description('生成环境报告')
  .option('--json', 'JSON 格式输出')
  .option('-s, --save <path>', '保存到文件')
  .action((options) => {
    reportCommand(options);
  });

// P6 命令
program
  .command('completion')
  .description('生成 Shell 自动补全脚本')
  .argument('<shell>', 'powershell | bash | zsh')
  .action((shell) => {
    completionCommand(shell);
  });

program
  .command('web')
  .description('启动 Web 管理面板')
  .option('-p, --port <number>', '端口号', '8080')
  .action((options) => {
    webCommand({ port: parseInt(options.port, 10) });
  });

program
  .command('dashboard')
  .description('TUI 仪表盘')
  .action(() => {
    dashboardCommand();
  });

// 无参数时进入交互式 Shell 模式
if (process.argv.length === 2) {
  import('./ui/prompt').then(({ startInteractiveShell }) => {
    startInteractiveShell();
  });
} else {
  // 在解析命令前加载用户自定义配方（优先覆盖内置配方）
  recipeRegistry.loadUserRecipes();
  program.parse(process.argv);
}
