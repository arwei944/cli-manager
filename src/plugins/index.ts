import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import type { Command } from 'commander';

export type PluginHook = 'preScan' | 'postScan' | 'preInstall' | 'postInstall' | 'preUninstall' | 'postUninstall';

export interface PluginCommand {
  name: string;
  description: string;
  action: (args: string[], options: Record<string, unknown>) => void | Promise<void>;
}

export interface CliPlugin {
  name: string;
  version: string;
  description?: string;
  commands?: PluginCommand[];
  hooks?: Partial<Record<PluginHook, (...args: unknown[]) => void | Promise<void>>>;
}

export class PluginManager {
  private plugins = new Map<string, CliPlugin>();
  private hooks = new Map<PluginHook, Array<(...args: unknown[]) => void | Promise<void>>>();
  private commandProgram?: Command;

  setCommandProgram(program: Command): void {
    this.commandProgram = program;
  }

  register(plugin: CliPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`插件已存在: ${plugin.name}`);
    }
    this.plugins.set(plugin.name, plugin);

    if (plugin.hooks) {
      for (const [hookName, handler] of Object.entries(plugin.hooks)) {
        const key = hookName as PluginHook;
        if (!handler) continue;
        if (!this.hooks.has(key)) {
          this.hooks.set(key, []);
        }
        this.hooks.get(key)!.push(handler);
      }
    }
  }

  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) return;

    if (plugin.hooks) {
      for (const hookName of Object.keys(plugin.hooks) as PluginHook[]) {
        const handlers = this.hooks.get(hookName);
        if (!handlers) continue;
        const idx = handlers.indexOf(plugin.hooks[hookName]!);
        if (idx >= 0) handlers.splice(idx, 1);
      }
    }

    this.plugins.delete(name);
  }

  list(): CliPlugin[] {
    return Array.from(this.plugins.values());
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  get(name: string): CliPlugin | undefined {
    return this.plugins.get(name);
  }

  clear(): void {
    this.plugins.clear();
    this.hooks.clear();
  }

  async runHook(hook: PluginHook, ...args: unknown[]): Promise<void> {
    const handlers = this.hooks.get(hook);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        await handler(...args);
      } catch (error) {
        console.error(`插件钩子 ${hook} 执行失败:`, error);
      }
    }
  }

  registerCommands(): void {
    if (!this.commandProgram) {
      console.warn('未设置 Command 程序实例，无法注册插件命令');
      return;
    }
    for (const plugin of this.plugins.values()) {
      if (!plugin.commands) continue;
      for (const cmd of plugin.commands) {
        const command = this.commandProgram.command(cmd.name).description(cmd.description);
        command.action(() => {
          cmd.action(process.argv.slice(3), {});
        });
      }
    }
  }

  listHooks(): Array<{ hook: PluginHook; handlerCount: number }> {
    const result: Array<{ hook: PluginHook; handlerCount: number }> = [];
    for (const [hook, handlers] of this.hooks) {
      result.push({ hook, handlerCount: handlers.length });
    }
    return result;
  }
}

export const pluginManager = new PluginManager();

export function loadBuiltinPlugins(): void {
  pluginManager.register({
    name: 'welcome',
    version: '1.0.0',
    description: '欢迎信息插件',
    commands: [
      {
        name: 'welcome',
        description: '显示欢迎信息',
        action: () => {
          console.log('欢迎使用 CLI 工具管理器!');
        },
      },
    ],
    hooks: {},
  });
}

const DEFAULT_USER_PLUGIN_DIRS: string[] = [
  path.join(os.homedir(), '.config', 'cli-manager', 'plugins'),
  path.join(process.cwd(), '.cli-manager', 'plugins'),
];

export async function loadUserPlugins(projectRoot?: string): Promise<string[]> {
  const loaded: string[] = [];
  const scanDirs = projectRoot
    ? [
        path.join(os.homedir(), '.config', 'cli-manager', 'plugins'),
        path.join(projectRoot, '.cli-manager', 'plugins'),
      ]
    : DEFAULT_USER_PLUGIN_DIRS;

  const pluginFiles: string[] = [];

  for (const dir of scanDirs) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      continue;
    }
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const ext = path.extname(entry);
        if (ext === '.ts' || ext === '.js') {
          pluginFiles.push(path.join(dir, entry));
        }
      }
    } catch {
      // 读取目录失败时静默跳过
    }
  }

  for (const file of pluginFiles) {
    try {
      const module = await import(file);
      const plugin = (module as { default?: CliPlugin }).default;
      if (plugin && typeof plugin.name === 'string') {
        pluginManager.register(plugin);
        loaded.push(plugin.name);
      }
    } catch {
      // 单个插件加载失败不影响其他插件
    }
  }

  return loaded;
}
