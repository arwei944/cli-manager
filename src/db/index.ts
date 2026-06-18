import Database from 'better-sqlite3';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import type { Config } from '../types';
import { DEFAULT_CONFIG } from '../types';
import { Migrator } from './migrator';

let db: Database.Database | null = null;
let migrator: Migrator | null = null;

export function getDbPath(): string {
  const configDir = path.join(os.homedir(), '.cli-manager');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  return path.join(configDir, 'data.db');
}

export function initDatabase(dbPath?: string): Database.Database {
  if (db) return db;

  const targetPath = dbPath || getDbPath();
  db = new Database(targetPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 自动执行迁移（同步）
  migrator = new Migrator(db);
  migrator.migrate();

  return db;
}

/** 获取 migrator 实例，用于测试或手动控制迁移 */
export function getMigrator(): Migrator {
  if (!migrator) {
    throw new Error('Migrator 未初始化，请先调用 initDatabase()');
  }
  return migrator;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    migrator = null;
  }
}

export function getDefaultConfig(): Config {
  return {
    ...DEFAULT_CONFIG,
    dbPath: getDbPath(),
  };
}
