import { migration as m001 } from './001-initial';

/** 静态注册所有迁移文件，避免动态 import 导致的异步问题 */
export const allMigrations = [m001];
