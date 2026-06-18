import { getDatabase, getDbPath } from './index';
import type { Config, ScanInterval, OutputFormat, InstallSource } from '../types';
import { DEFAULT_CONFIG } from '../types';

export class ConfigRepo {
  get(): Config {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM config WHERE key = ?').get('config') as { value: string } | undefined;
    const defaultConfig: Config = {
      ...DEFAULT_CONFIG,
      dbPath: getDbPath(),
    };
    if (row) {
      return { ...defaultConfig, ...JSON.parse(row.value) };
    }
    return { ...defaultConfig };
  }

  set(config: Partial<Config>): void {
    const db = getDatabase();
    const current = this.get();
    const merged = { ...current, ...config };
    db.prepare(`
      INSERT INTO config (key, value) VALUES ('config', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(JSON.stringify(merged));
  }

  getScanInterval(): ScanInterval {
    return this.get().scanInterval;
  }

  getDefaultFormat(): OutputFormat {
    return this.get().defaultFormat;
  }

  getInstallSources(): InstallSource[] {
    return this.get().installSource;
  }

  isColorEnabled(): boolean {
    return this.get().colorEnabled;
  }
}
