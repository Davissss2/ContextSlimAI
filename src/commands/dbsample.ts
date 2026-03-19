import chalk from 'chalk';
import { isWindows, runCommand } from '../utils/os-detect.js';
import { detectDBEngine, compressQueryOutput, compressMongoOutput } from '../utils/db-parser.js';
import { ConfigManager } from '../utils/config.js';
import { MeterRecorder } from '../meter/recorder.js';

/**
 * Show sample rows from a database table — quick data preview
 * No need to write SELECT queries, just provide table name
 * Automatically limits and formats output
 */
export async function dbsampleCommand(table: string, connection?: string): Promise<void> {
  console.log(chalk.bold.hex('#7C3AED')('\n  📝 ContextSlim DBSAMPLE\n'));

  if (!table) {
    console.log(chalk.cyan('  Usage:'));
    console.log(chalk.white('    contextslim dbsample <table> <connection>'));
    console.log('');
    console.log(chalk.cyan('  Examples:'));
    console.log(chalk.dim('    contextslim dbsample users ./mydb.sqlite'));
    console.log(chalk.dim('    contextslim dbsample orders mysql://user:pass@localhost/mydb'));
    console.log('');
    return;
  }

  if (!connection) {
    console.log(chalk.yellow('  ⚠️  Connection required. Use: contextslim dbsample <table> <connection>\n'));
    return;
  }

  const config = ConfigManager.loadConfig();
  const sampleRows = (config.limits as any).dbSampleRows ?? 5;

  try {
    const engine = await detectDBEngine(connection);
    let rawOutput: string;

    if (engine === 'sqlite' || connection.endsWith('.db') || connection.endsWith('.sqlite') || connection.endsWith('.sqlite3')) {
      rawOutput = await runCommand(
        `sqlite3 -header -column "${connection}" "SELECT * FROM ${table} LIMIT ${sampleRows};"`,
        { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
      );
    } else if (engine === 'mysql' || connection.includes('mysql')) {
      let connArgs = connection;
      if (connection.includes('://')) {
        const url = new URL(connection);
        const dbName = url.pathname.replace('/', '');
        connArgs = `-u${url.username} -p${url.password} -h${url.hostname}`;
        if (url.port) connArgs += ` -P${url.port}`;
        connArgs += ` ${dbName}`;
      }
      rawOutput = await runCommand(
        `mysql ${connArgs} -e "SELECT * FROM ${table} LIMIT ${sampleRows};" -t`,
        { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
      );
    } else if (engine === 'postgres' || connection.includes('postgres')) {
      let connArgs = connection;
      if (connection.includes('://')) connArgs = `"${connection}"`;
      rawOutput = await runCommand(
        `psql ${connArgs} -c "SELECT * FROM ${table} LIMIT ${sampleRows};"`,
        { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
      );
    } else if (engine === 'mongodb' || connection.includes('mongo')) {
      rawOutput = await runCommand(
        `mongosh "${connection}" --eval "db.${table}.find().limit(${sampleRows}).toArray()" --quiet`,
        { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
      );
      const compressed = compressMongoOutput(rawOutput, sampleRows);
      console.log(chalk.cyan(`  Table: ${table} (sample of ${sampleRows} rows)\n`));
      console.log(compressed);
      const rawBytes = Buffer.byteLength(rawOutput, 'utf-8');
      const slimBytes = Buffer.byteLength(compressed, 'utf-8');
      console.log(chalk.dim(`\n  (~${Math.round((1 - slimBytes / rawBytes) * 100)}% token savings)\n`));
      MeterRecorder.recordCommand('dbsample', rawBytes, slimBytes);
      return;
    } else {
      rawOutput = await runCommand(
        `sqlite3 -header -column "${connection}" "SELECT * FROM ${table} LIMIT ${sampleRows};"`,
        { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
      );
    }

    console.log(chalk.cyan(`  Table: ${table} (sample of ${sampleRows} rows)\n`));

    const compressed = compressQueryOutput(rawOutput, {
      maxRows: sampleRows,
      maxColWidth: 35,
    });

    console.log(compressed);

    const rawBytes = Buffer.byteLength(rawOutput, 'utf-8');
    const slimBytes = Buffer.byteLength(compressed, 'utf-8');
    console.log(chalk.dim(`\n  (~${Math.round((1 - slimBytes / rawBytes) * 100)}% savings vs raw output)\n`));
    MeterRecorder.recordCommand('dbsample', rawBytes, slimBytes);
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
  }
}
