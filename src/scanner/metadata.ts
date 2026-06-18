import type { ToolInfo, ToolCategory, ToolSource } from '../types';

const NPM_PATTERNS = [/node_modules[\\/]/i, /npm[\\/]/i];
const PIP_PATTERNS = [/python/i, /site-packages[\\/]/i, /Scripts[\\/]/i];
const SCOOP_PATTERNS = [/scoop[\\/]/i, /apps[\\/]/i];
const WINGET_PATTERNS = [/winget[\\/]/i, /WindowsApps[\\/]/i];
const CHOCO_PATTERNS = [/chocolatey[\\/]/i];

const CATEGORY_MAP: Array<{ patterns: RegExp[]; category: ToolCategory }> = [
  {
    patterns: [/node/i, /python/i, /gcc/i, /clang/i, /make/i, /cmake/i, /git/i, /docker/i, /kubectl/i, /helm/i, /terraform/i, /ansible/i, /mvn/i, /gradle/i, /cargo/i, /rust/i, /go[^o]/i, /java/i, /javac/i, /npm/i, /yarn/i, /pnpm/i, /npx/i],
    category: 'dev',
  },
  {
    patterns: [/ollama/i, /llama/i, /whisper/i, /diffusers/i, /transformers/i, /openai/i],
    category: 'ai',
  },
  {
    // editor 放在 system 之前，确保 vim/nano 等编辑器优先匹配
    patterns: [/code[\\/]?$/i, /cursor/i, /vim/i, /nvim/i, /neovim/i, /notepad/i, /subl/i, /atom/i, /emacs/i, /nano/i],
    category: 'editor',
  },
  {
    patterns: [/system32/i, /syswow64/i, /windows[\\/]/i, /usr[\\/]bin/i, /grep/i, /awk/i, /sed/i, /\bls\b/i, /\bps\b/i, /top/i],
    category: 'system',
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
