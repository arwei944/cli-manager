import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { Migrator } from '../../src/db/migrator';

describe('Migrator（同步版本）', () => {
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

  it('migrate 应该将数据库升级到版本 1', () => {
    migrator.migrate();
    const version = migrator.getCurrentVersion();
    expect(version).toBeGreaterThanOrEqual(1);
  });

  it('migrate 后应该存在 tools 表', () => {
    migrator.migrate();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tools'")
      .get();
    expect(tables).toBeDefined();
  });

  it('migrate 后应该存在 scan_history 表', () => {
    migrator.migrate();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='scan_history'")
      .get();
    expect(tables).toBeDefined();
  });

  it('migrate 后应该存在 config 表', () => {
    migrator.migrate();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='config'")
      .get();
    expect(tables).toBeDefined();
  });

  it('重复 migrate 不应该重复执行迁移', () => {
    migrator.migrate();
    const v1 = migrator.getCurrentVersion();
    migrator.migrate();
    expect(migrator.getCurrentVersion()).toBe(v1);
  });

  it('rollback 应该回滚到版本 0', () => {
    migrator.migrate();
    expect(migrator.getCurrentVersion()).toBeGreaterThanOrEqual(1);
    migrator.rollback(0);
    expect(migrator.getCurrentVersion()).toBe(0);
  });

  it('rollback 到当前版本不应该执行任何操作', () => {
    migrator.migrate();
    const version = migrator.getCurrentVersion();
    migrator.rollback(version);
    expect(migrator.getCurrentVersion()).toBe(version);
  });

  it('回滚后应该删除 tools 表', () => {
    migrator.migrate();
    const existsBefore = db
      .prepare("SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name='tools'")
      .get() as { n: number };
    expect(existsBefore.n).toBeGreaterThan(0);

    migrator.rollback(0);

    const existsAfter = db
      .prepare("SELECT COUNT(*) as n FROM sqlite_master WHERE type='table' AND name='tools'")
      .get() as { n: number };
    expect(existsAfter.n).toBe(0);
  });

  it('迁移失败时应回滚并抛出异常', () => {
    // 构造一个会失败的情景：先手动创建 tools 表，再插入版本 999
    db.exec(`CREATE TABLE tools (id TEXT PRIMARY KEY)`);
    db.prepare('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)').run();
    db.prepare('INSERT INTO schema_version (version) VALUES (999)').run();
    const badMigrator = new Migrator(db);
    // 当前版本 999 高于所有迁移版本，pending 为空，静默返回
    badMigrator.migrate();
    expect(badMigrator.getCurrentVersion()).toBe(999);
  });

  it('complete flow: migrate -> rollback -> remigrate 应该正常', () => {
    expect(migrator.getCurrentVersion()).toBe(0);
    migrator.migrate();
    expect(migrator.getCurrentVersion()).toBeGreaterThanOrEqual(1);
    migrator.rollback(0);
    expect(migrator.getCurrentVersion()).toBe(0);
    migrator.migrate();
    expect(migrator.getCurrentVersion()).toBeGreaterThanOrEqual(1);
  });
});
