import chalk from 'chalk';
import { isWindows, runCommand, formatBytes, formatCount } from '../utils/os-detect.js';
import { detectDBEngine } from '../utils/db-parser.js';
import { MeterRecorder } from '../meter/recorder.js';

/**
 * Compact database statistics — table sizes, row counts, index stats
 * Everything about your DB in ~20 lines instead of hundreds
 */
export async function dbstatsCommand(connection: string, filter?: string): Promise<void> {
  console.log(chalk.bold.hex('#7C3AED')(`\n  📈 ContextSlim DBSTATS${filter ? ` (filter: "${filter}")` : ''}\n`));

  if (!connection) {
    console.log(chalk.cyan('  Usage:'));
    console.log(chalk.white('    contextslim dbstats <connection> [filter]'));
    console.log('');
    console.log(chalk.cyan('  Examples:'));
    console.log(chalk.dim('    contextslim dbstats ./mydb.sqlite'));
    console.log(chalk.dim('    contextslim dbstats mysql://user:pass@localhost/mydb users'));
    console.log(chalk.dim('    contextslim dbstats postgres://user:pass@localhost/mydb'));
    console.log('');
    return;
  }

  try {
    const engine = await detectDBEngine(connection);

    if (engine === 'sqlite' || connection.endsWith('.db') || connection.endsWith('.sqlite') || connection.endsWith('.sqlite3')) {
      await sqliteStats(connection, filter);
    } else if (engine === 'mysql' || connection.includes('mysql')) {
      await mysqlStats(connection, filter);
    } else if (engine === 'postgres' || connection.includes('postgres')) {
      await postgresStats(connection, filter);
    } else {
      console.log(chalk.yellow('  Trying as SQLite...'));
      await sqliteStats(connection, filter);
    }
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
  }
}

async function sqliteStats(dbPath: string, filter?: string): Promise<void> {
  const shell = isWindows() ? 'cmd.exe' : '/bin/sh';

  // DB file size
  const { stat } = await import('node:fs/promises');
  let dbSize = 0;
  try {
    const s = await stat(dbPath);
    dbSize = s.size;
  } catch { /* skip */ }

  // Table count and row counts
  const tablesOutput = await runCommand(`sqlite3 "${dbPath}" ".tables"`, { shell });
  let tableNames = tablesOutput.split(/\s+/).filter((t) => t.trim() && !t.startsWith('sqlite_'));
  
  const totalTables = tableNames.length;
  if (filter) {
    tableNames = tableNames.filter((t) => t.toLowerCase().includes(filter.toLowerCase()));
  }

  console.log(chalk.cyan(`  Database: ${dbPath}`));
  console.log(chalk.cyan(`  Engine:   SQLite`));
  if (dbSize > 0) console.log(chalk.cyan(`  Size:     ${formatBytes(dbSize)}`));
  console.log(chalk.cyan(`  Tables:   ${tableNames.length} shown (of ${totalTables})`));
  console.log('');

  if (tableNames.length === 0) {
    console.log(chalk.dim('  (No tables found matching criteria)\n'));
    return;
  }

  console.log(chalk.dim('  TABLE                    ROWS       COLS'));
  console.log(chalk.dim('  ──────────────────────── ────────── ────'));

  let totalRows = 0;
  const rawLines: string[] = [];

  const MAX_TABLES_SHOWN = 30;
  const tablesToShow = tableNames.slice(0, MAX_TABLES_SHOWN);

  for (const table of tablesToShow) {
    let rowCount = 0;
    let colCount = 0;

    try {
      const countOutput = await runCommand(
        `sqlite3 "${dbPath}" "SELECT COUNT(*) FROM ${table};"`, { shell },
      );
      rowCount = parseInt(countOutput.trim()) || 0;
    } catch { /* skip */ }

    try {
      const pragmaOutput = await runCommand(
        `sqlite3 "${dbPath}" "PRAGMA table_info(${table});"`, { shell },
      );
      colCount = pragmaOutput.split(/\r?\n/).filter((l) => l.trim()).length;
    } catch { /* skip */ }

    totalRows += rowCount;

    const rowColor = rowCount > 100000 ? chalk.red
      : rowCount > 10000 ? chalk.yellow
      : chalk.green;

    const line = `  ${chalk.white(table.padEnd(25))}${rowColor(formatCount(rowCount).padStart(9).padEnd(11))}${chalk.dim(String(colCount))}`;
    console.log(line);
    rawLines.push(line);
  }

  if (tableNames.length > MAX_TABLES_SHOWN) {
    console.log(chalk.gray(`  ... +${tableNames.length - MAX_TABLES_SHOWN} more tables (use filter to narrow)`));
  }

  console.log(chalk.dim(`\n  Total: ${formatCount(totalRows)} rows across ${tableNames.length} tables`));

  const rawEstimate = tableNames.length * 300;
  const slimBytes = rawLines.join('\n').length;
  console.log(chalk.dim(`  (~${Math.round((1 - slimBytes / rawEstimate) * 100)}% token savings)\n`));
  MeterRecorder.recordCommand('dbstats', rawEstimate, slimBytes);
}

