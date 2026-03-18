import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'node:path';
import { detectStack } from '../analyzers/stack-detector.js';
import { generateIgnoreFiles } from '../generators/ignore-generator.js';
import { generateRulesFiles } from '../generators/rules-generator.js';
import { ConfigManager } from '../utils/config.js';

export async function initCommand(): Promise<void> {
  const targetDir = resolve(process.cwd());

  console.log('');
  console.log(
    chalk.bold.hex('#7C3AED')('  ⚡ ContextSlim') +
      chalk.dim(' — Optimize your AI IDE context'),
  );
  console.log('');

  // Config: Load or generate .contextslimrc.json
  const configSpinner = ora({
    text: chalk.cyan('Loading configuration...'),
    spinner: 'dots',
  }).start();
  
  const config = ConfigManager.loadConfig();
  // We generate a default config file if it doesn't exist so the user can easily see their settings
  ConfigManager.generateDefaultConfig();
  configSpinner.succeed(chalk.green('Configuration loaded'));

  // Step 1: Detect stack
  const stackSpinner = ora({
    text: chalk.cyan('Detecting project stack...'),
    spinner: 'dots',
  }).start();

  let stack;
  try {
    stack = await detectStack(targetDir);
    if (stack.name === 'Unknown') {
      stackSpinner.warn(
        chalk.yellow('Could not detect stack — using generic optimizations'),
      );
    } else {
      stackSpinner.succeed(
        chalk.green(`Detected: ${chalk.bold(stack.name)}`),
      );
    }
  } catch (error) {
    stackSpinner.fail(chalk.red('Failed to detect stack'));
    throw error;
  }

  // Step 2: Generate ignore files
  const ignoreSpinner = ora({
    text: chalk.cyan('Generating exclusion files...'),
    spinner: 'dots',
  }).start();

  let ignoreFiles: string[];
  try {
    ignoreFiles = await generateIgnoreFiles(targetDir, stack, config);
    ignoreSpinner.succeed(
      chalk.green(
        `Created ${ignoreFiles.map((f) => chalk.bold(f)).join(' and ')}`,
      ),
    );
  } catch (error) {
    ignoreSpinner.fail(chalk.red('Failed to generate exclusion files'));
    throw error;
  }

  // Step 3: Generate AI rules
  const rulesSpinner = ora({
    text: chalk.cyan('Generating AI rules...'),
    spinner: 'dots',
  }).start();

  let rulesFiles: string[];
  try {
    rulesFiles = await generateRulesFiles(targetDir, stack, config);
    rulesSpinner.succeed(
      chalk.green(
        `Created ${rulesFiles.map((f) => chalk.bold(f)).join(' and ')}`,
      ),
    );
  } catch (error) {
    rulesSpinner.fail(chalk.red('Failed to generate AI rules'));
    throw error;
  }

  // Summary
  const allFiles = [...ignoreFiles, ...rulesFiles];
  console.log('');
  console.log(
    chalk.bold.green('  🎉 Done!') +
      chalk.white(' Your project is now optimized for AI IDEs.'),
  );
  console.log('');
  console.log(chalk.dim('  Files created:'));
  for (const file of allFiles) {
    console.log(chalk.dim('    •') + ' ' + chalk.white(file));
  }
  console.log('');
  console.log(
    chalk.dim('  Estimated token savings: ') +
      chalk.bold.hex('#06B6D4')('~60-80%'),
  );
  console.log('');
}
