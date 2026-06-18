import Database from 'better-sqlite3';
import { allMigrations } from './migrations';

export interface Migration {
  version: number;
  description: string;
  up(db: Database.Database): void;
  down(db: Database.Database): void;
}

export class Migrator {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.ensureSchemaVersionTable();
  }

  /** 确保 schema_version 表存在，且初始化为空数据库状态 */
  private ensureSchemaVersionTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        appliedAt TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    const row = this.db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined;
    if (!row) {
      this.db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
    }
  }

  /** 获取当前数据库版本 */
  getCurrentVersion(): number {
    const row = this.db.prepare('SELECT MAX(version) as version FROM schema_version').get() as { version: number } | undefined;
    return row?.version ?? 0;
  }

  /** 执行迁移：从当前版本迁移到最新版本（同步版本） */
  migrate(): void {
    const currentVersion = this.getCurrentVersion();
    const pending = allMigrations.filter((m) => m.version > currentVersion);

    if (pending.length === 0) {
      return;
    }

    for (const migration of pending) {
      try {
        migration.up(this.db);
      } catch (error) {
        // 失败时执行回滚，再抛出异常
        try {
          migration.down(this.db);
        } catch {
          // 回滚也失败则静默吞掉，由外层处理
        }
        throw new Error(`迁移 ${migration.version} 失败: ${(error as Error).message}`);
      }
      // 更新版本到该迁移版本
      this.db.prepare(`
        UPDATE schema_version SET version = ?, appliedAt = datetime('now')
      `).run(migration.version);
    }
  }

  /** 回滚到指定版本 */
  rollback(targetVersion = 0): void {
    const currentVersion = this.getCurrentVersion();
    if (targetVersion >= currentVersion) {
      return;
    }

    // 倒序执行 down，直到达到目标版本
    const toRollback = allMigrations
      .filter((m) => m.version > targetVersion && m.version <= currentVersion)
      .reverse();

    for (const migration of toRollback) {
      try {
        migration.down(this.db);
      } catch (error) {
        throw new Error(`回滚迁移 ${migration.version} 失败: ${(error as Error).message}`);
      }
      // 回滚后将版本设置为当前迁移版本 - 1
      this.db.prepare(`
        UPDATE schema_version SET version = ?, appliedAt = datetime('now')
      `).run(migration.version - 1);
    }
  }
}
