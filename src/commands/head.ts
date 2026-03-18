/**
 * head — Show only the first N lines of a file.
 * Perfect for quick peeks at imports, file headers, and module structure.
 * Default: 30 lines. AI can quickly understand a file's purpose without reading everything.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { MeterRecorder } from '../meter/recorder.js';

export async function headCommand(fileStr: string, linesStr?: string): Promise<void> {
  if (!fileStr) {
    console.error(chalk.red('\n❌ Usage: contextslim head <file> [lines]\n'));
    return;
  }

  const targetFile = resolve(process.cwd(), fileStr);
  const maxLines = linesStr ? parseInt(linesStr, 10) : 30;

  if (isNaN(maxLines) || maxLines < 1) {
    console.error(chalk.red('\n❌ Lines must be a positive number.\n'));
    return;
  }

  try {
    const content = await readFile(targetFile, 'utf-8');
    const allLines = content.split('\n');
    const showLines = allLines.slice(0, maxLines);

    console.log(chalk.bold.hex('#7C3AED')(`\n  📋 ContextSlim HEAD: ${targetFile} (first ${maxLines} lines)\n`));

    for (let i = 0; i < showLines.length; i++) {
      console.log(chalk.gray(`${(i + 1).toString().padStart(3)} | `) + chalk.white(showLines[i]));
    }

    if (allLines.length > maxLines) {
      const remaining = allLines.length - maxLines;
      console.log(chalk.dim(`\n  ... ${remaining} more lines not shown. (${((maxLines / allLines.length) * 100).toFixed(0)}% of file viewed)\n`));
    } else {
      console.log(chalk.dim(`\n  (Full file shown — ${allLines.length} lines total)\n`));
    }

    // Record meter event
    const outputText = showLines.join('\n');
    MeterRecorder.recordCat(fileStr, Buffer.byteLength(content, 'utf-8'), Buffer.byteLength(outputText, 'utf-8'));
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error reading file: ${error.message}\n`));
  }
}
