import { execSync, type ExecSyncOptions } from 'node:child_process';

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export function exec(command: string, options?: ExecSyncOptions): ExecResult {
  try {
    const raw = execSync(command, {
      encoding: 'utf-8',
      timeout: 10000,
      ...options,
    });
    const stdout = typeof raw === 'string' ? raw.trim() : raw.toString().trim();
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'stdout' in error && 'stderr' in error) {
      const execError = error as {
        stdout: Buffer | string;
        stderr: Buffer | string;
        status: number | null;
      };
      return {
        stdout: (execError.stdout || '').toString().trim(),
        stderr: (execError.stderr || '').toString().trim(),
        exitCode: execError.status,
      };
    }
    return { stdout: '', stderr: String(error), exitCode: 1 };
  }
}

export function execSafe(command: string, timeout = 5000): Promise<ExecResult> {
  return new Promise((resolve) => {
    try {
      const result = exec(command, { timeout });
      resolve(result);
    } catch {
      resolve({ stdout: '', stderr: '执行超时或失败', exitCode: 1 });
    }
  });
}
