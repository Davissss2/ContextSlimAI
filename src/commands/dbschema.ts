import chalk from 'chalk';
import { isWindows, runCommand } from '../utils/os-detect.js';
import {
  detectDBEngine,
  parseMySQLDescribe,
  parsePostgresDescribe,
  parseSQLitePragma,
  formatTableCompact,
  formatSchemaCompact,
  type DBEngine,
  type TableInfo,
  type DBSchemaInfo,
  type ColumnInfo,
  type IndexInfo,
} from '../utils/db-parser.js';
import { MeterRecorder } from '../meter/recorder.js';

/**
 * Compact database schema viewer — replaces verbose SHOW TABLES + DESCRIBE
 * Supports MySQL, PostgreSQL, SQLite via their CLI tools
 * Compresses hundreds of lines into a compact tree view
 */
export async function dbschemaCommand(connection: string, filter?: string): Promise<void> {
  console.log(chalk.bold.hex('#7C3AED')(`\n  📊 ContextSlim DBSCHEMA${filter ? ` (filter: "${filter}")` : ''}\n`));

  if (!connection) {
    printUsage();
    return;
  }

  try {
    const engine = await detectDBEngine(connection);

    if (engine === 'sqlite') {
      await sqliteSchema(connection, filter);
    } else if (engine === 'mysql') {
      await mysqlSchema(connection, filter);
    } else if (engine === 'postgres') {
      await postgresSchema(connection, filter);
    } else {
      // Try to auto-detect from connection string
      if (connection.endsWith('.db') || connection.endsWith('.sqlite') || connection.endsWith('.sqlite3')) {
        await sqliteSchema(connection, filter);
      } else if (connection.includes('mysql')) {
        await mysqlSchema(connection, filter);
      } else if (connection.includes('postgres') || connection.includes('psql')) {
        await postgresSchema(connection, filter);
      } else {
        // Default: try SQLite (most common for local dev)
        console.log(chalk.yellow('  ⚠️  Could not detect DB engine. Trying as SQLite file...'));
        await sqliteSchema(connection, filter);
      }
    }
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}`));
    console.log(chalk.dim('  Make sure the database CLI tool is installed and the connection is valid.\n'));
  }
}

async function sqliteSchema(dbPath: string, filter?: string): Promise<void> {
  // Get list of tables
  const tablesOutput = await runCommand(
    `sqlite3 "${dbPath}" ".tables"`,
    { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
  );

  let tableNames = tablesOutput.split(/\s+/).filter((t) => t.trim() && !t.startsWith('sqlite_'));
  if (filter) tableNames = tableNames.filter((t) => t.toLowerCase().includes(filter.toLowerCase()));

  if (tableNames.length === 0) {
    console.log(chalk.dim('  No tables found matching criteria.\n'));
    return;
  }

  const tables: TableInfo[] = [];

  for (const tableName of tableNames) {
    // Get column info
    const pragmaOutput = await runCommand(
      `sqlite3 "${dbPath}" "PRAGMA table_info(${tableName});"`,
      { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
    );
    const columns = parseSQLitePragma(pragmaOutput);

    // Get index info
    const indexOutput = await runCommand(
      `sqlite3 "${dbPath}" "PRAGMA index_list(${tableName});"`,
      { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
    );
    const indexes: IndexInfo[] = [];
    for (const line of indexOutput.split(/\r?\n/).filter((l) => l.trim())) {
      const parts = line.split('|');
      if (parts.length >= 3) {
        const indexName = parts[1];
        const unique = parts[2] === '1';
        // Get index columns
        try {
          const colsOutput = await runCommand(
            `sqlite3 "${dbPath}" "PRAGMA index_info(${indexName});"`,
            { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
          );
          const idxCols = colsOutput.split(/\r?\n/)
            .filter((l) => l.trim())
            .map((l) => l.split('|')[2] || '')
            .filter(Boolean);
          indexes.push({ name: indexName, columns: idxCols, unique });
        } catch { /* skip */ }
      }
    }

    // Get row count
    let rowCount: number | undefined;
    try {
      const countOutput = await runCommand(
        `sqlite3 "${dbPath}" "SELECT COUNT(*) FROM ${tableName};"`,
        { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
      );
      rowCount = parseInt(countOutput.trim());
    } catch { /* skip */ }

    tables.push({ name: tableName, columns, indexes, rowCount });
  }

  const schema: DBSchemaInfo = {
    engine: 'sqlite',
    version: '',
    database: dbPath.split(/[/\\]/).pop() || dbPath,
    tables,
  };

  // Try to get SQLite version
  try {
    schema.version = await runCommand(
      `sqlite3 "${dbPath}" "SELECT sqlite_version();"`,
      { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
    );
  } catch { schema.version = '?'; }

  const output = formatSchemaCompact(schema);
  console.log(output);

  const rawEstimate = tables.length * 500; // DESCRIBE per table ~500 bytes
  const slimBytes = Buffer.byteLength(output, 'utf-8');
  console.log(chalk.dim(`  (~${Math.round((1 - slimBytes / rawEstimate) * 100)}% token savings vs raw schema dump)\n`));
  MeterRecorder.recordCommand('dbschema', rawEstimate, slimBytes);
}

async function mysqlSchema(connection: string, filter?: string): Promise<void> {
  // Parse connection: mysql://user:pass@host:port/dbname or just dbname
  let connArgs = connection;
  let dbName = connection;

  if (connection.includes('://')) {
    // Parse URL format
    const url = new URL(connection);
    dbName = url.pathname.replace('/', '');
    connArgs = `-u${url.username} -p${url.password} -h${url.hostname}`;
    if (url.port) connArgs += ` -P${url.port}`;
    connArgs += ` ${dbName}`;
  }

  // Get tables
  const tablesOutput = await runCommand(
    `mysql ${connArgs} -e "SHOW TABLES;" -N`,
    { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
  );
  let tableNames = tablesOutput.split(/\r?\n/).filter((t) => t.trim());
  if (filter) tableNames = tableNames.filter((t) => t.toLowerCase().includes(filter.toLowerCase()));

  if (tableNames.length === 0) {
    console.log(chalk.dim('  No tables found matching criteria.\n'));
    return;
  }

  const tables: TableInfo[] = [];

  for (const tableName of tableNames) {
    const descOutput = await runCommand(
      `mysql ${connArgs} -e "DESCRIBE ${tableName};" -t`,
      { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
    );
    const columns = parseMySQLDescribe(descOutput);

    // Get indexes
    let indexes: IndexInfo[] = [];
    try {
      const idxOutput = await runCommand(
        `mysql ${connArgs} -e "SHOW INDEX FROM ${tableName};" -N`,
        { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
      );
      const idxMap = new Map<string, IndexInfo>();
      for (const line of idxOutput.split(/\r?\n/).filter((l) => l.trim())) {
        const parts = line.split('\t');
        if (parts.length >= 5) {
          const keyName = parts[2];
          const colName = parts[4];
          const nonUnique = parts[1] === '1';
          if (!idxMap.has(keyName)) {
            idxMap.set(keyName, { name: keyName, columns: [], unique: !nonUnique });
          }
          idxMap.get(keyName)!.columns.push(colName);
        }
      }
      indexes = Array.from(idxMap.values());
    } catch { /* skip */ }

    // Get row count estimate
    let rowCount: number | undefined;
    try {
      const countOutput = await runCommand(
        `mysql ${connArgs} -e "SELECT TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_NAME='${tableName}' AND TABLE_SCHEMA='${dbName}';" -N`,
        { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
      );
      rowCount = parseInt(countOutput.trim());
    } catch { /* skip */ }

    tables.push({ name: tableName, columns, indexes, rowCount });
  }

  const schema: DBSchemaInfo = {
    engine: 'mysql',
    version: '',
    database: dbName,
    tables,
  };

  try {
    schema.version = (await runCommand(
      `mysql ${connArgs} -e "SELECT VERSION();" -N`,
      { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
    )).trim();
  } catch { schema.version = '?'; }

  const output = formatSchemaCompact(schema);
  console.log(output);

  const rawEstimate = tables.length * 800;
  const slimBytes = Buffer.byteLength(output, 'utf-8');
  console.log(chalk.dim(`  (~${Math.round((1 - slimBytes / rawEstimate) * 100)}% token savings vs raw DESCRIBE)\n`));
  MeterRecorder.recordCommand('dbschema', rawEstimate, slimBytes);
}

async function postgresSchema(connection: string, filter?: string): Promise<void> {
  let connArgs = connection;
  let dbName = connection;

  if (connection.includes('://')) {
    connArgs = `"${connection}"`;
    const url = new URL(connection);
    dbName = url.pathname.replace('/', '');
  }

  // Get tables
  const tablesOutput = await runCommand(
    `psql ${connArgs} -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public';"`,
    { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
  );
  let tableNames = tablesOutput.split(/\r?\n/).map((t) => t.trim()).filter(Boolean);
  if (filter) tableNames = tableNames.filter((t) => t.toLowerCase().includes(filter.toLowerCase()));

  if (tableNames.length === 0) {
    console.log(chalk.dim('  No tables found matching criteria.\n'));
    return;
  }

  const tables: TableInfo[] = [];

  for (const tableName of tableNames) {
    const descOutput = await runCommand(
      `psql ${connArgs} -c "\\d ${tableName}" 2>/dev/null || psql ${connArgs} -t -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='${tableName}';"`,
      { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
    );
    const columns = parsePostgresDescribe(descOutput);

    let rowCount: number | undefined;
    try {
      const countOutput = await runCommand(
        `psql ${connArgs} -t -c "SELECT reltuples::bigint FROM pg_class WHERE relname='${tableName}';"`,
        { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
      );
      rowCount = parseInt(countOutput.trim());
    } catch { /* skip */ }

    tables.push({ name: tableName, columns, indexes: [], rowCount });
  }

  const schema: DBSchemaInfo = {
    engine: 'postgres',
    version: '',
    database: dbName,
    tables,
  };

  try {
    schema.version = (await runCommand(
      `psql ${connArgs} -t -c "SELECT version();"`,
      { shell: isWindows() ? 'cmd.exe' : '/bin/sh' },
    )).trim().split(' ').slice(0, 2).join(' ');
  } catch { schema.version = '?'; }

  const output = formatSchemaCompact(schema);
  console.log(output);

  const rawEstimate = tables.length * 800;
  const slimBytes = Buffer.byteLength(output, 'utf-8');
  console.log(chalk.dim(`  (~${Math.round((1 - slimBytes / rawEstimate) * 100)}% token savings)\n`));
  MeterRecorder.recordCommand('dbschema', rawEstimate, slimBytes);
}

function printUsage(): void {
  console.log(chalk.cyan('  Usage:'));
  console.log(chalk.white('    contextslim dbschema <connection>'));
  console.log('');
  console.log(chalk.cyan('  Examples:'));
  console.log(chalk.dim('    contextslim dbschema ./mydb.sqlite'));
  console.log(chalk.dim('    contextslim dbschema mysql://user:pass@localhost/mydb'));
  console.log(chalk.dim('    contextslim dbschema postgres://user:pass@localhost/mydb'));
  console.log('');
  console.log(chalk.cyan('  Supported engines:'));
  console.log(chalk.dim('    SQLite  — requires sqlite3 CLI'));
  console.log(chalk.dim('    MySQL   — requires mysql CLI'));
  console.log(chalk.dim('    Postgres — requires psql CLI'));
  console.log('');
}
