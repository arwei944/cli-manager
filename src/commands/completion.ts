import { generatePowershellCompletion } from '../completion/powershell';
import { generateBashCompletion } from '../completion/bash';
import { generateZshCompletion } from '../completion/zsh';
import { isWindows, isMacOS, getHomeDir } from '../utils/platform';
import { colors } from '../ui/colors';
import fs from 'node:fs';
import path from 'node:path';

type ShellType = 'powershell' | 'bash' | 'zsh';

export function completionCommand(shell: string) {
  const validShells: ShellType[] = ['powershell', 'bash', 'zsh'];

  if (!shell || !validShells.includes(shell as ShellType)) {
    console.log(colors.error(`请指定 Shell 类型: ${validShells.join(' | ')}`));
    return;
  }

  const shellType = shell as ShellType;
  let content: string;
  let filename: string;

  switch (shellType) {
    case 'powershell':
      content = generatePowershellCompletion();
      filename = 'cli-manager.ps1';
      break;
    case 'bash':
      content = generateBashCompletion();
      filename = 'cli-manager.bash';
      break;
    case 'zsh':
      content = generateZshCompletion();
      filename = '_cli-manager';
      break;
  }

  // 保存到补全目录
  const completionDir = path.join(getHomeDir(), '.cli-manager', 'completion');
  if (!fs.existsSync(completionDir)) {
    fs.mkdirSync(completionDir, { recursive: true });
  }

  const filePath = path.join(completionDir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');

  console.log(colors.success(`✓ 补全脚本已生成: ${filePath}`));
  console.log(`\n${colors.bold('安装指南')}:`);

  switch (shellType) {
    case 'powershell':
      console.log(`  1. 打开 PowerShell 配置文件:`);
      console.log(`     ${colors.dim('notepad $PROFILE')}`);
      console.log(`  2. 添加以下内容:`);
      console.log(`     ${colors.dim(`. "${filePath}"`)}`);
      console.log(`  3. 重启 PowerShell`);
      break;
    case 'bash':
      console.log(`  在 ~/.bashrc 中添加:`);
      console.log(`     ${colors.dim(`source ${filePath}`)}`);
      console.log(`  然后执行: ${colors.dim('source ~/.bashrc')}`);
      break;
    case 'zsh':
      console.log(`  1. 将文件复制到 fpath 目录:`);
      console.log(`     ${colors.dim(`cp ${filePath} /usr/local/share/zsh/site-functions/`)}`);
      console.log(`  2. 或在 ~/.zshrc 中添加:`);
      console.log(`     ${colors.dim(`fpath=(${path.dirname(filePath)} $fpath)`)}`);
      console.log(`  3. 重新加载: ${colors.dim('exec zsh -l')}`);
      break;
  }

  // 检测当前平台推荐对应的 Shell
  const recommended = isWindows() ? 'powershell' : isMacOS() ? 'zsh' : 'bash';
  if (shellType !== recommended) {
    console.log(colors.dim(`\n提示: 当前平台推荐使用 ${recommended} 补全`));
  }
}
