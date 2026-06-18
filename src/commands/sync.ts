import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec } from '../utils/exec';
import { initDatabase } from '../db';
import { ToolRepo } from '../db/tool-repo';
import { createSpinner } from '../ui/spinner';
import { colors } from '../ui';

const toolRepo = new ToolRepo();

export async function syncCommand(action: string, options: { remote?: string }) {
  initDatabase();

  switch (action) {
    case 'push':
      await syncPush(options.remote);
      break;
    case 'pull':
      await syncPull(options.remote);
      break;
    default:
      console.log(colors.error('用法: sync push|pull [--remote <url>]'));
  }
}

async function syncPush(remote?: string) {
  const spinner = createSpinner('导出工具清单...');

  try {
    const tools = toolRepo.findAll();
    const snapshot = {
      exportedAt: new Date().toISOString(),
      hostname: os.hostname(),
      platform: process.platform,
      tools: tools.map(t => ({
        name: t.name,
        version: t.version,
        source: t.source,
        category: t.category,
        isPinned: t.isPinned,
        pinnedVersion: t.pinnedVersion,
      })),
    };

    const json = JSON.stringify(snapshot, null, 2);
    const syncDir = path.join(os.homedir(), '.cli-manager', 'sync');

    if (!fs.existsSync(syncDir)) {
      fs.mkdirSync(syncDir, { recursive: true });
    }

    const localFile = path.join(syncDir, `snapshot-${os.hostname()}.json`);
    fs.writeFileSync(localFile, json, 'utf-8');
    spinner.succeed(`本机快照已保存: ${localFile} (${tools.length} 个工具)`);

    // 推送到 Git 远程仓库
    if (remote) {
      const pushSpinner = createSpinner(`推送到 ${remote}...`);
      const gitDir = syncDir;

      // 初始化或更新 Git 仓库
      if (!fs.existsSync(path.join(gitDir, '.git'))) {
        exec(`git init`, { cwd: gitDir });
        exec(`git remote add origin ${remote}`, { cwd: gitDir });
      } else {
        const remoteResult = exec(`git remote`, { cwd: gitDir });
        if (!remoteResult.stdout.includes('origin')) {
          exec(`git remote add origin ${remote}`, { cwd: gitDir });
        }
      }

      exec(`git add -A`, { cwd: gitDir });
      exec(`git commit -m "sync: ${new Date().toISOString()}"`, { cwd: gitDir });
      const pushResult = exec(`git push -u origin master`, { cwd: gitDir, timeout: 30000 });

      if (pushResult.exitCode === 0) {
        pushSpinner.succeed('已推送到远程仓库');
      } else {
        pushSpinner.fail(`推送失败: ${pushResult.stderr}`);
      }
    } else {
      console.log(colors.dim('未指定 --remote，仅保存本地快照'));
    }
  } catch (error) {
    spinner.fail(`推送失败: ${error}`);
  }
}

async function syncPull(remote?: string) {
  if (!remote) {
    console.log(colors.error('请指定 --remote <url>'));
    return;
  }

  const spinner = createSpinner(`从 ${remote} 拉取...`);

  try {
    const syncDir = path.join(os.homedir(), '.cli-manager', 'sync');

    if (!fs.existsSync(syncDir)) {
      fs.mkdirSync(syncDir, { recursive: true });
    }

    // 如果已有仓库则先清理
    if (fs.existsSync(path.join(syncDir, '.git'))) {
      const pullResult = exec(`git pull origin master`, { cwd: syncDir, timeout: 30000 });
      if (pullResult.exitCode !== 0) {
        spinner.fail(`拉取失败: ${pullResult.stderr}`);
        return;
      }
    } else {
      const cloneResult = exec(`git clone ${remote} ${syncDir}`, { timeout: 30000 });
      if (cloneResult.exitCode !== 0) {
        spinner.fail(`克隆失败: ${cloneResult.stderr}`);
        return;
      }
    }

    spinner.succeed('已拉取远程快照');

    // 查找快照文件
    const files = fs.readdirSync(syncDir).filter(f => f.startsWith('snapshot-') && f.endsWith('.json'));

    if (files.length === 0) {
      console.log(colors.warning('未找到快照文件'));
      return;
    }

    console.log(`\n${colors.bold('可用快照')}`);
    for (const file of files) {
      const filePath = path.join(syncDir, file);
      const stat = fs.statSync(filePath);
      console.log(`  ${colors.info(file)} (${stat.size} 字节, ${stat.mtime.toLocaleString()})`);
    }

    console.log(colors.dim('\n使用 "cli-manager restore <file>" 恢复指定快照'));
  } catch (error) {
    spinner.fail(`拉取失败: ${error}`);
  }
}
