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
import { runCommand } from './commands/run.js';
import { tailCommand } from './commands/tail.js';
// Cross-platform utility commands
import { logsCommand } from './commands/logs.js';
import { portsCommand } from './commands/ports.js';
import { diskCommand } from './commands/disk.js';
import { dockerCommand } from './commands/docker.js';
import { packagesCommand } from './commands/packages.js';
import { findfilesCommand } from './commands/findfiles.js';
// Analysis & debugging commands
import { changesCommand } from './commands/changes.js';
import { errorsCommand } from './commands/errors.js';
import { configCommand } from './commands/config.js';
import { compareCommand } from './commands/compare.js';
import { summaryCommand } from './commands/summary.js';
// Windows & System commands
import { sysinfoCommand } from './commands/sysinfo.js';
import { procsCommand } from './commands/procs.js';
import { servicesCommand } from './commands/services.js';
import { netinfoCommand } from './commands/netinfo.js';
import { envinfoCommand } from './commands/envinfo.js';
import { registryCommand } from './commands/registry.js';
// Database commands
import { dbschemaCommand } from './commands/dbschema.js';
import { dbqueryCommand } from './commands/dbquery.js';
import { dbsampleCommand } from './commands/dbsample.js';
import { dbstatsCommand } from './commands/dbstats.js';
import { dbdiffCommand } from './commands/dbdiff.js';

const program = new Command();

program
  .name('contextslim')
  .description(
    '⚡ CLI tool to optimize AI IDE token consumption — auto-generates exclusion files & AI rules',
  )
  .version('1.6.0');

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

program
  .command('run <cmd> [args...]')
  .option('-t, --timeout <seconds>', 'Kill process if it hangs', '5')
  .description('Run a command synchronously with an automatic timeout to catch hanging scripts')
  .action(async (cmd, args, options) => {
    try {
      await runCommand(cmd, args, options.timeout);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('tail <file>')
  .option('-t, --time <seconds>', 'Time to wait for logs in seconds', '2')
  .description('Tail progressive logs for N seconds, useful to capture pre-crash outputs')
  .action(async (file, options) => {
    try {
      await tailCommand(file, options.time);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════
// 🔧 CROSS-PLATFORM UTILITY COMMANDS
// ═══════════════════════════════════════════

program
  .command('logs <file> [lines]')
  .description('Read last N lines of a log file, stripping timestamps (~70% token savings)')
  .action(async (file, lines) => {
    try {
      await logsCommand(file, lines);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('ports [filter]')
  .description('Compact open ports list — replaces verbose netstat/ss output (~80% savings)')
  .action(async (filter) => {
    try {
      await portsCommand(filter);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('disk [dir]')
  .description('Compact disk usage — replaces verbose df + du output (~85% savings)')
  .action(async (dir) => {
    try {
      await diskCommand(dir);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('docker [filter]')
  .description('Compact Docker status — containers, images, volumes in one view (~80% savings)')
  .action(async (filter) => {
    try {
      await dockerCommand(filter);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('packages [filter]')
  .description('Compact installed packages list — replaces dpkg/rpm/apk verbose output (~90% savings)')
  .action(async (filter) => {
    try {
      await packagesCommand(filter);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('findfiles <pattern> [dir]')
  .description('AI-optimized find — skips heavy dirs, caps at 30 results')
  .action(async (pattern, dir) => {
    try {
      await findfilesCommand(pattern, dir);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════
// 🔍 ANALYSIS & DEBUGGING COMMANDS
// ═══════════════════════════════════════════

program
  .command('changes [count]')
  .description('Compact git log — last N commits with changed files (~80% savings vs git log)')
  .action(async (count) => {
    try {
      await changesCommand(count);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('errors <file> [maxLines]')
  .description('Extract only error/warning lines from a log file (~99% savings)')
  .action(async (file, maxLines) => {
    try {
      await errorsCommand(file, maxLines);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('config <file>')
  .description('Read config file stripping comments and blank lines (~80% savings)')
  .action(async (file) => {
    try {
      await configCommand(file);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('compare <file1> <file2>')
  .description('Compact diff between two files — shows only differences')
  .action(async (file1, file2) => {
    try {
      await compareCommand(file1, file2);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('summary <file>')
  .description('Structured file summary — imports, exports, functions, size (~95% savings)')
  .action(async (file) => {
    try {
      await summaryCommand(file);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════
// 🖥️  SYSTEM / WINDOWS COMMANDS
// ═══════════════════════════════════════════

program
  .command('sysinfo')
  .description('Compact system info — replaces verbose systeminfo/uname (~90% token savings)')
  .action(async () => {
    try {
      await sysinfoCommand();
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('procs [filter]')
  .description('Compact process list — replaces tasklist/Get-Process/ps aux (sorted by memory)')
  .action(async (filter) => {
    try {
      await procsCommand(filter);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('services [filter]')
  .description('Compact service list — replaces Get-Service/systemctl (grouped by status)')
  .action(async (filter) => {
    try {
      await servicesCommand(filter);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('netinfo')
  .description('Compact network info — replaces ipconfig/all + netstat (~90% token savings)')
  .action(async () => {
    try {
      await netinfoCommand();
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('envinfo [filter]')
  .description('Environment variables — grouped by category, sensitive vars hidden')
  .action(async (filter) => {
    try {
      await envinfoCommand(filter);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('registry <path>')
  .description('Compact Windows Registry reader — replaces verbose reg query (Windows only)')
  .action(async (regPath) => {
    try {
      await registryCommand(regPath);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

// ═══════════════════════════════════════════
// 🗄️  DATABASE COMMANDS
// ═══════════════════════════════════════════

program
  .command('dbschema <connection> [filter]')
  .description('Compact DB schema — tables, columns, indexes in tree format. Use [filter] to match specific tables.')
  .action(async (connection, filter) => {
    try {
      await dbschemaCommand(connection, filter);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('dbquery <queryOrFile> [connection]')
  .description('Execute SQL with token-optimized output — limits rows, truncates columns')
  .action(async (queryOrFile, connection) => {
    try {
      await dbqueryCommand(queryOrFile, connection);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('dbsample <table> [connection]')
  .description('Quick table data preview — show sample rows without writing queries')
  .action(async (table, connection) => {
    try {
      await dbsampleCommand(table, connection);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('dbstats <connection> [filter]')
  .description('Compact DB statistics — table sizes, row counts, index stats in ~20 lines')
  .action(async (connection, filter) => {
    try {
      await dbstatsCommand(connection, filter);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program
  .command('dbdiff <file1> [file2]')
  .description('Compare two schema dumps — show only table/column changes')
  .action(async (file1, file2) => {
    try {
      await dbdiffCommand(file1, file2);
    } catch (error) {
      console.error('\n\u274c An unexpected error occurred:', error);
      process.exit(1);
    }
  });

program.parse();

