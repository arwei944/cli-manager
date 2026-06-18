import * as readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initDatabase, closeDatabase } from '../db';
import { ConfigRepo } from '../db/config-repo';
import { Scanner } from '../scanner';
import { colors } from '../ui/colors';
import type { Config, ScanInterval, OutputFormat, InstallSource } from '../types';

const configRepo = new ConfigRepo();

export async function initCommand() {
  console.log(colors.bold('\n🔧 CLI 工具管理器 - 初始化配置向导'));
  console.log(colors.dim('='.repeat(50)));

  const configDir = path.join(os.homedir(), '.cli-manager');
  const dbPath = path.join(configDir, 'data.db');

  // 检查是否已初始化
  if (fs.existsSync(dbPath)) {
    const answer = await askQuestion('\n检测到已有配置，是否重新初始化？(y/N) ');
    if (answer.toLowerCase() !== 'y') {
      console.log(colors.dim('已取消初始化'));
      return;
    }
    closeDatabase();
  }

  // 创建配置目录
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log(colors.success(`✓ 创建配置目录: ${configDir}`));
  }

  // 步骤 1: 选择安装源
  console.log(colors.bold('\n📋 步骤 1/4: 选择启用的安装源'));
  console.log(colors.dim('  可选: npm, pip, gh, scoop, winget, choco'));
  const installSourceInput = await askQuestion('  启用的安装源 (逗号分隔，回车默认 npm,pip,gh): ');
  const installSource = parseInstallSources(installSourceInput || 'npm,pip,gh');
  console.log(colors.success(`  ✓ 已选择: ${installSource.join(', ')}`));

  // 步骤 2: 选择扫描频率
  console.log(colors.bold('\n📋 步骤 2/4: 选择扫描频率'));
  console.log(colors.dim('  1) daily  - 每日自动扫描'));
  console.log(colors.dim('  2) weekly - 每周自动扫描'));
  console.log(colors.dim('  3) manual - 仅手动扫描'));
  const scanChoice = await askQuestion('  选择 (1-3，回车默认 1): ');
  const scanInterval = parseScanInterval(scanChoice || '1');
  console.log(colors.success(`  ✓ 已选择: ${scanInterval}`));

  // 步骤 3: 选择输出格式
  console.log(colors.bold('\n📋 步骤 3/4: 选择默认输出格式'));
  console.log(colors.dim('  1) table - 表格形式 (推荐)'));
  console.log(colors.dim('  2) json  - JSON 格式'));
  console.log(colors.dim('  3) text  - 纯文本'));
  const formatChoice = await askQuestion('  选择 (1-3，回车默认 1): ');
  const defaultFormat = parseOutputFormat(formatChoice || '1');
  console.log(colors.success(`  ✓ 已选择: ${defaultFormat}`));

  // 步骤 4: 选择颜色主题
  console.log(colors.bold('\n📋 步骤 4/4: 是否启用彩色输出？'));
  const colorChoice = await askQuestion('  (Y/n): ');
  const colorEnabled = colorChoice.toLowerCase() !== 'n';
  console.log(colors.success(`  ✓ 彩色输出: ${colorEnabled ? '启用' : '禁用'}`));

  // 保存配置
  const config: Partial<Config> = {
    scanInterval,
    autoUpdateCheck: true,
    colorEnabled,
    defaultFormat,
    installSource,
    dbPath,
  };

  initDatabase(dbPath);
  configRepo.set(config);
  console.log(colors.success('\n✓ 配置已保存'));

  // 执行首次扫描
  console.log(colors.bold('\n🔍 执行首次全量扫描...'));
  const scanner = new Scanner();
  const result = await scanner.scan('full');

  console.log(colors.bold('\n✨ 初始化完成！'));
  console.log(colors.dim('='.repeat(50)));
  console.log(`  工具总数: ${colors.info(String(result.totalFound))}`);
  console.log(`  数据库: ${colors.info(dbPath)}`);
  console.log(colors.dim('\n  输入 "cli-manager --help" 查看所有命令'));
  console.log(colors.dim('  输入 "cli-manager list" 查看已扫描的工具'));
}

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function parseInstallSources(input: string): InstallSource[] {
  const valid: InstallSource[] = ['npm', 'pip', 'gh', 'scoop', 'winget', 'choco'];
  const parts = input.split(',').map(s => s.trim().toLowerCase() as InstallSource);
  return parts.filter(p => valid.includes(p));
}

function parseScanInterval(choice: string): ScanInterval {
  switch (choice) {
    case '2': return 'weekly';
    case '3': return 'manual';
    default: return 'daily';
  }
}

function parseOutputFormat(choice: string): OutputFormat {
  switch (choice) {
    case '2': return 'json';
    case '3': return 'text';
    default: return 'table';
  }
}
