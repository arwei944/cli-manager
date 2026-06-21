/**
 * 轻量级依赖注入容器
 *
 * 支持：
 * - 按 ServiceKey 注册工厂函数
 * - 懒加载（首次 resolve 时创建，之后缓存单例）
 * - 重置（测试用）
 */
export type ServiceKey = string;

type Factory<T> = (container: Container) => T;

/** 预定义服务键常量 */
export const SERVICE = {
  ToolRepo: 'IToolRepository',
  ConfigRepo: 'IConfigRepository',
  HistoryRepo: 'IHistoryRepository',
  Scanner: 'IScanner',
  InstallerRegistry: 'IInstallerRegistry',
  RecipeRegistry: 'IRecipeRegistry',
  PluginManager: 'IPluginManager',
} as const;

export class Container {
  private factories = new Map<ServiceKey, Factory<unknown>>();
  private instances = new Map<ServiceKey, unknown>();

  /** 注册服务（工厂函数，懒加载） */
  register<T>(key: ServiceKey, factory: Factory<T>): void {
    if (this.factories.has(key)) {
      throw new Error(`服务已注册: ${key}`);
    }
    this.factories.set(key, factory as Factory<unknown>);
  }

  /** 注册服务并指定具体类（自动 new） */
  registerClass<T>(key: ServiceKey, Class: new (...args: never[]) => T): void {
    this.register(key, () => new Class());
  }

  /** 获取服务实例（懒加载，单例） */
  resolve<T>(key: ServiceKey): T {
    if (this.instances.has(key)) {
      return this.instances.get(key) as T;
    }

    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(`服务未注册: ${key}。请先调用 register() 注册`);
    }

    const instance = factory(this) as T;
    this.instances.set(key, instance);
    return instance;
  }

  /** 检查服务是否已注册 */
  isRegistered(key: ServiceKey): boolean {
    return this.factories.has(key);
  }

  /** 重置所有注册和实例（测试用） */
  reset(): void {
    this.factories.clear();
    this.instances.clear();
  }

  /** 移除所有实例但保留注册（让下次 resolve 重新创建） */
  clearInstances(): void {
    this.instances.clear();
  }
}
