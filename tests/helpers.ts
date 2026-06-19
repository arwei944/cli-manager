import { initDatabase, closeDatabase, getDbPath } from '../../src/db';

/** 为测试创建内存数据库，避免污染用户目录 */
export function createTestDb(): void {
  closeDatabase();
  initDatabase(':memory:');
}

/** 清理测试数据库（磁盘模式） */
export function cleanupTestDb(): void {
  closeDatabase();
  try {
    const { unlinkSync } = require('node:fs');
    unlinkSync(getDbPath());
  } catch {
    // 文件不存在时忽略
  }
}
