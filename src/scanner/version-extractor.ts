import { execSync } from 'node:child_process';
import { isWindows } from '../utils/platform';

const versionCache = new Map<string, { version: string | null; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000;

const VERSION_FLAGS = ['--version', '-v'];
const VERSION_REGEX = /(\d+\.\d+\.\d+[\w.-]*)/;

const KNOWN_CLI_TOOLS = new Set([
  'node', 'npm', 'npx', 'pnpm', 'yarn',
  'python', 'python3', 'pip', 'pip3',
  'git', 'gh',
  'docker', 'docker-compose',
  'go', 'rustc', 'cargo',
  'java', 'javac', 'mvn', 'gradle',
  'ruby', 'gem',
  'php', 'composer',
  'gcc', 'g++', 'clang', 'make', 'cmake',
  'code', 'cursor',
  'vim', 'nvim', 'nano',
  'curl', 'wget',
  'jq', 'yq',
  'terraform', 'kubectl', 'helm',
  'aws', 'az', 'gcloud',
  'ffmpeg', 'ffprobe',
  'deno', 'bun',
  'dotnet',
  '7z', 'unzip',
  'rg', 'fd', 'bat', 'lsd',
  'tldr', 'htop', 'tmux',
  'openssl',
  'sqlite3',
]);

function execVersionCmd(command: string): string | null {
  const nullRedir = isWindows() ? '2>nul' : '2>/dev/null';
  try {
    const result = execSync(`${command} ${nullRedir}`, {
      encoding: 'utf-8',
      timeout: 2000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return result.trim() || null;
  } catch {
    return null;
  }
}

export function extractVersion(fullPath: string, name: string): string | null {
  if (!KNOWN_CLI_TOOLS.has(name.toLowerCase())) return null;

  const cached = versionCache.get(fullPath);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.version;
  }

  for (const flag of VERSION_FLAGS) {
    const output = execVersionCmd(`"${fullPath}" ${flag}`);
    if (output) {
      const match = output.match(VERSION_REGEX);
      if (match) {
        versionCache.set(fullPath, { version: match[1], timestamp: Date.now() });
        return match[1];
      }
    }
  }

  versionCache.set(fullPath, { version: null, timestamp: Date.now() });
  return null;
}

export function clearVersionCache(): void {
  versionCache.clear();
}
