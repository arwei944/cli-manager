import { Scanner } from '../scanner';
import { initDatabase } from '../db';
import { colors } from '../ui/colors';
import { createTable } from '../ui/table';
import type { ScanType } from '../types';

export async function scanCommand(options: { full?: boolean; format?: string }) {
  initDatabase();

  const scanType: ScanType = options.full ? 'full' : 'incremental';
  const scanner = new Scanner();
  const result = await scanner.scan(scanType);

  const rows = [
    [String(result.totalFound), String(result.added), String(result.removed), String(result.changed), result.scanType],
  ];

  const table = createTable(
    [
      { header: '总计' },
      { header: '新增' },
      { header: '移除' },
      { header: '变更' },
      { header: '扫描类型' },
    ],
    rows,
  );

  console.log(`\n${colors.bold('扫描结果')}`);
  console.log(table);
  console.log(`开始: ${new Date(result.startedAt).toLocaleString()}`);
  console.log(`结束: ${new Date(result.completedAt).toLocaleString()}`);

  if (result.errors.length > 0) {
    console.log(`\n${colors.error('错误:')}`);
    result.errors.forEach(e => console.log(`  - ${e}`));
  }
}
