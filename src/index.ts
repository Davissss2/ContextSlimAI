import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { scanCommand } from './commands/scan.js';
import { statsCommand } from './commands/stats.js';
import { diffCommand } from './commands/diff.js';
import { doctorCommand } from './commands/doctor.js';
import { lsCommand } from './commands/ls.js';
import { catCommand } from './commands/cat.js';
import { grepCommand } from './commands/grep.js';
import { mapCommand } from './commands/map.js';
import { treeCommand } from './commands/tree.js';
import { briefCommand } from './commands/brief.js';
import { meterCommand } from './commands/meter.js';
import { importsCommand } from './commands/imports.js';
import { outlineCommand } from './commands/outline.js';
import { depsCommand } from './commands/deps.js';
import { headCommand } from './commands/head.js';
import { todoCommand } from './commands/todo.js';
import { typesCommand } from './commands/types.js';

const program = new Command();

program
  .name('contextslim')
  .description(
    '⚡ CLI tool to optimize AI IDE token consumption — auto-generates exclusion files & AI rules',
  )
  .version('1.5.0');

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
  .command('diff [target]')
  .description('Extract AI-optimized changes by filtering out heavy directories or binaries')
  .action(async (target) => {
    try {
      await diffCommand(target);
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

program
  .command('meter [action]')
  .description('Track and visualize AI token consumption (start|stop|status|simulate|report|history|clear)')
  .action(async (action) => {
    try {
      await meterCommand(action);
    } catch (error) {
      console.error('\n❌ An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('imports <file>')
  .description('Extract only import/require statements from a file — see dependencies instantly')
  .action(async (file) => {
    try {
      await importsCommand(file);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('outline [dir]')
  .description('Recursive map of all source files — full codebase architecture in one command')
  .action(async (dir) => {
    try {
      await outlineCommand(dir);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('deps')
  .description('Show project dependencies in compact format — no version noise')
  .action(async () => {
    try {
      await depsCommand();
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('head <file> [lines]')
  .description('Show the first N lines of a file (default: 30) — quick peek at imports and headers')
  .action(async (file, lines) => {
    try {
      await headCommand(file, lines);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('todo [dir]')
  .description('Find all TODO/FIXME/HACK/BUG comments — instant context about pending work')
  .action(async (dir) => {
    try {
      await todoCommand(dir);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('types <file>')
  .description('Extract TypeScript type definitions — interfaces, types, and enums only')
  .action(async (file) => {
    try {
      await typesCommand(file);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program.parse();
