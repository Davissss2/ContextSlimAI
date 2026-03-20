/**
 * errors — Extract only error/warning lines from log files.
 * Strips all the noise and shows only actionable lines.
 * A 5000-line log → ~20 error lines (~99% savings).
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import chalk from 'chalk';

const ERROR_PATTERNS = [
  /\b(error|err|fatal|panic|exception|traceback|failed|failure|crash|critical|segfault)\b/i,
  /\b(warn|warning|deprecated|caution)\b/i,
  /\b(ENOENT|EACCES|ECONNREFUSED|ETIMEDOUT|ENOMEM|ENOSPC)\b/,
  /\b(TypeError|ReferenceError|SyntaxError|RangeError|URIError)\b/,
  /\b(NullPointerException|OutOfMemoryError|StackOverflowError)\b/,
  /\b(SIGTERM|SIGKILL|SIGINT|SIGSEGV)\b/,
  /exit\s+code\s+[1-9]/i,
  /status\s+code\s+[45]\d{2}/i,
];

const MAX_ERRORS = 50;
const MAX_LINE_WIDTH = 150;

export async function errorsCommand(file: string, maxLines?: string) {
  if (!existsSync(file)) {
    console.error(chalk.red(`❌ File not found: ${file}`));
    return;
  }

  const limit = maxLines ? parseInt(maxLines, 10) : MAX_ERRORS;
  const content = await readFile(file, 'utf-8');
  const lines = content.split(/\r?\n/);

  const errors: { line: number; level: 'error' | 'warn'; text: string }[] = [];

  for (let i = 0; i < lines.length && errors.length < limit; i++) {
    const l = lines[i];
    if (!l.trim()) continue;

    // Check error patterns
    let level: 'error' | 'warn' = 'error';
    let matched = false;

    for (let p = 0; p < ERROR_PATTERNS.length; p++) {
      if (ERROR_PATTERNS[p].test(l)) {
        matched = true;
        // Patterns 1 (warn/warning) are warnings
        if (p === 1) level = 'warn';
        break;
      }
    }

    if (matched) {
      // Strip timestamps
      let clean = l
        .replace(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*Z?\s*[-|]?\s*/g, '')
        .replace(/^\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\S+\s+/g, '')
        .trim();

      if (clean.length > MAX_LINE_WIDTH) {
        clean = clean.substring(0, MAX_LINE_WIDTH) + '…';
      }

      errors.push({ line: i + 1, level, text: clean });
    }
  }

  const errorCount = errors.filter(e => e.level === 'error').length;
  const warnCount = errors.filter(e => e.level === 'warn').length;

  console.log(chalk.blue(`🔴 Errors in ${file} — ${errorCount} errors, ${warnCount} warnings (from ${lines.length} lines)`));
  console.log(chalk.gray('─'.repeat(60)));

  if (errors.length === 0) {
    console.log(chalk.green('  ✅ No errors or warnings found.'));
    return;
  }

  for (const e of errors) {
    const icon = e.level === 'error' ? chalk.red('ERR') : chalk.yellow('WRN');
    console.log(`  ${icon} ${chalk.gray(`L${e.line}:`)} ${e.text}`);
  }

  if (errors.length >= limit) {
    console.log(chalk.gray(`\n  ... capped at ${limit} results`));
  }
}
