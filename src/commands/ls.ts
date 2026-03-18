import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import chalk from 'chalk';
import { MeterRecorder } from '../meter/recorder.js';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  'coverage',
  '.cache',
  'venv',
  '.venv',
  'target',
  'vendor',
]);

export async function lsCommand(dirStr?: string): Promise<void> {
  const targetDir = resolve(process.cwd(), dirStr || '.');

  try {
    const files = await readdir(targetDir, { withFileTypes: true });

    let dirsCount = 0;
    let filesCount = 0;
    let hiddenCount = 0;

    console.log(chalk.bold.hex('#7C3AED')(`\n  📂 ContextSlim LS: ${targetDir}\n`));

    for (const file of files) {
      if (IGNORED_DIRS.has(file.name)) {
        hiddenCount++;
        continue;
      }

      if (file.isDirectory()) {
        console.log(chalk.cyan(`  📁 ${file.name}/`));
        dirsCount++;
      } else {
        console.log(chalk.white(`  📄 ${file.name}`));
        filesCount++;
      }
    }

    console.log(chalk.dim(`\n  Summary: ${dirsCount} dirs, ${filesCount} files. (${hiddenCount} heavy folders hidden to save tokens)\n`));

    // Record: all items vs shown items
    const totalItems = dirsCount + filesCount + hiddenCount;
    MeterRecorder.recordLs(targetDir, totalItems * 50, (dirsCount + filesCount) * 50);
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error reading directory: ${error.message}\n`));
  }
}
