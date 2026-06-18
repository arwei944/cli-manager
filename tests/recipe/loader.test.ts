import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadRecipeFromFile, loadRecipesFromDir } from '../../src/recipe/loader';
import type { Recipe } from '../../src/types';

describe('recipe loader', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-manager-test-'));

  afterEach(() => {
    // 清理测试文件
    for (const file of fs.readdirSync(tempDir)) {
      fs.unlinkSync(path.join(tempDir, file));
    }
  });

  it('应正确加载 YAML 配方', () => {
    const recipePath = path.join(tempDir, 'test.yml');
    fs.writeFileSync(recipePath, `
name: test-tool
displayName: Test Tool
description: A test tool
category: dev
sources:
  - type: npm
    packageName: test-tool
    executableName: test
versionCmd: 'test --version'
versionRegex: '(\\d+\\.\\d+\\.\\d+)'
`);

    const recipe = loadRecipeFromFile(recipePath);
    expect(recipe).not.toBeNull();
    expect(recipe!.name).toBe('test-tool');
    expect(recipe!.category).toBe('dev');
    expect(recipe!.sources.length).toBe(1);
    expect(recipe!.sources[0].type).toBe('npm');
  });

  it('应返回 null 当文件不存在', () => {
    const recipe = loadRecipeFromFile(path.join(tempDir, 'nonexistent.yml'));
    expect(recipe).toBeNull();
  });

  it('应从目录加载多个配方', () => {
    fs.writeFileSync(path.join(tempDir, 'a.yml'), 'name: a\ncategory: dev\nsources:\n  - type: npm\n    packageName: a');
    fs.writeFileSync(path.join(tempDir, 'b.yml'), 'name: b\ncategory: system\nsources:\n  - type: winget\n    packageName: b');

    const recipes = loadRecipesFromDir(tempDir);
    expect(recipes.length).toBe(2);
    expect(recipes.map(r => r.name).sort()).toEqual(['a', 'b']);
  });
});
