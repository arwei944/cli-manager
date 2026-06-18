import type { OutputFormat } from '../types';
import { colors } from './colors';
import { createTable, type Column } from './table';

export type FormatOptions = {
  format?: OutputFormat;
  noColor?: boolean;
};

export function formatOutput(data: Record<string, unknown>[] | Record<string, unknown>, columns: Column[], options: FormatOptions): string {
  if (options.noColor) {
    process.env.FORCE_COLOR = '0';
  }

  switch (options.format) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'text':
      return formatText(data, columns);
    case 'table':
    default:
      return formatTable(data, columns);
  }
}

function formatTable(data: Record<string, unknown>[] | Record<string, unknown>, columns: Column[]): string {
  const rows = Array.isArray(data)
    ? data.map(item => columns.map(col => String(item[col.header] ?? '')))
    : [columns.map(col => String(data[col.header] ?? ''))];
  return createTable(columns, rows);
}

function formatText(data: Record<string, unknown>[] | Record<string, unknown>, columns: Column[]): string {
  if (Array.isArray(data)) {
    return data.map(item =>
      columns.map(col => `${col.header}: ${item[col.header] ?? ''}`).join('\n')
    ).join('\n---\n');
  }
  return columns.map(col => `${col.header}: ${data[col.header] ?? ''}`).join('\n');
}

export function formatSummary(label: string, value: string | number): string {
  return `${colors.bold(label)}: ${value}`;
}

export { colors, createTable };
export type { Column };
