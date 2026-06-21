import type { ScanResult, ScanType } from '../types';

/** 扫描器端口 */
export interface IScanner {
  scan(scanType?: ScanType): Promise<ScanResult>;
}
