import Database from 'better-sqlite3';
import type { Migration } from './migration';

// 将原本在 schema.ts 中的 SCHEMA_SQL 提取为迁移文件
// 该迁移创建所有初始表（tools、scan_history、version_history、config）及相关索引

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fullPath TEXT NOT NULL,
  version TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  category TEXT NOT NULL DEFAULT 'other',
  fileSize INTEGER NOT NULL DEFAULT 0,
  fileType TEXT NOT NULL DEFAULT 'exe',
  isSigned INTEGER NOT NULL DEFAULT 0,
  modifiedAt TEXT NOT NULL DEFAULT '',
  firstDetectedAt TEXT NOT NULL DEFAULT (datetime('now')),
  lastDetectedAt TEXT NOT NULL DEFAULT (datetime('now')),
  isPinned INTEGER NOT NULL DEFAULT 0,
  pinnedVersion TEXT,
  pathPriority INTEGER NOT NULL DEFAULT 999
);

CREATE TABLE IF NOT EXISTS scan_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scanType TEXT NOT NULL,
  startedAt TEXT NOT NULL,
  completedAt TEXT NOT NULL,
  totalFound INTEGER NOT NULL DEFAULT 0,
  snapshot TEXT
);

CREATE TABLE IF NOT EXISTS version_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  toolName TEXT NOT NULL,
  previousVersion TEXT,
  newVersion TEXT,
  operation TEXT NOT NULL,
  operatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tools_name ON tools(name);
CREATE INDEX IF NOT EXISTS idx_tools_source ON tools(source);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_version_history_tool ON version_history(toolName);
`;

export const migration: Migration = {
  version: 1,
  description: '创建初始表结构（tools、scan_history、version_history、config）',
  up(db: Database.Database): void {
    db.exec(SCHEMA_SQL);
  },
  down(db: Database.Database): void {
    db.exec(`
      DROP TABLE IF EXISTS tools;
      DROP TABLE IF EXISTS scan_history;
      DROP TABLE IF EXISTS version_history;
      DROP TABLE IF EXISTS config;
    `);
  },
};

// 导出默认对象，便于 migrator 动态导入识别
export default migration;
