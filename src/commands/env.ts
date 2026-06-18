import { colors, createTable } from '../ui';

const CLI_RELATED_VARS = ['PATH', 'HOME', 'NODE_PATH', 'PYTHONPATH', 'GOPATH', 'RUSTUP_HOME', 'CARGO_HOME', 'NVM_HOME', 'NVM_SYMLINK', 'JAVA_HOME', 'GEM_PATH'];

export function envCommand(action?: string, name?: string, value?: string) {
  switch (action) {
    case 'get':
      if (!name) {
        console.log(colors.error('用法: env get <name>'));
        return;
      }
      console.log(`${colors.bold(name)}: ${process.env[name] || colors.dim('未设置')}`);
      break;

    case 'set':
      if (!name || !value) {
        console.log(colors.error('用法: env set <name> <value>'));
        return;
      }
      console.log(colors.info(`请手动设置环境变量:`));
      console.log(`  Windows: setx ${name} "${value}"`);
      console.log(`  Unix:    export ${name}="${value}"`);
      break;

    case 'list':
    default: {
      const rows: string[][] = [];
      for (const varName of CLI_RELATED_VARS) {
        const val = process.env[varName];
        if (val) {
          rows.push([varName, val.length > 50 ? val.slice(0, 50) + '...' : val]);
        }
      }
      console.log(`\n${colors.bold('CLI 相关环境变量')}`);
      console.log(createTable(
        [{ header: '变量名' }, { header: '值' }],
        rows,
      ));
      break;
    }
  }
}
