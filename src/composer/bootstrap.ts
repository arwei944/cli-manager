import { Container, SERVICE } from './container';
import { ToolRepo } from '../db/tool-repo';
import { ConfigRepo } from '../db/config-repo';
import { HistoryRepo } from '../db/history-repo';
import { Scanner } from '../scanner';
import { registry as installerRegistry } from '../installer';
import { recipeRegistry } from '../recipe/registry';
import { PluginManager } from '../plugins';

export const pluginManager = new PluginManager();

/**
 * 创建默认容器并注册所有核心服务
 */
export function createContainer(): Container {
  const c = new Container();

  // 数据访问层
  c.register(SERVICE.ToolRepo, () => new ToolRepo());
  c.register(SERVICE.ConfigRepo, () => new ConfigRepo());
  c.register(SERVICE.HistoryRepo, () => new HistoryRepo());

  // 业务引擎
  c.register(SERVICE.Scanner, () => new Scanner());

  // 安装器注册表（使用现有全局单例）
  c.register(SERVICE.InstallerRegistry, () => installerRegistry);

  // 配方注册表（使用现有全局单例）
  c.register(SERVICE.RecipeRegistry, () => recipeRegistry);

  // 插件管理器（使用新实例）
  c.register(SERVICE.PluginManager, () => pluginManager);

  return c;
}