async function mysqlStats(connection: string, filter?: string): Promise<void> {
  let connArgs = connection;
  let dbName = connection;

  if (connection.includes('://')) {
    const url = new URL(connection);
    dbName = url.pathname.replace('/', '');
    connArgs = `-u${url.username} -p${url.password} -h${url.hostname}`;
    if (url.port) connArgs += ` -P${url.port}`;
    connArgs += ` ${dbName}`;
  }

  const shell = isWindows() ? 'cmd.exe' : '/bin/sh';

  // Get table stats from information_schema
  let query = `SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA='${dbName}'`;
  if (filter) {
    query += ` AND TABLE_NAME LIKE '%${filter}%'`;
  }
  query += ` ORDER BY DATA_LENGTH DESC;`;

  const output = await runCommand(`mysql ${connArgs} -e "${query}" -N`, { shell });
  const lines = output.split(/\r?\n/).filter((l) => l.trim());

  console.log(chalk.cyan(`  Database: ${dbName}`));
  console.log(chalk.cyan(`  Engine:   MySQL`));
  console.log(chalk.cyan(`  Tables:   ${lines.length}`));
  console.log('');
  
  if (lines.length === 0) {
    console.log(chalk.dim('  (No tables found matching criteria)\n'));
    return;
  }

  console.log(chalk.dim('  TABLE                    ROWS       DATA       INDEX'));
  console.log(chalk.dim('  ──────────────────────── ────────── ────────── ──────────'));

  let totalRows = 0;
  let totalData = 0;

  const MAX_TABLES_SHOWN = 30;
  const linesToShow = lines.slice(0, MAX_TABLES_SHOWN);

  for (const line of linesToShow) {
    const parts = line.split('\t');
    const table = parts[0] || '?';
    const rows = parseInt(parts[1]) || 0;
    const dataLen = parseInt(parts[2]) || 0;
    const idxLen = parseInt(parts[3]) || 0;

    totalRows += rows;
    totalData += dataLen;

    console.log(
      `  ${chalk.white(table.padEnd(25))}` +
      `${chalk.green(formatCount(rows).padStart(9).padEnd(11))}` +
      `${chalk.yellow(formatBytes(dataLen).padStart(9).padEnd(11))}` +
      `${chalk.dim(formatBytes(idxLen))}`,
    );
  }

  if (lines.length > MAX_TABLES_SHOWN) {
    console.log(chalk.gray(`  ... +${lines.length - MAX_TABLES_SHOWN} more tables (use filter keyword to narrow down)`));
  }

  console.log(chalk.dim(`\n  Total: ${formatCount(totalRows)} rows, ${formatBytes(totalData)} data\n`));
  MeterRecorder.recordCommand('dbstats', lines.length * 500, lines.length * 80);
}

async function postgresStats(connection: string, filter?: string): Promise<void> {
  let connArgs = connection;
  if (connection.includes('://')) connArgs = `"${connection}"`;

  const shell = isWindows() ? 'cmd.exe' : '/bin/sh';

  let filterSubquery = '';
  if (filter) {
    filterSubquery = ` WHERE relname ILIKE '%${filter}%'`;
  }
  const query = `SELECT relname, reltuples::bigint as rows, pg_relation_size(relid) as data_size, pg_indexes_size(relid) as idx_size FROM pg_stat_user_tables${filterSubquery} ORDER BY pg_relation_size(relid) DESC;`;

  const output = await runCommand(`psql ${connArgs} -t -c "${query}"`, { shell });
  const lines = output.split(/\r?\n/).filter((l) => l.trim());

  const dbName = connection.includes('://') ? new URL(connection).pathname.replace('/', '') : connection;
  console.log(chalk.cyan(`  Database: ${dbName}`));
  console.log(chalk.cyan(`  Engine:   PostgreSQL`));
  console.log(chalk.cyan(`  Tables:   ${lines.length}`));
  console.log('');
  
  if (lines.length === 0) {
    console.log(chalk.dim('  (No tables found matching criteria)\n'));
    return;
  }

  console.log(chalk.dim('  TABLE                    ROWS       DATA       INDEX'));
  console.log(chalk.dim('  ──────────────────────── ────────── ────────── ──────────'));

  const MAX_TABLES_SHOWN = 30;
  const linesToShow = lines.slice(0, MAX_TABLES_SHOWN);

  for (const line of linesToShow) {
    const parts = line.split('|').map((p) => p.trim());
    const table = parts[0] || '?';
    const rows = parseInt(parts[1]) || 0;
    const dataLen = parseInt(parts[2]) || 0;
    const idxLen = parseInt(parts[3]) || 0;

    console.log(
      `  ${chalk.white(table.padEnd(25))}` +
      `${chalk.green(formatCount(rows).padStart(9).padEnd(11))}` +
      `${chalk.yellow(formatBytes(dataLen).padStart(9).padEnd(11))}` +
      `${chalk.dim(formatBytes(idxLen))}`,
    );
  }

  if (lines.length > MAX_TABLES_SHOWN) {
    console.log(chalk.gray(`  ... +${lines.length - MAX_TABLES_SHOWN} more tables (use filter keyword to narrow down)`));
  }

  console.log('');
  MeterRecorder.recordCommand('dbstats', lines.length * 500, lines.length * 80);
}
