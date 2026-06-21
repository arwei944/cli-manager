import type { ToolInfo, ToolCategory, ToolSource } from '../types';

const NPM_PATTERNS = [/node_modules[\\/]/i, /npm[\\/]/i];
const PIP_PATTERNS = [/python/i, /site-packages[\\/]/i, /Scripts[\\/]/i];
const SCOOP_PATTERNS = [/scoop[\\/]/i, /apps[\\/]/i];
const WINGET_PATTERNS = [/winget[\\/]/i, /WindowsApps[\\/]/i];
const CHOCO_PATTERNS = [/chocolatey[\\/]/i];

const CATEGORY_MAP: Array<{ patterns: RegExp[]; category: ToolCategory }> = [
  {
    // 编程语言与运行时 + 版本控制
    patterns: [/^node$/, /^npm$/, /^npx$/, /^pnpm$/, /^yarn$/, /^bun$/, /^deno$/, /python[23]?/, /^pip[23]?$/, /^ruby$/, /^gem$/, /^java$/, /^javac$/, /^go$/, /^rustc$/, /^cargo$/, /^php$/, /^composer$/, /^dotnet$/, /^mvn$/, /^gradle$/, /^sbt$/, /^cabal$/, /^stack$/, /^mix$/, /^elixir$/, /^nim$/, /^zig$/, /^dart$/, /^flutter$/, /^git$/, /^gh$/],
    category: 'dev',
  },
  {
    // AI / ML
    patterns: [/ollama/i, /llama/i, /whisper/i, /diffusers/i, /transformers/i, /openai/i, /langchain/i, /llamacpp/i, /stable/i, /comfy/i, /invokeai/i],
    category: 'ai',
  },
  {
    // 编辑器 / IDE
    patterns: [/code$/, /^cursor$/, /^vim$/, /^nvim$/, /^nano$/, /^emacs$/, /^subl$/, /^atom$/, /^notepad/, /^zed$/],
    category: 'editor',
  },
  {
    // 系统工具 / Shell
    patterns: [/system32/i, /syswow64/i, /windows[\\/]/i, /^grep$/, /^awk$/, /^sed$/, /\bls\b/i, /\bps\b/i, /^top$/, /^htop$/, /^tmux$/, /^zsh$/, /^bash$/, /^fish$/, /^powershell$/i, /^pwsh$/i, /^cmd$/i, /^winget$/i, /^choco$/],
    category: 'system',
  },
  {
    // 数据库
    patterns: [/^mysql$/, /^mariadb$/, /^psql$/, /^sqlite3$/, /^mongo$/, /^redis$/, /^redis-cli$/, /^memcached$/, /^postgres$/, /^mongoexport$/, /^mongod$/, /^mongos$/],
    category: 'other',
  },
  {
    // 容器与编排
    patterns: [/^docker$/, /^docker-compose$/, /^kubectl$/, /^helm$/, /^k9s$/, /^kind$/, /^minikube$/, /^skaffold$/, /^istioctl$/, /^argocd$/],
    category: 'other',
  },
  {
    // 云厂商 CLI
    patterns: [/^aws$/, /^az$/, /^gcloud$/, /^ibmcloud$/, /^doctl$/, /^flyctl$/, /^vercel$/, /^netlify$/, /^heroku$/, /^firebase$/],
    category: 'other',
  },
  {
    // 常用工具保留在 dev/other 兜底
    patterns: [],
    category: 'other',
  },
];

export function classifySource(fullPath: string, npmTools: Set<string>, pipTools: Set<string>): ToolSource {
  if (npmTools.has(fullPath)) return 'npm';
  if (pipTools.has(fullPath)) return 'pip';

  for (const pattern of NPM_PATTERNS) {
    if (pattern.test(fullPath)) return 'npm';
  }
  for (const pattern of PIP_PATTERNS) {
    if (pattern.test(fullPath)) return 'pip';
  }
  for (const pattern of SCOOP_PATTERNS) {
    if (pattern.test(fullPath)) return 'scoop';
  }
  for (const pattern of WINGET_PATTERNS) {
    if (pattern.test(fullPath)) return 'winget';
  }
  for (const pattern of CHOCO_PATTERNS) {
    if (pattern.test(fullPath)) return 'choco';
  }

  return 'system';
}

export function autoCategorize(name: string, fullPath: string): ToolCategory {
  for (const { patterns, category } of CATEGORY_MAP) {
    for (const pattern of patterns) {
      if (pattern.test(name) || pattern.test(fullPath)) {
        return category;
      }
    }
  }
  return 'other';
}

export function deduplicateTools(tools: ToolInfo[]): ToolInfo[] {
  const sorted = [...tools].sort((a, b) => a.pathPriority - b.pathPriority);

  const seen = new Map<string, ToolInfo>();
  for (const tool of sorted) {
    const existing = seen.get(tool.name);
    if (!existing) {
      seen.set(tool.name, tool);
    } else {
      if (tool.pathPriority < existing.pathPriority) {
        seen.set(tool.name, tool);
      }
    }
  }

  return Array.from(seen.values());
}
