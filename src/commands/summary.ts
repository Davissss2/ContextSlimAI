/**
 * summary — Generate a structured summary of a file.
 * Shows: line count, imports, exports, functions, classes, and key patterns.
 * Perfect for understanding a file without reading it (~95% savings).
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname } from 'node:path';
import chalk from 'chalk';

export async function summaryCommand(file: string) {
  if (!file || !existsSync(file)) {
    console.error(chalk.red(`❌ File not found: ${file}`));
    return;
  }

  const content = await readFile(file, 'utf-8');
  const lines = content.split(/\r?\n/);
  const ext = extname(file).toLowerCase();

  // Counts
  const totalLines = lines.length;
  const blankLines = lines.filter(l => !l.trim()).length;
  const commentLines = lines.filter(l => {
    const t = l.trim();
    return t.startsWith('//') || t.startsWith('#') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--');
  }).length;
  const codeLines = totalLines - blankLines - commentLines;

  // Imports
  const imports = lines.filter(l => {
    const t = l.trim();
    return t.startsWith('import ') || t.startsWith('from ') || t.startsWith('require(') || t.match(/^const\s+\w+\s*=\s*require/);
  });

  // Exports
  const exports = lines.filter(l => l.trim().startsWith('export '));

  // Functions/classes
  const functions = lines.filter(l => /^\s{0,2}(?:export\s+)?(?:async\s+)?function\s/.test(l));
  const classes = lines.filter(l => /^\s{0,2}(?:export\s+)?class\s/.test(l));
  const interfaces = lines.filter(l => /^\s{0,2}(?:export\s+)?interface\s/.test(l));
  const types = lines.filter(l => /^\s{0,2}(?:export\s+)?type\s/.test(l));

  // Error handling
  const tryCatch = lines.filter(l => /\btry\s*\{/.test(l)).length;
  const throws = lines.filter(l => /\bthrow\s/.test(l)).length;

  // Async patterns
  const awaits = lines.filter(l => /\bawait\s/.test(l)).length;
  const promises = lines.filter(l => /\bPromise\b/.test(l)).length;

  // TODO/FIXME
  const todos = lines.filter(l => /\b(TODO|FIXME|HACK|BUG|XXX)\b/.test(l)).length;

  console.log(chalk.blue(`📋 Summary: ${file}`));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(`  Lines: ${codeLines} code, ${commentLines} comments, ${blankLines} blank (${totalLines} total)`);
  console.log(`  Imports: ${imports.length} | Exports: ${exports.length}`);

  if (functions.length > 0) {
    console.log(`  Functions: ${functions.length}`);
    for (const f of functions.slice(0, 8)) {
      const name = f.trim().match(/function\s+(\w+)/)?.[1] || '(anonymous)';
      console.log(chalk.dim(`    → ${name}`));
    }
    if (functions.length > 8) console.log(chalk.dim(`    ... +${functions.length - 8} more`));
  }

  if (classes.length > 0) {
    console.log(`  Classes: ${classes.length}`);
    for (const c of classes) {
      const name = c.trim().match(/class\s+(\w+)/)?.[1] || '?';
      console.log(chalk.dim(`    → ${name}`));
    }
  }

  if (interfaces.length + types.length > 0) {
    console.log(`  Types/Interfaces: ${interfaces.length + types.length}`);
  }

  if (tryCatch > 0 || throws > 0) {
    console.log(`  Error handling: ${tryCatch} try/catch, ${throws} throw`);
  }

  if (awaits > 0 || promises > 0) {
    console.log(`  Async: ${awaits} await, ${promises} Promise`);
  }

  if (todos > 0) {
    console.log(chalk.yellow(`  ⚠️  TODOs/FIXMEs: ${todos}`));
  }

  const sizeKB = (Buffer.byteLength(content, 'utf-8') / 1024).toFixed(1);
  console.log(chalk.gray(`  Size: ${sizeKB}KB`));
}
