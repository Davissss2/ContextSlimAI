import chalk from 'chalk';
import { isWindows, runCommand, truncateStr, formatBytes } from '../utils/os-detect.js';
import { ConfigManager } from '../utils/config.js';
import { MeterRecorder } from '../meter/recorder.js';

/**
 * Compact process list — replaces verbose `tasklist` / `Get-Process` / `ps aux`
 * Filters, sorts by memory, and limits output to save massive tokens
 */
export async function procsCommand(filter?: string): Promise<void> {
  const config = ConfigManager.loadConfig();
  const limit = (config.limits as any).procsLimit ?? 30;

  console.log(chalk.bold.hex('#7C3AED')(`\n  ⚙️  ContextSlim PROCS${filter ? ` (filter: "${filter}")` : ''}\n`));

  try {
    if (isWindows()) {
      await windowsProcs(filter, limit);
    } else {
      await unixProcs(filter, limit);
    }
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error listing processes: ${error.message}\n`));
  }
}

async function windowsProcs(filter: string | undefined, limit: number): Promise<void> {
  const filterClause = filter
    ? `| Where-Object { $_.ProcessName -like '*${filter}*' -or $_.Id -eq '${filter}' }`
    : '';

  const psCmd = [
    `Get-Process ${filterClause}`,
    'Sort-Object WorkingSet64 -Descending',
    `Select-Object -First ${limit}`,
    'ForEach-Object { $mem = [math]::Round($_.WorkingSet64/1MB,1); $cpu = [math]::Round($_.CPU,1); "$($_.Id)|$($_.ProcessName)|$($mem)MB|$($cpu)s|$($_.Threads.Count)t" }',
  ].join(' | ');

  const output = await runCommand(psCmd);
  const lines = output.split(/\r?\n/).filter((l) => l.trim());

  // Header
  console.log(chalk.dim('  PID      NAME                    MEM        CPU      THREADS'));
  console.log(chalk.dim('  ──────── ─────────────────────── ────────── ──────── ───────'));

  let totalProcs = 0;
  for (const line of lines) {
    const [pid, name, mem, cpu, threads] = line.split('|');
    if (!pid || !name) continue;
    totalProcs++;

    const memNum = parseFloat(mem);
    const memColor = memNum > 500 ? chalk.red : memNum > 100 ? chalk.yellow : chalk.green;

    console.log(
      `  ${chalk.white(pid.padEnd(9))}` +
      `${chalk.cyan(truncateStr(name, 24).padEnd(24))}` +
      `${memColor(mem.padStart(8).padEnd(11))}` +
      `${chalk.white((cpu || '0s').padStart(7).padEnd(9))}` +
      `${chalk.dim(threads || '?')}`,
    );
  }

  // Get total process count for savings estimate
  const totalCountOutput = await runCommand('(Get-Process).Count');
  const totalInSystem = parseInt(totalCountOutput) || totalProcs;
  const rawEstimate = totalInSystem * 120; // tasklist gives ~120 bytes/line
  const slimBytes = Buffer.byteLength(output, 'utf-8');

  console.log(chalk.dim(`\n  Showing ${totalProcs}/${totalInSystem} processes (sorted by memory, top ${limit})`));
  console.log(chalk.dim(`  (~${Math.round((1 - slimBytes / rawEstimate) * 100)}% token savings vs raw tasklist)\n`));
  MeterRecorder.recordCommand('procs', rawEstimate, slimBytes);
}

async function unixProcs(filter: string | undefined, limit: number): Promise<void> {
  const grepClause = filter ? `| grep -i '${filter}'` : '';
  const cmd = `ps aux --sort=-%mem ${grepClause} | head -${limit + 1}`;

  const output = await runCommand(cmd, { shell: '/bin/sh' });
  const lines = output.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length <= 1) {
    console.log(chalk.dim('  No processes found matching filter.\n'));
    return;
  }

  // Header
  console.log(chalk.dim('  USER     PID      %CPU   %MEM   COMMAND'));
  console.log(chalk.dim('  ──────── ──────── ────── ────── ──────────────────────'));

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/\s+/);
    if (parts.length < 11) continue;

    const [user, pid, cpu, mem, , , , , , , ...cmdParts] = parts;
    const command = truncateStr(cmdParts.join(' '), 30);
    const memNum = parseFloat(mem);
    const memColor = memNum > 10 ? chalk.red : memNum > 5 ? chalk.yellow : chalk.green;

    console.log(
      `  ${chalk.dim(truncateStr(user, 8).padEnd(9))}` +
      `${chalk.white(pid.padEnd(9))}` +
      `${chalk.white(cpu.padStart(5).padEnd(7))}` +
      `${memColor(mem.padStart(5).padEnd(7))}` +
      `${chalk.cyan(command)}`,
    );
  }

  const rawEstimate = lines.length * 150;
  const slimBytes = Buffer.byteLength(output, 'utf-8');
  console.log(chalk.dim(`\n  Top ${lines.length - 1} processes by memory (~${Math.round((1 - slimBytes / rawEstimate) * 100)}% savings)\n`));
  MeterRecorder.recordCommand('procs', rawEstimate, slimBytes);
}
