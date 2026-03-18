import chalk from 'chalk';
import ora from 'ora';
import { resolve, join } from 'node:path';
import { stat, readdir } from 'node:fs/promises';

async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0;
  try {
    const files = await readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const fullPath = join(dirPath, file.name);
      if (file.isDirectory()) {
        size += await getDirectorySize(fullPath);
      } else {
        const { size: fileSize } = await stat(fullPath);
        size += fileSize;
      }
    }
  } catch {
    // Ignore errors (e.g., permissions)
  }
  return size;
}

export async function scanCommand(): Promise<void> {
  const targetDir = resolve(process.cwd());

  console.log('');
  console.log(
    chalk.bold.hex('#7C3AED')('  ⚡ ContextSlim Scan') +
      chalk.dim(' — Analyzing potential token waste'),
  );
  console.log('');

  const spinner = ora({
    text: chalk.cyan('Scanning project directories...'),
    spinner: 'dots',
  }).start();

  const HEAVY_DIRS = [
    'node_modules',
    'dist',
    'build',
    '.next',
    'out',
    '.nuxt',
    '.output',
    '.cache',
    'coverage',
    'venv',
    '.venv',
    'target',
    'vendor',
  ];

  let totalWasteBytes = 0;
  const foundDirs: { name: string; sizeMb: number }[] = [];

  for (const dirName of HEAVY_DIRS) {
    try {
      const fullPath = join(targetDir, dirName);
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        const sizeBytes = await getDirectorySize(fullPath);
        if (sizeBytes > 0) {
          totalWasteBytes += sizeBytes;
          foundDirs.push({ name: dirName, sizeMb: sizeBytes / (1024 * 1024) });
        }
      }
    } catch {
      // Directory does not exist, ignore
    }
  }

  spinner.succeed(chalk.green('Scan complete!'));

  console.log('');
  if (foundDirs.length === 0) {
    console.log(chalk.green('  ✅ No heavy directories found. Your project is lean!'));
  } else {
    console.log(chalk.bold.yellow('  ⚠️  Heavy directories found:'));
    for (const dir of foundDirs) {
      console.log(
        chalk.dim('    • ') + chalk.white(dir.name.padEnd(15)) + 
        chalk.yellow(`${dir.sizeMb.toFixed(2)} MB`)
      );
    }

    const totalMb = totalWasteBytes / (1024 * 1024);
    // Rough estimate: 1 token ≈ 4 characters/bytes for standard code
    const estimatedTokens = Math.floor(totalWasteBytes / 4);

    console.log('');
    console.log(
      chalk.bold('  Total Unoptimized Size: ') +
        chalk.bold.red(`${totalMb.toFixed(2)} MB`),
    );
    console.log(
      chalk.bold('  Estimated Token Waste:  ') +
        chalk.bold.hex('#EF4444')(`~${estimatedTokens.toLocaleString()} tokens`),
    );
    console.log('');
    console.log(chalk.dim('  💡 Run `contextslim init` to automatically ignore these directories.'));
  }
  console.log('');
}
