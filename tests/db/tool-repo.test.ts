import { describe, it, expect, beforeEach } from 'vitest';
import { initDatabase, closeDatabase } from '../../src/db';
import { ToolRepo } from '../../src/db/tool-repo';

const makeTool = (overrides = {}) => ({
  id: 'test-' + Math.random().toString(36).slice(2, 8),
  name: 'test-tool-' + Math.random().toString(36).slice(2, 6),
  fullPath: '/usr/bin/test-tool',
  version: '1.0.0',
  source: 'npm' as const,
  category: 'dev',
  fileSize: 1024,
  fileType: 'exe',
  isSigned: false,
  modifiedAt: new Date().toISOString(),
  firstDetectedAt: new Date().toISOString(),
  lastDetectedAt: new Date().toISOString(),
  isPinned: false,
  pinnedVersion: null,
  pathPriority: 5,
  ...overrides,
});

function freshRepo(): { repo: ToolRepo; tool: ReturnType<typeof makeTool> } {
  closeDatabase();
  initDatabase(':memory:');
  const tool = makeTool();
  return { repo: new ToolRepo(), tool };
}

describe('ToolRepo', () => {
  beforeEach(() => {
    closeDatabase();
  });

  afterEach(() => {
    closeDatabase();
  });

  it('upsert 然后 findAll 应该能找到刚插入的工具', () => {
    const { repo, tool } = freshRepo();
    repo.upsert(tool);
    const all = repo.findAll();
    const found = all.find((t) => t.id === tool.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe(tool.name);
  });

  it('upsert 冲突时应该更新版本而不是重复插入', () => {
    const { repo, tool } = freshRepo();
    repo.upsert(tool);
    repo.upsert({ ...tool, version: '2.0.0' });
    const found = repo.findById(tool.id);
    expect(found!.version).toBe('2.0.0');
  });

  it('findByName 应该返回匹配的工具', () => {
    const { repo, tool } = freshRepo();
    repo.upsert(tool);
    const results = repo.findByName(tool.name);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toBe(tool.name);
  });

  it('findBySource 应该按来源过滤', () => {
    const { repo } = freshRepo();
    repo.upsert(makeTool({ source: 'pip' }));
    repo.upsert(makeTool({ source: 'npm' }));
    const pipTools = repo.findBySource('pip');
    expect(pipTools.every((t) => t.source === 'pip')).toBe(true);
  });

  it('findByCategory 应该按分类过滤', () => {
    const { repo } = freshRepo();
    repo.upsert(makeTool({ category: 'ai' }));
    repo.upsert(makeTool({ category: 'dev' }));
    const aiTools = repo.findByCategory('ai');
    expect(aiTools.length).toBeGreaterThanOrEqual(1);
    expect(aiTools.every((t) => t.category === 'ai')).toBe(true);
  });

  it('search 应该按名称或路径模糊匹配', () => {
    const { repo } = freshRepo();
    repo.upsert(makeTool({ name: 'my-search-tool', fullPath: '/opt/my-app/bin/tool' }));
    const byName = repo.search('my-search');
    const byPath = repo.search('/opt/my-app');
    expect(byName.length).toBeGreaterThanOrEqual(1);
    expect(byPath.length).toBeGreaterThanOrEqual(1);
  });

  it('count / countBySource / countByCategory 应该正确聚合', () => {
    const { repo } = freshRepo();
    repo.upsert(makeTool({ source: 'npm', category: 'dev' }));
    repo.upsert(makeTool({ source: 'npm', category: 'dev' }));
    repo.upsert(makeTool({ source: 'pip', category: 'ai' }));
    expect(repo.count()).toBeGreaterThanOrEqual(3);
    const bySource = repo.countBySource();
    expect(bySource.npm).toBeGreaterThanOrEqual(2);
    expect(bySource.pip).toBeGreaterThanOrEqual(1);
    const byCategory = repo.countByCategory();
    expect(byCategory.dev).toBeGreaterThanOrEqual(2);
  });

  it('delete 应该删除指定工具', () => {
    const { repo, tool } = freshRepo();
    repo.upsert(tool);
    repo.delete(tool.id);
    expect(repo.findById(tool.id)).toBeNull();
  });

  it('deleteByName 应该删除同名工具', () => {
    const { repo } = freshRepo();
    repo.upsert(makeTool({ id: 'del-1', name: 'delname' }));
    repo.upsert(makeTool({ id: 'del-2', name: 'delname' }));
    repo.deleteByName('delname');
    const remaining = repo.findByName('delname');
    expect(remaining.length).toBe(0);
  });

  it('updateCategory 更新工具分类', () => {
    const { repo, tool } = freshRepo();
    repo.upsert({ ...tool, category: 'other' });
    repo.updateCategory(tool.name, 'editor');
    const updated = repo.findById(tool.id);
    expect(updated!.category).toBe('editor');
  });

  it('updatePinStatus 更新锁定状态和版本', () => {
    const { repo, tool } = freshRepo();
    repo.upsert(tool);
    repo.updatePinStatus(tool.name, true, '3.0.0');
    const pinned = repo.findById(tool.id);
    expect(pinned!.isPinned).toBe(true);
    expect(pinned!.pinnedVersion).toBe('3.0.0');
    repo.updatePinStatus(tool.name, false, null);
    const unpinned = repo.findById(tool.id);
    expect(unpinned!.isPinned).toBe(false);
    expect(unpinned!.pinnedVersion).toBeNull();
  });
});
