import { describe, it, expect } from 'vitest';
import { NpmInstaller } from '../../src/installer/npm-installer';
import { PipInstaller } from '../../src/installer/pip-installer';
import { WingetInstaller } from '../../src/installer/winget-installer';
import { ChocoInstaller } from '../../src/installer/choco-installer';
import { ScoopInstaller } from '../../src/installer/scoop-installer';
import { GithubInstaller } from '../../src/installer/github-installer';
import { registry } from '../../src/installer';

describe('installer registry', () => {
  it('应注册所有安装器', () => {
    registry.register(new NpmInstaller());
    registry.register(new PipInstaller());
    registry.register(new WingetInstaller());
    registry.register(new ChocoInstaller());
    registry.register(new ScoopInstaller());
    registry.register(new GithubInstaller());

    const sources = registry.getAvailableSources();
    expect(sources).toContain('npm');
    expect(sources).toContain('pip');
    expect(sources).toContain('winget');
    expect(sources).toContain('choco');
    expect(sources).toContain('scoop');
    expect(sources).toContain('gh');
  });

  it('应根据来源获取安装器', () => {
    const installer = registry.get('npm');
    expect(installer).toBeDefined();
    expect(installer?.source).toBe('npm');
  });
});

describe('installer interface', () => {
  it('NpmInstaller 应实现 correct source', () => {
    const installer = new NpmInstaller();
    expect(installer.source).toBe('npm');
  });

  it('PipInstaller 应实现 correct source', () => {
    const installer = new PipInstaller();
    expect(installer.source).toBe('pip');
  });
});
