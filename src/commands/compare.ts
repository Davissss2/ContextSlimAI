/**
 * compare — Compact file diff between two files.
 * Shows only changed, added, and removed lines.
 * Much more compact than standard `diff` output.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import chalk from 'chalk';

const MAX_DIFF_LINES = 80;
const MAX_LINE_WIDTH = 120;

export async function compareCommand(file1: string, file2?: string) {
  if (!file1) {
    console.error(chalk.red('❌ Usage: contextslim compare <file1> <file2>'));
    return;
  }

  if (!existsSync(file1)) {
    console.error(chalk.red(`❌ File not found: ${file1}`));
    return;
  }

  if (!file2 || !existsSync(file2)) {
    console.error(chalk.red(`❌ File not found: ${file2}`));
    return;
  }

  const content1 = (await readFile(file1, 'utf-8')).split(/\r?\n/);
  const content2 = (await readFile(file2, 'utf-8')).split(/\r?\n/);

  // Simple line-by-line diff
  const maxLen = Math.max(content1.length, content2.length);
  const diffs: { line: number; type: '+' | '-' | '~'; text: string }[] = [];

  const set1 = new Set(content1);
  const set2 = new Set(content2);

  // Lines only in file1 (removed)
  for (let i = 0; i < content1.length; i++) {
    if (!set2.has(content1[i]) && content1[i].trim()) {
      let text = content1[i].trim();
      if (text.length > MAX_LINE_WIDTH) text = text.substring(0, MAX_LINE_WIDTH) + '…';
      diffs.push({ line: i + 1, type: '-', text });
    }
  }

  // Lines only in file2 (added)
  for (let i = 0; i < content2.length; i++) {
    if (!set1.has(content2[i]) && content2[i].trim()) {
      let text = content2[i].trim();
      if (text.length > MAX_LINE_WIDTH) text = text.substring(0, MAX_LINE_WIDTH) + '…';
      diffs.push({ line: i + 1, type: '+', text });
    }
  }

  console.log(chalk.blue(`📊 Compare: ${file1} ↔ ${file2}`));
  console.log(chalk.gray(`   File 1: ${content1.length} lines | File 2: ${content2.length} lines | ${diffs.length} differences`));
  console.log(chalk.gray('─'.repeat(60)));

  if (diffs.length === 0) {
    console.log(chalk.green('  ✅ Files are identical.'));
    return;
  }

  const display = diffs.slice(0, MAX_DIFF_LINES);
  for (const d of display) {
    if (d.type === '-') {
      console.log(chalk.red(`  - L${d.line}: ${d.text}`));
    } else {
      console.log(chalk.green(`  + L${d.line}: ${d.text}`));
    }
  }

  if (diffs.length > MAX_DIFF_LINES) {
    console.log(chalk.gray(`\n  ... ${diffs.length - MAX_DIFF_LINES} more differences omitted`));
  }
}
