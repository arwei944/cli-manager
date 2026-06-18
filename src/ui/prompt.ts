import * as readline from 'node:readline';
import { createSpinner } from './spinner';
import { colors } from './colors';

interface CommandEntry {
  name: string;
  description: string;
  usage: string;
}

const BUILTIN_COMMANDS: CommandEntry[] = [
  { name: 'help', description: '显示帮助信息', usage: 'help [command]' },
  { name: 'exit', description: '退出交互式 Shell', usage: 'exit' },
  { name: 'quit', description: '退出交互式 Shell', usage: 'quit' },
  { name: 'clear', description: '清屏', usage: 'clear' },
  { name: 'history', description: '查看命令历史', usage: 'history' },
];

export class InteractiveShell {
  private rl: readline.Interface;
  private history: string[] = [];
  private commands: Map<string, (...args: string[]) => unknown>;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: this.completer.bind(this),
      history: [],
    });

    this.commands = new Map();
    this.registerBuiltinCommands();
  }

  private registerBuiltinCommands(): void {
    this.commands.set('help', () => this.showHelp());
    this.commands.set('exit', () => this.exit());
    this.commands.set('quit', () => this.exit());
    this.commands.set('clear', () => this.clear());
    this.commands.set('history', () => this.showHistory());
  }

    registerCommand(name: string, handler: (...args: string[]) => unknown): void {
    this.commands.set(name, handler);
  }

  start(): void {
    console.log(colors.bold('\n🔧 CLI 工具管理器 - 交互式 Shell'));
    console.log(colors.dim('输入 "help" 查看可用命令，输入 "exit" 退出\n'));

    this.rl.setPrompt(colors.cyan('cli-manager> '));
    this.rl.prompt();

    this.rl.on('line', async (line: string) => {
      const input = line.trim();
      if (!input) {
        this.rl.prompt();
        return;
      }

      this.history.push(input);

      const parts = input.split(/\s+/);
      const cmd = parts[0];
      const args = parts.slice(1);

      const handler = this.commands.get(cmd);
      if (handler) {
        try {
          await handler(...args);
        } catch (error) {
          console.log(colors.error(`执行错误: ${error}`));
        }
      } else {
        console.log(colors.error(`未知命令: ${cmd}`));
        console.log(colors.dim('输入 "help" 查看可用命令'));
      }

      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log(colors.dim('\n再见!'));
      process.exit(0);
    });
  }

  private completer(line: string): [string[], string] {
    const parts = line.split(/\s+/);
    if (parts.length === 1) {
      const completions = Array.from(this.commands.keys());
      const hits = completions.filter(c => c.startsWith(parts[0]));
      return [hits.length ? hits : completions, parts[0]];
    }
    return [[], line];
  }

  private showHelp(): void {
    console.log(colors.bold('\n可用命令:\n'));

    console.log(colors.info('内置命令:'));
    for (const cmd of BUILTIN_COMMANDS) {
      console.log(`  ${colors.bold(cmd.name.padEnd(12))} ${cmd.description}`);
      console.log(colors.dim(`  ${' '.repeat(14)}用法: ${cmd.usage}`));
    }

    console.log(colors.info('\nCLI 命令 (与命令行模式相同):'));
    const cliCommands = Array.from(this.commands.keys()).filter(c => !BUILTIN_COMMANDS.some(b => b.name === c));
    for (const cmd of cliCommands) {
      console.log(`  ${colors.bold(cmd)}`);
    }
    console.log('');
  }

  private showHistory(): void {
    console.log(colors.bold('\n命令历史:'));
    this.history.forEach((cmd, i) => {
      console.log(`  ${String(i + 1).padStart(3)}. ${cmd}`);
    });
    console.log('');
  }

  private clear(): void {
    console.clear();
  }

  private exit(): void {
    this.rl.close();
  }
}

export async function startInteractiveShell(): Promise<void> {
  const shell = new InteractiveShell();

  // 注册所有 CLI 命令
  const { scanCommand } = await import('../commands/scan');
  const { configCommand } = await import('../commands/config');
  const { listCommand } = await import('../commands/list');
  const { infoCommand } = await import('../commands/info');
  const { whichCommand } = await import('../commands/which');
  const { statusCommand } = await import('../commands/status');
  const { categoryCommand } = await import('../commands/category');
  const { installCommand, uninstallCommand } = await import('../commands/install');
  const { updateCommand } = await import('../commands/update');
  const { versionCommand, pinCommand, unpinCommand, historyCommand } = await import('../commands/version');
  const { pathCommand } = await import('../commands/path');
  const { doctorCommand } = await import('../commands/doctor');
  const { backupCommand } = await import('../commands/backup');
  const { statsCommand } = await import('../commands/stats');
  const { reportCommand } = await import('../commands/report');
  const { envCommand } = await import('../commands/env');

  shell.registerCommand('scan', (args) => {
    const options: { full?: boolean } = {};
    if (args.includes('--full')) options.full = true;
    return scanCommand(options);
  });

  shell.registerCommand('config', (args) => configCommand(args[0], args[1], args[2]));
  shell.registerCommand('list', (args) => {
    const options: Record<string, string | boolean> = {};
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-c' || args[i] === '--category') options.category = args[++i];
      else if (args[i] === '-s' || args[i] === '--source') options.source = args[++i];
      else if (args[i] === '-f' || args[i] === '--filter') options.filter = args[++i];
      else if (args[i] === '-a' || args[i] === '--all') options.all = true;
    }
    return listCommand(options as Parameters<typeof listCommand>[0]);
  });
  shell.registerCommand('info', (args) => args[0] && infoCommand(args[0]));
  shell.registerCommand('which', (args) => args[0] && whichCommand(args[0]));
  shell.registerCommand('status', () => statusCommand());
  shell.registerCommand('category', (args) => categoryCommand(args[0], args[1], args[2]));
  shell.registerCommand('install', (args) => {
    const options: { from?: string; dryRun?: boolean } = {};
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--from') options.from = args[++i];
      else if (args[i] === '--dry-run') options.dryRun = true;
    }
    return args[0] && installCommand(args[0], options);
  });
  shell.registerCommand('uninstall', (args) => args[0] && uninstallCommand(args[0]));
  shell.registerCommand('update', (args) => {
    const options: { dryRun?: boolean } = {};
    if (args.includes('--dry-run')) options.dryRun = true;
    return updateCommand(args[0], options);
  });
  shell.registerCommand('version', (args) => args[0] && versionCommand(args[0]));
  shell.registerCommand('pin', (args) => args[0] && pinCommand(args[0], args[1]));
  shell.registerCommand('unpin', (args) => args[0] && unpinCommand(args[0]));
  shell.registerCommand('history', (args) => args[0] && historyCommand(args[0]));
  shell.registerCommand('path', (args) => pathCommand(args[0], args[1]));
  shell.registerCommand('env', (args) => envCommand(args[0], args[1], args[2]));
  shell.registerCommand('doctor', () => doctorCommand());
  shell.registerCommand('backup', (args) => {
    const options: { output?: string } = {};
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-o' || args[i] === '--output') options.output = args[++i];
    }
    return backupCommand(options);
  });
  shell.registerCommand('stats', (args) => {
    const options: { category?: string } = {};
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-c' || args[i] === '--category') options.category = args[++i];
    }
    return statsCommand(options);
  });
  shell.registerCommand('report', (args) => {
    const options: { json?: boolean; save?: string } = {};
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--json') options.json = true;
      else if (args[i] === '-s' || args[i] === '--save') options.save = args[++i];
    }
    return reportCommand(options);
  });

  shell.start();
}

export { createSpinner };
