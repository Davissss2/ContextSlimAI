import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { scanCommand } from './commands/scan.js';
import { statsCommand } from './commands/stats.js';
import { doctorCommand } from './commands/doctor.js';
import { lsCommand } from './commands/ls.js';
import { catCommand } from './commands/cat.js';
import { grepCommand } from './commands/grep.js';
import { mapCommand } from './commands/map.js';
import { treeCommand } from './commands/tree.js';
import { briefCommand } from './commands/brief.js';

const program = new Command();

program
  .name('contextslim')
  .description(
    '⚡ CLI tool to optimize AI IDE token consumption — auto-generates exclusion files & AI rules',
  )
  .version('1.3.0');

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

program
  .command('scan')
  .description('Scan project directories to estimate unused token waste')
  .action(async () => {
    try {
      await scanCommand();
    } catch (error) {
      console.error('\n❌ An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Measure exact token usage and savings with ContextSlim')
  .action(async () => {
    try {
      await statsCommand();
    } catch (error) {
      console.error('\n❌ An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('doctor')
  .description('Check AI optimization configuration health')
  .action(async () => {
    try {
      await doctorCommand();
    } catch (error) {
      console.error('\n❌ An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('ls [dir]')
  .description('List files in a directory, hiding context-heavy folders')
  .action(async (dir) => {
    try {
      await lsCommand(dir);
    } catch (error) {
      console.error('\n❌ An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('tree [dir] [maxDepth]')
  .description('Generate an AI-optimized directory tree, hiding heavy folders and capping depth')
  .action(async (dir, maxDepth) => {
    try {
      await treeCommand(dir, maxDepth);
    } catch (error) {
      console.error('\n❌ An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('cat <file>')
  .description('Read a file, suppressing blank lines and dropping the middle if too large')
  .action(async (file) => {
    try {
      await catCommand(file);
    } catch (error) {
      console.error('\n❌ An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('grep <query> [dir]')
  .description('Search for a string across files, truncating massive outputs to save tokens')
  .action(async (query, dir) => {
    try {
      await grepCommand(query, dir);
    } catch (error) {
      console.error('\n❌ An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('map <file>')
  .description('Map out a file by reading only its structural signatures, dropping logic entirely')
  .action(async (file) => {
    try {
      await mapCommand(file);
    } catch (error) {
      console.error('\n❌ An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('brief [dir]')
  .description('Generate a ~300-token project summary to paste into any AI conversation')
  .action(async (dir) => {
    try {
      await briefCommand(dir);
    } catch (error) {
      console.error('\n❌ An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program.parse();
