import chalk from 'chalk';
import ora from 'ora';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { ConfigManager } from '../utils/config.js';
import { MeterRecorder } from '../meter/recorder.js';

const execAsync = promisify(exec);

// Standard heavy files/dirs that should NEVER be sent to the AI inside a diff
const BUILT_IN_EXCLUDES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'node_modules',
  'dist',
  'build',
  '.next',
  'out',
  '.cache',
  'coverage'
];

export async function diffCommand(target?: string): Promise<void> {
  const config = ConfigManager.loadConfig();
  const allExcludes = new Set([...BUILT_IN_EXCLUDES, ...config.patterns.alwaysExclude]);

  console.log('');
  console.log(
    chalk.bold.hex('#7C3AED')('  🔄 ContextSlim Diff') +
      chalk.dim(' — Extracting AI-optimized changes'),
  );
  console.log('');

  const spinner = ora({
    text: chalk.cyan('Analyzing git differences...'),
    spinner: 'dots',
  }).start();

  try {
    // Check if it's a git repo
    await execAsync('git rev-parse --is-inside-work-tree');
  } catch {
    spinner.fail(chalk.red('Not a git repository.'));
    console.log(chalk.dim('  ContextSlim diff requires Git to track file changes.\n'));
    return;
  }

  // Determine compare target
  let compareTarget = target || 'HEAD';
  
  // If no HEAD exists (brand new repo with zero commits), HEAD will fail.
  // We politely fallback to standard working tree diff.
  if (compareTarget === 'HEAD') {
    try {
      await execAsync('git rev-parse HEAD');
    } catch {
      compareTarget = ''; // Fallback to unstaged current directory
    }
  }

  let modifiedFiles: string[] = [];
  try {
    const { stdout } = await execAsync(`git diff ${compareTarget} --name-only`);
    modifiedFiles = stdout.split('\n').map(f => f.trim()).filter(f => f);
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to get modified files.'));
    console.log(chalk.red(error.message));
    return;
  }

  if (modifiedFiles.length === 0) {
    spinner.succeed(chalk.green('No changes detected.'));
    console.log(chalk.dim(`  Compared against: ${compareTarget || 'Working Tree'}\n`));
    return;
  }

  // Filter out heavy files and directories based on config
  const aiFriendlyFiles = modifiedFiles.filter(file => {
    return !Array.from(allExcludes).some(ignorePattern => {
      // Very basic wildcard match (e.g. dist/**/*.js) or exact match
      // For simplicity, we just check if the path starts with the ignore dir or matches exactly
      const cleanPattern = ignorePattern.replace(/\/\*.*$/, ''); // removes /** or /*
      return file === cleanPattern || file.startsWith(cleanPattern + '/') || file.includes('/' + cleanPattern + '/');
    });
  });

  const excludedCount = modifiedFiles.length - aiFriendlyFiles.length;

  if (aiFriendlyFiles.length === 0) {
    spinner.succeed(chalk.green('Changes detected, but all were excluded to protect token context.'));
    console.log(chalk.dim(`  Ignored ${excludedCount} heavy files (lockfiles, builds, etc.).\n`));
    return;
  }

  spinner.succeed(chalk.green(`Diff extracted (${aiFriendlyFiles.length} files relevant to AI)`));
  
  if (excludedCount > 0) {
    console.log(chalk.dim(`  (🛡️ Stripped ${excludedCount} irrelevant files like lockfiles/builds from context)`));
  }
  console.log('');

  // Fetch actual diffs for the allowed files
  let fullDiffOutput = '';
  try {
    // By placing '--' we ensure git treats them as file paths
    // chunking them into the command
    const fileArgs = aiFriendlyFiles.map(f => `"${f}"`).join(' ');
    const { stdout } = await execAsync(`git diff ${compareTarget} -- ${fileArgs}`);
    fullDiffOutput = stdout;
  } catch (error: any) {
    console.log(chalk.red('\n❌ Error extracting full diff: ' + error.message));
    return;
  }

  if (!fullDiffOutput.trim()) {
    console.log(chalk.yellow('  No text differences available (perhaps binary files changed).\n'));
    return;
  }

  // We limit the output so it doesn't accidentally dump 10,000 lines
  const diffLines = fullDiffOutput.split('\n');
  const MAX_DIFF_LINES = config.limits.catLines > 0 ? config.limits.catLines * 2 : 1000; // Diffs get a little more budget

  if (diffLines.length <= MAX_DIFF_LINES) {
    printFormattedDiff(diffLines);
  } else {
    printFormattedDiff(diffLines.slice(0, MAX_DIFF_LINES));
    console.log(chalk.bold.yellow(`\n  ... [ ✂️ TRUNCATED: Diff too large (${diffLines.length} lines). Only showing first ${MAX_DIFF_LINES} lines ] ...\n`));
  }

  // Record diff event: raw diff vs presented diff (may be truncated + excluded files stripped)
  const rawDiffBytes = Buffer.byteLength(fullDiffOutput, 'utf-8');
  const shownLines = Math.min(diffLines.length, MAX_DIFF_LINES);
  const outputBytes = Buffer.byteLength(diffLines.slice(0, shownLines).join('\n'), 'utf-8');
  // Raw estimate includes excluded files (each might have ~2k diff content)
  const rawEstimate = rawDiffBytes + excludedCount * 2000;
  MeterRecorder.recordDiff('git diff', rawEstimate, outputBytes);

  console.log('');
}

// Simple and beautiful output formatter for terminal consumption
function printFormattedDiff(lines: string[]) {
  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      // Header for a new file
      console.log('\n' + chalk.bold.bgHex('#334155').white(` ${line.replace('diff --git a/', '').split(' b/')[0]} `));
    } else if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('index ')) {
      // Git specific metadata that is noise for the AI
      continue; 
    } else if (line.startsWith('@@')) {
      // Chunk header
      console.log(chalk.cyan(line));
    } else if (line.startsWith('+')) {
      console.log(chalk.green(line));
    } else if (line.startsWith('-')) {
      console.log(chalk.red(line));
    } else {
      console.log(chalk.white(line));
    }
  }
}
