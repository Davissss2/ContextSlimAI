import { Command } from 'commander';
import { initCommand } from './commands/init.js';

const program = new Command();

program
  .name('contextslim')
  .description(
    '⚡ CLI tool to optimize AI IDE token consumption — auto-generates exclusion files & AI rules',
  )
  .version('1.0.0');

program
  .command('init')
  .description(
    'Analyze project, detect stack, and generate optimized ignore files & AI rules',
  )
  .action(async () => {
    try {
      await initCommand();
    } catch (error) {
      console.error('\n❌ An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program.parse();
