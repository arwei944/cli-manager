import ora from 'ora';

export function createSpinner(text: string) {
  const spinner = ora({ text, color: 'cyan' }).start();
  return {
    succeed: (msg?: string) => spinner.succeed(msg || text),
    fail: (msg?: string) => spinner.fail(msg || text),
    update: (msg: string) => (spinner.text = msg),
  };
}
