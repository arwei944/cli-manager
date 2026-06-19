import Database from 'better-sqlite3';
import type { Migration } from './migration';

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const cols = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

export const migration: Migration = {
  version: 2,
  description: '为 tools 表添加 tags 字段',
  up(db: Database.Database): void {
    if (!hasColumn(db, 'tools', 'tags')) {
      db.exec(`ALTER TABLE tools ADD COLUMN tags TEXT NOT NULL DEFAULT ''`);
    }
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tools_tags ON tools(tags)`);
  },
  down(db: Database.Database): void {
    // SQLite 不支持 DROP COLUMN，重建表
    db.exec(`
      CREATE TABLE tools_new AS SELECT id, name, fullPath, version, source, category, fileSize, fileType, isSigned, modifiedAt, firstDetectedAt, lastDetectedAt, isPinned, pinnedVersion, pathPriority FROM tools;
      DROP TABLE tools;
      ALTER TABLE tools_new RENAME TO tools;
      CREATE INDEX idx_tools_name ON tools(name);
      CREATE INDEX idx_tools_source ON tools(source);
      CREATE INDEX idx_tools_category ON tools(category);
    `);
  },
};

export default migration;
