export type ScanInterval = 'daily' | 'weekly' | 'manual';

export type OutputFormat = 'table' | 'json' | 'text';

export type InstallSource = 'npm' | 'pip' | 'gh' | 'scoop' | 'winget' | 'choco';

export interface Config {
  scanInterval: ScanInterval;
  autoUpdateCheck: boolean;
  colorEnabled: boolean;
  defaultFormat: OutputFormat;
  installSource: InstallSource[];
  dbPath: string;
}

export const DEFAULT_CONFIG: Config = {
  scanInterval: 'daily',
  autoUpdateCheck: true,
  colorEnabled: true,
  defaultFormat: 'table',
  installSource: ['npm', 'pip', 'gh'],
  dbPath: '',
};
