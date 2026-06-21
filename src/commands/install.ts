import { initDatabase } from '../db';
import { services } from '../composer/context';
import { colors } from '../ui/colors';
import { registry } from '../installer';
import { NpmInstaller } from '../installer/npm-installer';
import { PipInstaller } from '../installer/pip-installer';
import { GithubInstaller } from '../installer/github-installer';
import { ScoopInstaller } from '../installer/scoop-installer';
import { WingetInstaller } from '../installer/winget-installer';
import { ChocoInstaller } from '../installer/choco-installer';

/** 初始化所有安装器（仅执行一次） */
export function initInstallers(): void {
  if (registry.getAvailableSources().length > 0) return;
  registry.register(new NpmInstaller());
  registry.register(new PipInstaller());
  registry.register(new GithubInstaller());
  registry.register(new ScoopInstaller());
  registry.register(new WingetInstaller());
  registry.register(new ChocoInstaller());
}

export async function installCommand(name: string, options: { from?: string; dryRun?: boolean }) {
  initDatabase();
  initInstallers();

  const result = await services.installWorkflow.install(name, {
    from: options.from as any,
    dryRun: options.dryRun,
  });

  if (result.success) {
    console.log(colors.success(result.message));
  } else {
    console.log(colors.error(result.message));
  }
}

export async function uninstallCommand(name: string) {
  initDatabase();

  const result = await services.installWorkflow.uninstall(name);

  if (result.success) {
    console.log(colors.success(result.message));
  } else {
    console.log(colors.error(result.message));
  }
}
