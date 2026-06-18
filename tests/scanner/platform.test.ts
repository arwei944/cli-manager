import { describe, it, expect } from 'vitest';
import { isWindows, getPlatform, getPathSeparator } from '../../src/utils/platform';

describe('platform - 平台检测', () => {
  it('应返回当前平台', () => {
    const platform = getPlatform();
    expect(['win32', 'darwin', 'linux']).toContain(platform);
  });

  it('应返回正确的路径分隔符', () => {
    const sep = getPathSeparator();
    if (isWindows()) {
      expect(sep).toBe(';');
    } else {
      expect(sep).toBe(':');
    }
  });
});
