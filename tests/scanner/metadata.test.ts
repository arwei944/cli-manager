import { describe, it, expect } from 'vitest';
import { autoCategorize, classifySource, deduplicateTools } from '../../src/scanner/metadata';
import type { ToolInfo } from '../../src/types';

describe('metadata - 自动分类', () => {
  it('应将 node 归类为 dev', () => {
    expect(autoCategorize('node', 'C:\\Program Files\\nodejs\\node.exe')).toBe('dev');
  });

  it('应将 python 归类为 dev', () => {
    expect(autoCategorize('python', '/usr/bin/python')).toBe('dev');
  });

  it('应将 git 归类为 dev', () => {
    expect(autoCategorize('git', '/usr/bin/git')).toBe('dev');
  });

  it('应将 vim 归类为 editor', () => {
    expect(autoCategorize('vim', '/usr/bin/vim')).toBe('editor');
  });

  it('应将未知工具归类为 other', () => {
    expect(autoCategorize('unknown-tool-xyz', '/some/path/unknown-tool-xyz')).toBe('other');
  });
});

describe('metadata - 来源分类', () => {
  it('应识别 npm 工具', () => {
    const npmTools = new Set(['/usr/lib/node_modules/pkg/bin/pkg']);
    const result = classifySource('/usr/lib/node_modules/pkg/bin/pkg', npmTools, new Set());
    expect(result).toBe('npm');
  });

  it('应识别 pip 工具', () => {
    const pipTools = new Set(['/usr/lib/python3/scripts/tool']);
    const result = classifySource('/usr/lib/python3/scripts/tool', new Set(), pipTools);
    expect(result).toBe('pip');
  });

  it('应识别 system 工具', () => {
    const result = classifySource('/usr/bin/ls', new Set(), new Set());
    expect(result).toBe('system');
  });
});

describe('metadata - 去重', () => {
  it('应保留优先级最高的工具', () => {
    const tools: ToolInfo[] = [
      createTool('node', '/path1/node', 1),
      createTool('node', '/path2/node', 0),
    ];
    const result = deduplicateTools(tools);
    expect(result.length).toBe(1);
    expect(result[0].pathPriority).toBe(0);
  });

  it('应保留不同名称的工具', () => {
    const tools: ToolInfo[] = [
      createTool('node', '/path/node', 0),
      createTool('npm', '/path/npm', 1),
    ];
    const result = deduplicateTools(tools);
    expect(result.length).toBe(2);
  });
});

function createTool(name: string, fullPath: string, priority: number): ToolInfo {
  return {
    id: `${name}@test`,
    name,
    fullPath,
    version: '1.0.0',
    source: 'system',
    category: 'dev',
    fileSize: 100,
    fileType: 'exe',
    isSigned: false,
    modifiedAt: new Date().toISOString(),
    firstDetectedAt: new Date().toISOString(),
    lastDetectedAt: new Date().toISOString(),
    isPinned: false,
    pinnedVersion: null,
    pathPriority: priority,
  };
}
