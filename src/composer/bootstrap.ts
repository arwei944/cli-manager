import { Container, SERVICE } from './container';
import { ToolRepo } from '../db/tool-repo';
import { ConfigRepo } from '../db/config-repo';
import { HistoryRepo } from '../db/history-repo';
import { Scanner } from '../scanner';
import { registry as installerRegistry } from '../installer';
import { recipeRegistry } from '../recipe/registry';
import { PluginManager } from '../plugins';
import { ScanWorkflow } from './scan-workflow';
import { InstallWorkflow } from './install-workflow';
import { UpdateWorkflow } from './update-workflow';
import { SyncWorkflow } from './sync-workflow';
import { BackupWorkflow } from './backup-workflow';

export const pluginManager = new PluginManager();

/** Workflow 服务键 */
export const WORKFLOW = {
  Scan: 'ScanWorkflow',
  Install: 'InstallWorkflow',
  Update: 'UpdateWorkflow',
  Sync: 'SyncWorkflow',
  Backup: 'BackupWorkflow',
} as const;

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

  // 插件管理器
  c.register(SERVICE.PluginManager, () => pluginManager);

  // 编排层（Workflow）
  c.register(WORKFLOW.Scan, (c) => new ScanWorkflow(
    c.resolve(SERVICE.Scanner),
    c.resolve(SERVICE.PluginManager),
    c.resolve(SERVICE.HistoryRepo),
    c.resolve(SERVICE.ToolRepo),
  ));

  c.register(WORKFLOW.Install, (c) => new InstallWorkflow(
    c.resolve(SERVICE.InstallerRegistry),
    c.resolve(SERVICE.RecipeRegistry),
    c.resolve(SERVICE.Scanner),
    c.resolve(SERVICE.ToolRepo),
    c.resolve(SERVICE.PluginManager),
  ));

  c.register(WORKFLOW.Update, (c) => new UpdateWorkflow(
    c.resolve(SERVICE.InstallerRegistry),
    c.resolve(SERVICE.ToolRepo),
    c.resolve(SERVICE.HistoryRepo),
    c.resolve(SERVICE.Scanner),
  ));

  c.register(WORKFLOW.Sync, (c) => new SyncWorkflow(
    c.resolve(SERVICE.ToolRepo),
  ));

  c.register(WORKFLOW.Backup, (c) => new BackupWorkflow(
    c.resolve(SERVICE.ToolRepo),
  ));

  return c;
}
