import type { CliPlugin } from '../index';

const helloWorldPlugin: CliPlugin = {
  name: 'hello-world',
  version: '1.0.0',
  description: 'Hello World 示例插件',
  commands: [
    {
      name: 'hello-world',
      description: '显示 Hello World 问候语',
      // @ts-ignore TS6133: options 为接口要求字段，示例子场景未直接使用
      action: (args: string[], options: Record<string, unknown>) => {
        const name = args[0] ?? '世界';
        console.log(`Hello, ${name}! 你好，这是来自 hello-world 插件的问候！`);
      },
    },
  ],
  hooks: {
    postScan: (...args: unknown[]) => {
      console.log('[hello-world 插件] postScan 钩子已触发，扫描参数:', JSON.stringify(args));
    },
  },
};

export default helloWorldPlugin;
