import chalk from 'chalk';
import ora from 'ora';
import { resolve, join } from 'node:path';
import { stat, readdir } from 'node:fs/promises';
import { ConfigManager } from '../utils/config.js';

const DEFAULT_IGNORE = new Set([
  '.git', 'node_modules', '.next', '.nuxt', 'dist', 'build', 'out', 'coverage', '.cache', 'venv', '.venv', 'target', 'vendor',
  '.idea', '.vscode'
]);

interface DirStats {
  size: number;
  tokens: number;
}

export async function statsCommand(): Promise<void> {
  const targetDir = resolve(process.cwd());
  const config = ConfigManager.loadConfig();

  // Combine default with user config alwaysExclude
  const allIgnores = new Set([...DEFAULT_IGNORE, ...(config.patterns?.alwaysExclude || [])]);

  console.log('');
  console.log(
    chalk.bold.hex('#7C3AED')('  📊 ContextSlim Stats') +
      chalk.dim(' — Measuring Context Optimization ROI'),
  );
  console.log('');

  const spinner = ora({
    text: chalk.cyan('Scanning project tokens...'),
    spinner: 'dots',
  }).start();

  let totalProjectBytes = 0;
  let savedBytes = 0;
  let savingsBreakdown: Record<string, number> = {};

  async function walk(dir: string, isIgnoredPath = false, matchedIgnoreRule = '') {
    try {
      const items = await readdir(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = join(dir, item.name);
        
        // Is this path newly ignored in this level?
        let appliesIgnore = isIgnoredPath;
        let rule = matchedIgnoreRule;

        if (!isIgnoredPath && allIgnores.has(item.name)) {
          appliesIgnore = true;
          rule = item.name;
          if (!savingsBreakdown[rule]) savingsBreakdown[rule] = 0;
        }

        if (item.isDirectory()) {
          // If it's a directory, dive recursively
          await walk(fullPath, appliesIgnore, rule);
        } else {
          try {
            const { size } = await stat(fullPath);
            // Skip massive binary/media blobs in total so we don't skew token maths too ridiculously
            // Actually, AIs don't read binaries, but let's just include it to show the difference.
            if (item.name === 'package-lock.json' || item.name.endsWith('.lock')) {
              if (!isIgnoredPath) {
                appliesIgnore = true;
                rule = item.name;
                if (!savingsBreakdown[rule]) savingsBreakdown[rule] = 0;
              }
            }
            
            totalProjectBytes += size;
            if (appliesIgnore) {
              savedBytes += size;
              savingsBreakdown[rule] += size;
            }
          } catch {
            // ignore stat error
          }
        }
      }
    } catch {
      // ignore readdir error (permissions usually)
    }
  }

  await walk(targetDir);
  spinner.succeed(chalk.green('Token analysis complete!'));

  const rawTokens = Math.floor(totalProjectBytes / 4);
  const savedTokens = Math.floor(savedBytes / 4);
  const activeTokens = rawTokens - savedTokens;
  const percentageSaved = rawTokens > 0 ? ((savedTokens / rawTokens) * 100).toFixed(1) : '0.0';

  console.log('');
  
  // Breakdown Top 5 Savers
  const topSavers = Object.entries(savingsBreakdown)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, size]) => size > 0)
    .slice(0, 5);

  if (topSavers.length > 0) {
    console.log(chalk.bold.yellow('  🗑️  Top Saved Context Sources:'));
    for (const [name, size] of topSavers) {
      const tokens = Math.floor(size / 4);
      console.log(
        chalk.dim('    • ') + chalk.white(name.padEnd(20)) + 
        chalk.cyan(`${(tokens / 1000).toFixed(1)}k tokens ignored`)
      );
    }
    console.log('');
  }

  // Visual Bar
  const barLength = 40;
  const savedLen = Math.floor((savedTokens / rawTokens) * barLength) || 0;
  const activeLen = Math.max(1, barLength - savedLen);
  const bar = chalk.green('█'.repeat(savedLen)) + chalk.dim('░'.repeat(activeLen));

  console.log(chalk.bold('  Original AI Context:    ') + chalk.red(`${(rawTokens / 1000).toFixed(1)}k tokens`));
  console.log(chalk.bold('  ContextSlim Context:    ') + chalk.green.bold(`${(activeTokens / 1000).toFixed(1)}k tokens`));
  console.log('');
  console.log(`  ${bar} ${chalk.bold.green(percentageSaved + '% saved')}`);
  console.log('');
}
