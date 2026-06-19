import { getDatabase } from './index';
import type { ToolInfo, ToolSource, ToolCategory, FileType } from '../types';

export interface ToolRow {
  id: string;
  name: string;
  fullPath: string;
  version: string | null;
  source: string;
  category: string;
  fileSize: number;
  fileType: string;
  isSigned: number;
  modifiedAt: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  isPinned: number;
  pinnedVersion: string | null;
  pathPriority: number;
  tags: string;
}

function rowToTool(row: ToolRow): ToolInfo {
  return {
    id: row.id,
    name: row.name,
    fullPath: row.fullPath,
    version: row.version,
    source: row.source as ToolSource,
    category: row.category as ToolCategory,
    fileSize: row.fileSize,
    fileType: row.fileType as FileType,
    isSigned: row.isSigned === 1,
    modifiedAt: row.modifiedAt,
    firstDetectedAt: row.firstDetectedAt,
    lastDetectedAt: row.lastDetectedAt,
    isPinned: row.isPinned === 1,
    pinnedVersion: row.pinnedVersion,
    pathPriority: row.pathPriority,
    tags: row.tags || '',
  };
}

export class ToolRepo {
  findAll(): ToolInfo[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM tools ORDER BY name ASC, pathPriority ASC').all() as ToolRow[];
    return rows.map(rowToTool);
  }

  findByName(name: string): ToolInfo[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM tools WHERE name = ? ORDER BY pathPriority ASC').all(name) as ToolRow[];
    return rows.map(rowToTool);
  }

  findById(id: string): ToolInfo | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM tools WHERE id = ?').get(id) as ToolRow | undefined;
    return row ? rowToTool(row) : null;
  }

  findBySource(source: ToolSource): ToolInfo[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM tools WHERE source = ? ORDER BY name ASC').all(source) as ToolRow[];
    return rows.map(rowToTool);
  }

  findByCategory(category: ToolCategory): ToolInfo[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM tools WHERE category = ? ORDER BY name ASC').all(category) as ToolRow[];
    return rows.map(rowToTool);
  }

  search(keyword: string): ToolInfo[] {
    const db = getDatabase();
    const pattern = `%${keyword}%`;
    const rows = db.prepare('SELECT * FROM tools WHERE name LIKE ? OR fullPath LIKE ? ORDER BY name ASC').all(pattern, pattern) as ToolRow[];
    return rows.map(rowToTool);
  }

  upsert(tool: ToolInfo): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO tools (id, name, fullPath, version, source, category, fileSize, fileType, isSigned, modifiedAt, firstDetectedAt, lastDetectedAt, isPinned, pinnedVersion, pathPriority, tags)
      VALUES (@id, @name, @fullPath, @version, @source, @category, @fileSize, @fileType, @isSigned, @modifiedAt, @firstDetectedAt, @lastDetectedAt, @isPinned, @pinnedVersion, @pathPriority, @tags)
      ON CONFLICT(id) DO UPDATE SET
        version = excluded.version,
        source = excluded.source,
        fileSize = excluded.fileSize,
        fileType = excluded.fileType,
        isSigned = excluded.isSigned,
        modifiedAt = excluded.modifiedAt,
        lastDetectedAt = excluded.lastDetectedAt,
        pathPriority = excluded.pathPriority,
        tags = excluded.tags
    `).run({
      id: tool.id,
      name: tool.name,
      fullPath: tool.fullPath,
      version: tool.version,
      source: tool.source,
      category: tool.category,
      fileSize: tool.fileSize,
      fileType: tool.fileType,
      isSigned: tool.isSigned ? 1 : 0,
      modifiedAt: tool.modifiedAt,
      firstDetectedAt: tool.firstDetectedAt,
      lastDetectedAt: tool.lastDetectedAt,
      isPinned: tool.isPinned ? 1 : 0,
      pinnedVersion: tool.pinnedVersion,
      pathPriority: tool.pathPriority,
      tags: tool.tags || '',
    });
  }

  delete(id: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM tools WHERE id = ?').run(id);
  }

  deleteByName(name: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM tools WHERE name = ?').run(name);
  }

  count(): number {
    const db = getDatabase();
    const result = db.prepare('SELECT COUNT(*) as count FROM tools').get() as { count: number };
    return result.count;
  }

  countBySource(): Record<string, number> {
    const db = getDatabase();
    const rows = db.prepare('SELECT source, COUNT(*) as count FROM tools GROUP BY source').all() as { source: string; count: number }[];
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.source] = row.count;
    }
    return result;
  }

  countByCategory(): Record<string, number> {
    const db = getDatabase();
    const rows = db.prepare('SELECT category, COUNT(*) as count FROM tools GROUP BY category').all() as { category: string; count: number }[];
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.category] = row.count;
    }
    return result;
  }

  updateCategory(name: string, category: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tools SET category = ? WHERE name = ?').run(category, name);
  }

  updatePinStatus(name: string, isPinned: boolean, pinnedVersion?: string | null): void {
    const db = getDatabase();
    db.prepare('UPDATE tools SET isPinned = ?, pinnedVersion = ? WHERE name = ?').run(isPinned ? 1 : 0, pinnedVersion ?? null, name);
  }

  updateTags(id: string, tags: string): void {
    const db = getDatabase();
    db.prepare('UPDATE tools SET tags = ? WHERE id = ?').run(tags, id);
  }
}
