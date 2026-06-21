import type { Command } from 'commander';
import type { PluginHook, CliPlugin } from '../plugins';

/** 插件管理器端口 */
export interface IPluginManager {
  register(plugin: CliPlugin): void;
  unregister(name: string): void;
  list(): CliPlugin[];
  has(name: string): boolean;
  get(name: string): CliPlugin | undefined;
  clear(): void;
  runHook(hook: PluginHook, ...args: unknown[]): Promise<void>;
  setCommandProgram(program: Command): void;
  registerCommands(): void;
  listHooks(): Array<{ hook: PluginHook; handlerCount: number }>;
}
