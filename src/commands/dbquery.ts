import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { isWindows, runCommand } from '../utils/os-detect.js';
import { compressQueryOutput, detectDBEngine, compressMongoOutput } from '../utils/db-parser.js';
import { ConfigManager } from '../utils/config.js';
import { MeterRecorder } from '../meter/recorder.js';

/**
 * Execute a SQL query with token-optimized output
 * Accepts a query string or a .sql file path
 * Limits rows, truncates wide columns, strips decorative borders
 */
export async function dbqueryCommand(queryOrFile: string, connection?: string): Promise<void> {
  console.log(chalk.bold.hex('#7C3AED')('\n  🔍 ContextSlim DBQUERY\n'));

  if (!queryOrFile) {
    printUsage();
    return;
  }

  const config = ConfigManager.loadConfig();
  const maxRows = (config.limits as any).dbSampleRows ?? 20;

  try {
    // Check if it is a file path
    let query = queryOrFile;
    if (queryOrFile.endsWith('.sql')) {
      const filePath = resolve(process.cwd(), queryOrFile);
      query = await readFile(filePath, 'utf-8');
      console.log(chalk.dim(`  File: ${queryOrFile}`));
    }

    console.log(chalk.dim(`  Query: ${query.length > 80 ? query.substring(0, 77) + '...' : query}\n`));

    if (!connection) {
      console.log(chalk.yellow('  ⚠️  No connection specified. Use: contextslim dbquery "<query>" <connection>'));
      console.log(chalk.dim('  Example: contextslim dbquery "SELECT * FROM users" ./mydb.sqlite\n'));
      return;
    }

    const engine = await detectDBEngine(connection);

    let rawOutput: string;

    if (engine === 'sqlite' || connection.endsWith('.db') || connection.endsWith('.sqlite') || connection.endsWith('.sqlite3')) {
      rawOutput = await runCommand(
        `sqlite3 -header -column "${connection}" "${query}"`,
        { shell: isWindows() ? 'cmd.exe' : '/bin/sh', timeout: 30000 },
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
        `mysql ${connArgs} -e "${query}" -t`,
        { shell: isWindows() ? 'cmd.exe' : '/bin/sh', timeout: 30000 },
      );
    } else if (engine === 'postgres' || connection.includes('postgres') || connection.includes('psql')) {
      let connArgs = connection;
      if (connection.includes('://')) connArgs = `"${connection}"`;
      rawOutput = await runCommand(
        `psql ${connArgs} -c "${query}"`,
        { shell: isWindows() ? 'cmd.exe' : '/bin/sh', timeout: 30000 },
      );
    } else if (engine === 'mongodb' || connection.includes('mongo')) {
      rawOutput = await runCommand(
        `mongosh "${connection}" --eval '${query}' --quiet`,
        { shell: isWindows() ? 'cmd.exe' : '/bin/sh', timeout: 30000 },
      );
      // MongoDB returns JSON
      const compressed = compressMongoOutput(rawOutput, maxRows);
      console.log(compressed);
      const rawBytes = Buffer.byteLength(rawOutput, 'utf-8');
      const slimBytes = Buffer.byteLength(compressed, 'utf-8');
      console.log(chalk.dim(`\n  (~${Math.round((1 - slimBytes / rawBytes) * 100)}% token savings)\n`));
      MeterRecorder.recordCommand('dbquery', rawBytes, slimBytes);
      return;
    } else {
      console.log(chalk.yellow('  Could not detect DB engine. Trying as SQLite...'));
      rawOutput = await runCommand(
        `sqlite3 -header -column "${connection}" "${query}"`,
        { shell: isWindows() ? 'cmd.exe' : '/bin/sh', timeout: 30000 },
      );
    }

    const compressed = compressQueryOutput(rawOutput, {
      maxRows: 10,
      maxColWidth: 30,
      stripBorders: true,
    });

    console.log(compressed);

    const rawBytes = Buffer.byteLength(rawOutput, 'utf-8');
    const slimBytes = Buffer.byteLength(compressed, 'utf-8');
    console.log(chalk.dim(`\n  Raw: ${rawBytes} bytes → Slim: ${slimBytes} bytes (~${Math.round((1 - slimBytes / rawBytes) * 100)}% savings)\n`));
    MeterRecorder.recordCommand('dbquery', rawBytes, slimBytes);
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
  }
}

function printUsage(): void {
  console.log(chalk.cyan('  Usage:'));
  console.log(chalk.white('    contextslim dbquery "<query>" <connection>'));
  console.log(chalk.white('    contextslim dbquery <file.sql> <connection>'));
  console.log('');
  console.log(chalk.cyan('  Examples:'));
  console.log(chalk.dim('    contextslim dbquery "SELECT * FROM users LIMIT 10" ./mydb.sqlite'));
  console.log(chalk.dim('    contextslim dbquery queries/report.sql mysql://user:pass@localhost/mydb'));
  console.log(chalk.dim('    contextslim dbquery "db.users.find({})" mongodb://localhost/mydb'));
  console.log('');
}
