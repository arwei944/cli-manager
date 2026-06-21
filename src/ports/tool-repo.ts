import type { ToolInfo, ToolSource, ToolCategory } from '../types';

/** 工具数据访问层端口 */
export interface IToolRepository {
  findAll(): ToolInfo[];
  findByName(name: string): ToolInfo[];
  findById(id: string): ToolInfo | null;
  findBySource(source: ToolSource): ToolInfo[];
  findByCategory(category: ToolCategory): ToolInfo[];
  search(keyword: string): ToolInfo[];
  upsert(tool: ToolInfo): void;
  delete(id: string): void;
  deleteByName(name: string): void;
  count(): number;
  countBySource(): Record<string, number>;
  countByCategory(): Record<string, number>;
  updateCategory(name: string, category: string): void;
  updatePinStatus(name: string, isPinned: boolean, pinnedVersion?: string | null): void;
  updateTags(id: string, tags: string): void;
}
