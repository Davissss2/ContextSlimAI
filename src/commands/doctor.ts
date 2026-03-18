import chalk from 'chalk';
import ora from 'ora';
import { resolve, join } from 'node:path';
import { access } from 'node:fs/promises';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function doctorCommand(): Promise<void> {
  const targetDir = resolve(process.cwd());

  console.log('');
  console.log(
    chalk.bold.hex('#7C3AED')('  🩺 ContextSlim Doctor') +
      chalk.dim(' — Checking your AI optimization health'),
  );
  console.log('');

  const spinner = ora({
    text: chalk.cyan('Running diagnostics...'),
    spinner: 'dots',
  }).start();

  const OPTIMAL_FILES = [
    '.antigravityignore',
    '.cursorignore',
    '.cursorrules',
    '.agents/rules.md',
    '.github/copilot-instructions.md',
    'CLAUDE.md',
    '.gitattributes'
  ];

  const results: { name: string; exists: boolean }[] = [];

  for (const file of OPTIMAL_FILES) {
    const exists = await fileExists(join(targetDir, file));
    results.push({ name: file, exists });
  }

  const allHealthy = results.every((r) => r.exists);

  if (allHealthy) {
    spinner.succeed(chalk.green('Diagnostics complete - Configuration is healthy!'));
    console.log('');
    for (const res of results) {
      console.log(chalk.green(`  ✅ ${res.name} found`));
    }
    console.log('');
    console.log(chalk.bold.green('  Your project is fully optimized for AI IDEs!'));
    console.log('');
  } else {
    spinner.warn(chalk.yellow('Diagnostics complete - Configuration issues detected!'));
    console.log('');
    for (const res of results) {
      if (res.exists) {
        console.log(chalk.green(`  ✅ ${res.name} found`));
      } else {
        console.log(chalk.red(`  ❌ ${res.name} missing`));
      }
    }
    console.log('');
    console.log(chalk.bold.yellow('  Action Required:'));
    console.log(
      chalk.dim('  Run ') +
        chalk.cyan('`contextslim init`') +
        chalk.dim(' to generate the missing files and fully optimize your workspace.'),
    );
    console.log('');
  }
}
