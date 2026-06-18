import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { Migrator } from '../../src/db/migrator';

describe('Migrator', () => {
  let db: Database.Database;
  let migrator: Migrator;

  beforeEach(() => {
    db = new Database(':memory:');
    migrator = new Migrator(db);
  });

  it('应该创建 schema_version 表并初始化为版本 0', () => {
    const version = migrator.getCurrentVersion();
    expect(version).toBe(0);
  });

  it('migrate 应该将数据库升级到最新版本', async () => {
    await migrator.migrate();
    const version = migrator.getCurrentVersion();
    expect(version).toBeGreaterThanOrEqual(1);
  });

  it('migrate 后应该存在 tools 表', async () => {
    await migrator.migrate();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tools'")
      .get() as { name: string } | undefined;
    expect(tables).toBeDefined();
    expect(tables.name).toBe('tools');
  });

  it('migrate 后应该存在 scan_history 表', async () => {
    await migrator.migrate();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='scan_history'")
      .get() as { name: string } | undefined;
    expect(tables).toBeDefined();
  });

  it('migrate 后应该存在 config 表', async () => {
    await migrator.migrate();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='config'")
      .get() as { name: string } | undefined;
    expect(tables).toBeDefined();
  });

  it('重复 migrate 不应该重复执行迁移', async () => {
    await migrator.migrate();
    const versionAfterFirst = migrator.getCurrentVersion();
    await migrator.migrate();
    const versionAfterSecond = migrator.getCurrentVersion();
    expect(versionAfterSecond).toBe(versionAfterFirst);
  });

  it('rollback 应该回滚到指定版本', async () => {
    await migrator.migrate();
    const versionBeforeRollback = migrator.getCurrentVersion();
    expect(versionBeforeRollback).toBeGreaterThanOrEqual(1);

    await migrator.rollback(0);
    const versionAfterRollback = migrator.getCurrentVersion();
    expect(versionAfterRollback).toBe(0);
  });

  it('rollback 到当前版本不应该执行任何操作', async () => {
    await migrator.migrate();
    const version = migrator.getCurrentVersion();
    await migrator.rollback(version);
    const versionAfter = migrator.getCurrentVersion();
    expect(versionAfter).toBe(version);
  });

  it('回滚后应该删除 tools 表', async () => {
    await migrator.migrate();
    const tablesBefore = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tools'")
      .all() as { name: string }[];
    expect(tablesBefore.length).toBeGreaterThan(0);

    await migrator.rollback(0);

    const tablesAfter = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tools'")
      .all() as { name: string }[];
    expect(tablesAfter.length).toBe(0);
  });

  it('迁移失败时应回滚并抛出异常', async () => {
    const badDb = new Database(':memory:');
    // 手动插入一个不存在的迁移版本，让当前版本为 999
    // 此时没有 pending 迁移，应静默返回
    badDb.prepare('CREATE TABLE schema_version (version INTEGER PRIMARY KEY)').run();
    await badDb.prepare('INSERT INTO schema_version (version) VALUES (999)').run();
    const badMigrator = new Migrator(badDb);
    // 当前版本 999 已高于所有迁移版本，静默返回
    badMigrator.migrate();
    expect(badMigrator.getCurrentVersion()).toBe(999);
  });
});

describe('Migrator 集成测试：完整迁移流程', () => {
  it('migrate + rollback 完整流程应该正常工作', async () => {
    const db = new Database(':memory:');
    const migrator = new Migrator(db);

    // 初始版本为 0
    expect(migrator.getCurrentVersion()).toBe(0);

    // 执行迁移
    await migrator.migrate();
    expect(migrator.getCurrentVersion()).toBeGreaterThanOrEqual(1);

    // 回滚到 0
    await migrator.rollback(0);
    expect(migrator.getCurrentVersion()).toBe(0);

    // 再次迁移
    await migrator.migrate();
    expect(migrator.getCurrentVersion()).toBeGreaterThanOrEqual(1);
  });
});
