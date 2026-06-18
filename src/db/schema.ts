export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fullPath TEXT NOT NULL,
  version TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  category TEXT NOT NULL DEFAULT 'other',
  fileSize INTEGER NOT NULL DEFAULT 0,
  fileType TEXT NOT NULL DEFAULT 'exe',
  isSigned INTEGER NOT NULL DEFAULT 0,
  modifiedAt TEXT NOT NULL DEFAULT '',
  firstDetectedAt TEXT NOT NULL DEFAULT (datetime('now')),
  lastDetectedAt TEXT NOT NULL DEFAULT (datetime('now')),
  isPinned INTEGER NOT NULL DEFAULT 0,
  pinnedVersion TEXT,
  pathPriority INTEGER NOT NULL DEFAULT 999
);

CREATE TABLE IF NOT EXISTS scan_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scanType TEXT NOT NULL,
  startedAt TEXT NOT NULL,
  completedAt TEXT NOT NULL,
  totalFound INTEGER NOT NULL DEFAULT 0,
  snapshot TEXT
);

CREATE TABLE IF NOT EXISTS version_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  toolName TEXT NOT NULL,
  previousVersion TEXT,
  newVersion TEXT,
  operation TEXT NOT NULL,
  operatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tools_name ON tools(name);
CREATE INDEX IF NOT EXISTS idx_tools_source ON tools(source);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_version_history_tool ON version_history(toolName);
`;
