import chalk from 'chalk';

export const colors = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  highlight: chalk.cyan,
  cyan: chalk.cyan,
  magenta: chalk.magenta,
  white: chalk.white,
  red: chalk.red,
  green: chalk.green,
  yellow: chalk.yellow,
  blue: chalk.blue,
  gray: chalk.gray,
  dim: chalk.gray,
  bold: chalk.bold,
  header: chalk.bold.blue,
  category: (cat: string) => {
    const colorMap: Record<string, typeof chalk.green> = {
      dev: chalk.green,
      ai: chalk.magenta,
      system: chalk.yellow,
      editor: chalk.cyan,
      other: chalk.gray,
    };
    return (colorMap[cat] || chalk.white)(cat);
  },
  source: (src: string) => {
    const colorMap: Record<string, typeof chalk.green> = {
      system: chalk.red,
      npm: chalk.yellow,
      pip: chalk.green,
      scoop: chalk.blue,
      winget: chalk.cyan,
      choco: chalk.magenta,
      manual: chalk.gray,
    };
    return (colorMap[src] || chalk.white)(src);
  },
};
