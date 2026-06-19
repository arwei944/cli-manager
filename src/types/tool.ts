export type ToolSource = 'system' | 'npm' | 'pip' | 'scoop' | 'winget' | 'choco' | 'manual' | 'gh';

export type FileType = 'exe' | 'ps1' | 'cmd' | 'bat' | 'script';

export type ToolCategory = 'dev' | 'ai' | 'system' | 'editor' | 'other';

export interface ToolInfo {
  id: string;
  name: string;
  fullPath: string;
  version: string | null;
  source: ToolSource;
  category: ToolCategory;
  fileSize: number;
  fileType: FileType;
  isSigned: boolean;
  modifiedAt: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  isPinned: boolean;
  pinnedVersion: string | null;
  pathPriority: number;
  tags?: string;
}

export type ScanType = 'full' | 'incremental';

export interface ScanResult {
  scanType: ScanType;
  startedAt: string;
  completedAt: string;
  totalFound: number;
  added: number;
  removed: number;
  changed: number;
  errors: string[];
}

export interface ScanHistory {
  id: number;
  scanType: ScanType;
  startedAt: string;
  completedAt: string;
  totalFound: number;
  snapshot: string;
}
