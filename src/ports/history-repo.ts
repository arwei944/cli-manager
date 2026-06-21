import type { ScanHistory, ScanResult } from '../types';
import type { VersionHistoryRow } from '../db/history-repo';

/** 历史数据访问层端口 */
export interface IHistoryRepository {
  addScanHistory(result: ScanResult): void;
  getScanHistory(limit?: number): ScanHistory[];
  getLastScan(): ScanHistory | null;
  addVersionChange(toolName: string, previousVersion: string | null, newVersion: string | null, operation: string): void;
  getVersionHistory(toolName: string, limit?: number): VersionHistoryRow[];
}
