import Table from 'cli-table3';

export interface Column {
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: number;
}

export function createTable(headers: Column[], rows: string[][]): string {
  const colWidths = headers.map(h => h.width || Math.max(h.header.length + 2, 20));
  const table = new Table({
    head: headers.map(h => h.header),
    colWidths,
    style: {
      border: ['gray'],
    },
  });
  rows.forEach(row => table.push(row));
  return table.toString();
}
