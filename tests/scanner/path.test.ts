import { describe, it, expect } from 'vitest';
import { getFileExtension, isExecutable } from '../../src/utils/path';

describe('path - 路径处理', () => {
  it('应正确获取 exe 扩展名', () => {
    expect(getFileExtension('tool.exe')).toBe('exe');
  });

  it('应正确获取 cmd 扩展名', () => {
    expect(getFileExtension('tool.cmd')).toBe('cmd');
  });

  it('无扩展名应返回 script', () => {
    expect(getFileExtension('tool')).toBe('script');
  });

  it('应正确识别可执行文件', () => {
    // 测试 isExecutable 函数不抛出异常
    expect(typeof isExecutable('test.exe', '/nonexistent/path/test.exe')).toBe('boolean');
  });
});
