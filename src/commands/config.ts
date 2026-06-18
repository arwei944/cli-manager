import { initDatabase } from '../db';
import { ConfigRepo } from '../db/config-repo';
import { colors } from '../ui/colors';
import type { Config } from '../types';

const configRepo = new ConfigRepo();

export function configCommand(action?: string, key?: string, value?: string) {
  initDatabase();

  switch (action) {
    case 'get': {
      if (!key) {
        console.log(colors.error('用法: config get <key>'));
        return;
      }
      const config = configRepo.get();
      const cfg = config as unknown as Record<string, unknown>;
      if (key in cfg) {
        console.log(`${colors.bold(key)}: ${cfg[key]}`);
      } else {
        console.log(colors.error(`未知配置项: ${key}`));
      }
      break;
    }

    case 'set': {
      if (!key || !value) {
        console.log(colors.error('用法: config set <key> <value>'));
        return;
      }
      configRepo.set({ [key]: tryParseValue(value) } as unknown as Partial<Config>);
      console.log(colors.success(`配置已更新: ${key} = ${value}`));
      break;
    }

    case 'list':
    default: {
      const config = configRepo.get();
      console.log(`\n${colors.bold('当前配置')}`);
      for (const [k, v] of Object.entries(config)) {
        const display = Array.isArray(v) ? v.join(', ') : String(v);
        console.log(`  ${colors.info(k)}: ${display}`);
      }
      break;
    }
  }
}

function tryParseValue(value: string): string | boolean | number | null {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
  return value;
}
