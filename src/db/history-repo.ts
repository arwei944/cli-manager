import { getDatabase } from './index';
import type { ScanHistory, ScanResult } from '../types';

export interface VersionHistoryRow {
  id: number;
  toolName: string;
  previousVersion: string | null;
  newVersion: string | null;
  operation: string;
  operatedAt: string;
}

export class HistoryRepo {
  addScanHistory(result: ScanResult): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO scan_history (scanType, startedAt, completedAt, totalFound, snapshot)
      VALUES (?, ?, ?, ?, ?)
    `).run(result.scanType, result.startedAt, result.completedAt, result.totalFound, JSON.stringify(result));
  }

  getScanHistory(limit = 10): ScanHistory[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM scan_history ORDER BY id DESC LIMIT ?').all(limit) as ScanHistory[];
    return rows;
  }

  getLastScan(): ScanHistory | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM scan_history ORDER BY id DESC LIMIT 1').get() as ScanHistory | undefined;
    return row || null;
  }

  addVersionChange(toolName: string, previousVersion: string | null, newVersion: string | null, operation: string): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO version_history (toolName, previousVersion, newVersion, operation)
      VALUES (?, ?, ?, ?)
    `).run(toolName, previousVersion, newVersion, operation);
  }

  getVersionHistory(toolName: string, limit = 20): VersionHistoryRow[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM version_history WHERE toolName = ? ORDER BY id DESC LIMIT ?').all(toolName, limit) as VersionHistoryRow[];
  }
}
