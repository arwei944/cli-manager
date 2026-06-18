import os from 'node:os';

export type Platform = 'win32' | 'darwin' | 'linux';

export function getPlatform(): Platform {
  return os.platform() as Platform;
}

export function isWindows(): boolean {
  return getPlatform() === 'win32';
}

export function isMacOS(): boolean {
  return getPlatform() === 'darwin';
}

export function isLinux(): boolean {
  return getPlatform() === 'linux';
}

export function getPathEnv(): string {
  return process.env.PATH || '';
}

export function getPathSeparator(): string {
  return isWindows() ? ';' : ':';
}

export function getHomeDir(): string {
  return os.homedir();
}
