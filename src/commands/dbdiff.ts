import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { MeterRecorder } from '../meter/recorder.js';

/**
 * Compare two database schema dumps and show only the differences
 * Useful for reviewing migrations or comparing environments
 * Accepts two .sql files or schema dumps
 */
export async function dbdiffCommand(file1: string, file2?: string): Promise<void> {
  console.log(chalk.bold.hex('#7C3AED')('\n  🔀 ContextSlim DBDIFF\n'));

  if (!file1 || !file2) {
    console.log(chalk.cyan('  Usage:'));
    console.log(chalk.white('    contextslim dbdiff <schema1.sql> <schema2.sql>'));
    console.log('');
    console.log(chalk.cyan('  Compare two schema dumps and show only changes:'));
    console.log(chalk.dim('    contextslim dbdiff schema_v1.sql schema_v2.sql'));
    console.log(chalk.dim('    contextslim dbdiff prod_schema.sql dev_schema.sql'));
    console.log('');
    console.log(chalk.cyan('  Generate schema dumps:'));
    console.log(chalk.dim('    mysqldump --no-data mydb > schema.sql'));
    console.log(chalk.dim('    pg_dump --schema-only mydb > schema.sql'));
    console.log(chalk.dim('    sqlite3 mydb.sqlite ".schema" > schema.sql'));
    console.log('');
    return;
  }

  try {
    const path1 = resolve(process.cwd(), file1);
    const path2 = resolve(process.cwd(), file2);

    const content1 = await readFile(path1, 'utf-8');
    const content2 = await readFile(path2, 'utf-8');

    const tables1 = extractTables(content1);
    const tables2 = extractTables(content2);

    const allTables = new Set([...tables1.keys(), ...tables2.keys()]);

    let addedTables = 0;
    let removedTables = 0;
    let modifiedTables = 0;
    let unchangedTables = 0;

    console.log(chalk.dim(`  Comparing: ${file1} ↔ ${file2}\n`));

    // Tables only in file2 (added)
    for (const table of allTables) {
      const def1 = tables1.get(table);
      const def2 = tables2.get(table);

      if (!def1 && def2) {
        addedTables++;
        console.log(chalk.green(`  + TABLE ${table} (new)`));
        const cols = extractColumns(def2);
        if (cols.length > 0) {
          console.log(chalk.green(`    columns: ${cols.join(', ')}`));
        }
      } else if (def1 && !def2) {
        removedTables++;
        console.log(chalk.red(`  - TABLE ${table} (removed)`));
      } else if (def1 && def2) {
        // Compare columns
        const cols1 = extractColumns(def1);
        const cols2 = extractColumns(def2);

        const added = cols2.filter((c) => !cols1.includes(c));
        const removed = cols1.filter((c) => !cols2.includes(c));

        if (added.length > 0 || removed.length > 0 || def1.trim() !== def2.trim()) {
          modifiedTables++;
          console.log(chalk.yellow(`  ~ TABLE ${table} (modified)`));
          for (const col of added) {
            console.log(chalk.green(`    + ${col}`));
          }
          for (const col of removed) {
            console.log(chalk.red(`    - ${col}`));
          }
        } else {
          unchangedTables++;
        }
      }
    }

    console.log('');
    console.log(chalk.bold('  Summary:'));
    if (addedTables > 0) console.log(chalk.green(`    + ${addedTables} tables added`));
    if (removedTables > 0) console.log(chalk.red(`    - ${removedTables} tables removed`));
    if (modifiedTables > 0) console.log(chalk.yellow(`    ~ ${modifiedTables} tables modified`));
    console.log(chalk.dim(`    = ${unchangedTables} tables unchanged`));

    const rawBytes = Buffer.byteLength(content1 + content2, 'utf-8');
    const changesCount = addedTables + removedTables + modifiedTables;
    const slimBytes = changesCount * 100;
    console.log(chalk.dim(`\n  ${rawBytes} bytes of schemas → ${changesCount} changes (~${Math.round((1 - slimBytes / rawBytes) * 100)}% savings)\n`));
    MeterRecorder.recordCommand('dbdiff', rawBytes, slimBytes);
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
  }
}

/**
 * Extract CREATE TABLE definitions from a SQL dump
 */
function extractTables(sql: string): Map<string, string> {
  const tables = new Map<string, string>();

  // Match CREATE TABLE statements (MySQL, PostgreSQL, SQLite)
  const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?\s*\(([\s\S]*?)\);/gi;
  let match;

  while ((match = regex.exec(sql)) !== null) {
    const tableName = match[1];
    const tableBody = match[2];
    tables.set(tableName, tableBody);
  }

  return tables;
}

/**
 * Extract column definitions from a CREATE TABLE body
 */
function extractColumns(tableBody: string): string[] {
  const lines = tableBody.split(/,\n|,\r\n/).map((l) => l.trim()).filter(Boolean);
  const columns: string[] = [];

  for (const line of lines) {
    // Skip constraints, indexes, keys
    if (/^(PRIMARY|UNIQUE|INDEX|KEY|CONSTRAINT|CHECK|FOREIGN)/i.test(line)) continue;

    // Extract column name and type
    const match = line.match(/^[`"']?(\w+)[`"']?\s+(\w+(?:\([^)]+\))?)/);
    if (match) {
      columns.push(`${match[1]} ${match[2]}`);
    }
  }

  return columns;
}
