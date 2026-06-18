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

  register(plugin: CliPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`插件已存在: ${plugin.name}`);
    }
    this.plugins.set(plugin.name, plugin);

    // 注册钩子
    if (plugin.hooks) {
      for (const [hookName, handler] of Object.entries(plugin.hooks)) {
        if (handler) {
          if (!this.hooks.has(hookName as PluginHook)) {
            this.hooks.set(hookName as PluginHook, []);
          }
          this.hooks.get(hookName as PluginHook)!.push(handler);
        }
      }
    }
  }

  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) return;

    if (plugin.hooks) {
      for (const hookName of Object.keys(plugin.hooks) as PluginHook[]) {
        const handlers = this.hooks.get(hookName);
        if (handlers) {
          const idx = handlers.indexOf(plugin.hooks[hookName]!);
          if (idx >= 0) handlers.splice(idx, 1);
        }
      }
    }

    this.plugins.delete(name);
  }

  list(): CliPlugin[] {
    return Array.from(this.plugins.values());
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

  registerCommands(program: Command): void {
    for (const plugin of this.plugins.values()) {
      if (!plugin.commands) continue;
      for (const cmd of plugin.commands) {
        const command = program.command(cmd.name).description(cmd.description);
        command.action(() => {
          cmd.action(process.argv.slice(3), {});
        });
      }
    }
  }
}

export const pluginManager = new PluginManager();

export function loadBuiltinPlugins(): void {
  // 示例插件：欢迎插件
  pluginManager.register({
    name: 'welcome',
    version: '1.0.0',
    description: '欢迎信息插件',
    commands: [
      {
        name: 'welcome',
        description: '显示欢迎信息',
        action: () => {
          console.log('欢迎使用 CLI 工具管理器！');
        },
      },
    ],
    hooks: {
      postScan: () => {
        // 扫描后钩子
      },
    },
  });
}
