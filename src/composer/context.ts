/**
 * 运行时上下文 —— 持有全局容器实例，供命令层访问
 */
import { Container, SERVICE } from './container';
import { createContainer, WORKFLOW } from './bootstrap';
import type { IScanner } from '../ports/scanner';
import type { IToolRepository } from '../ports/tool-repo';
import type { IHistoryRepository } from '../ports/history-repo';
import type { IInstallerRegistry } from '../ports/installer-registry';
import type { IRecipeRegistry } from '../ports/recipe-registry';
import type { IPluginManager } from '../ports/plugin-manager';
import type { IEnvManager } from '../ports/env-manager';
import type { IVersionManager } from '../ports/version-manager';
import { ScanWorkflow } from './scan-workflow';
import { InstallWorkflow } from './install-workflow';
import { UpdateWorkflow } from './update-workflow';
import { SyncWorkflow } from './sync-workflow';
import { BackupWorkflow } from './backup-workflow';

/** 全局容器实例 */
let _container: Container | null = null;

/** 初始化全局上下文（在入口启动时调用一次） */
export function initContext(): Container {
  _container = createContainer();
  return _container;
}

/** 获取全局容器 */
export function getContainer(): Container {
  if (!_container) {
    throw new Error('上下文未初始化，请先调用 initContext()');
  }
  return _container;
}

// ─── 便捷访问器（命令层可以直接使用） ───────────────────

export const services = {
  get toolRepo(): IToolRepository {
    return getContainer().resolve<IToolRepository>(SERVICE.ToolRepo);
  },
  get historyRepo(): IHistoryRepository {
    return getContainer().resolve<IHistoryRepository>(SERVICE.HistoryRepo);
  },
  get scanner(): IScanner {
    return getContainer().resolve<IScanner>(SERVICE.Scanner);
  },
  get installerRegistry(): IInstallerRegistry {
    return getContainer().resolve<IInstallerRegistry>(SERVICE.InstallerRegistry);
  },
  get recipeRegistry(): IRecipeRegistry {
    return getContainer().resolve<IRecipeRegistry>(SERVICE.RecipeRegistry);
  },
  get pluginManager(): IPluginManager {
    return getContainer().resolve<IPluginManager>(SERVICE.PluginManager);
  },
  get scanWorkflow(): ScanWorkflow {
    return getContainer().resolve<ScanWorkflow>(WORKFLOW.Scan);
  },
  get installWorkflow(): InstallWorkflow {
    return getContainer().resolve<InstallWorkflow>(WORKFLOW.Install);
  },
  get updateWorkflow(): UpdateWorkflow {
    return getContainer().resolve<UpdateWorkflow>(WORKFLOW.Update);
  },
  get syncWorkflow(): SyncWorkflow {
    return getContainer().resolve<SyncWorkflow>(WORKFLOW.Sync);
  },
  get backupWorkflow(): BackupWorkflow {
    return getContainer().resolve<BackupWorkflow>(WORKFLOW.Backup);
  },
  get envManager(): IEnvManager {
    return getContainer().resolve<IEnvManager>(SERVICE.EnvManager);
  },
  get versionManager(): IVersionManager {
    return getContainer().resolve<IVersionManager>(SERVICE.VersionManager);
  },
};
