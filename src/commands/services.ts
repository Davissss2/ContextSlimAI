import chalk from 'chalk';
import { isWindows, runCommand, truncateStr } from '../utils/os-detect.js';
import { ConfigManager } from '../utils/config.js';
import { MeterRecorder } from '../meter/recorder.js';

/**
 * Compact service list — replaces verbose `Get-Service` / `sc query` / `systemctl`
 * Filters and groups by status for quick overview
 */
export async function servicesCommand(filter?: string): Promise<void> {
  const config = ConfigManager.loadConfig();
  const limit = (config.limits as any).servicesLimit ?? 30;

  console.log(chalk.bold.hex('#7C3AED')(`\n  🔧 ContextSlim SERVICES${filter ? ` (filter: "${filter}")` : ''}\n`));

  try {
    if (isWindows()) {
      await windowsServices(filter, limit);
    } else {
      await unixServices(filter, limit);
    }
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error listing services: ${error.message}\n`));
  }
}

async function windowsServices(filter: string | undefined, limit: number): Promise<void> {
  const filterClause = filter
    ? `| Where-Object { $_.Name -like '*${filter}*' -or $_.DisplayName -like '*${filter}*' }`
    : '';

  const psCmd = [
    `Get-Service ${filterClause}`,
    `Select-Object -First ${limit * 2}`,
    'Group-Object Status',
    `ForEach-Object { Write-Output "GROUP:$($_.Name)"; $_.Group | Sort-Object DisplayName | Select-Object -First ${limit} | ForEach-Object { "$($_.Name)|$($_.DisplayName)|$($_.StartType)" } }`,
  ].join(' | ');

  const output = await runCommand(psCmd);
  const lines = output.split(/\r?\n/).filter((l) => l.trim());

  let currentGroup = '';
  let totalShown = 0;

  for (const line of lines) {
    if (line.startsWith('GROUP:')) {
      currentGroup = line.replace('GROUP:', '').trim();
      const icon = currentGroup === 'Running' ? '🟢' : currentGroup === 'Stopped' ? '🔴' : '🟡';
      console.log(chalk.bold(`\n  ${icon} ${currentGroup}`));
      continue;
    }

    const [name, displayName, startType] = line.split('|');
    if (!name) continue;
    totalShown++;

    const typeTag = startType === 'Automatic' ? chalk.green('AUTO')
      : startType === 'Manual' ? chalk.yellow('MAN')
      : startType === 'Disabled' ? chalk.red('DIS')
      : chalk.dim(startType || '?');

    console.log(
      `    ${typeTag} ${chalk.cyan(truncateStr(name, 25).padEnd(26))}` +
      `${chalk.dim(truncateStr(displayName || '', 45))}`,
    );
  }

  const totalOutput = await runCommand('(Get-Service).Count');
  const totalInSystem = parseInt(totalOutput) || totalShown;
  const rawEstimate = totalInSystem * 100;
  const slimBytes = Buffer.byteLength(output, 'utf-8');

  console.log(chalk.dim(`\n  Showing ${totalShown}/${totalInSystem} services (~${Math.round((1 - slimBytes / rawEstimate) * 100)}% token savings)\n`));
  MeterRecorder.recordCommand('services', rawEstimate, slimBytes);
}

async function unixServices(filter: string | undefined, limit: number): Promise<void> {
  const grepClause = filter ? `| grep -i '${filter}'` : '';

  // Try systemctl first, fall back to service --status-all
  let output: string;
  try {
    output = await runCommand(
      `systemctl list-units --type=service --no-pager --no-legend ${grepClause} | head -${limit}`,
      { shell: '/bin/sh' },
    );
  } catch {
    try {
      output = await runCommand(
        `service --status-all 2>/dev/null ${grepClause} | head -${limit}`,
        { shell: '/bin/sh' },
      );
    } catch {
      console.log(chalk.dim('  Service manager not found (systemctl/service not available)\n'));
      return;
    }
  }

  const lines = output.split(/\r?\n/).filter((l) => l.trim());

  const running: string[] = [];
  const stopped: string[] = [];
  const other: string[] = [];

  for (const line of lines) {
    // systemctl format: name.service loaded active/inactive running/dead description
    const parts = line.split(/\s+/);
    const name = (parts[0] || '').replace('.service', '');
    const sub = parts[3] || '';

    if (sub === 'running' || line.includes('[ + ]')) {
      running.push(name);
    } else if (sub === 'dead' || sub === 'exited' || line.includes('[ - ]')) {
      stopped.push(name);
    } else {
      other.push(name);
    }
  }

  if (running.length > 0) {
    console.log(chalk.bold(`  🟢 Running (${running.length})`));
    for (const s of running.slice(0, limit)) {
      console.log(chalk.green(`    ${s}`));
    }
  }
  if (stopped.length > 0) {
    console.log(chalk.bold(`\n  🔴 Stopped (${stopped.length})`));
    for (const s of stopped.slice(0, Math.floor(limit / 2))) {
      console.log(chalk.red(`    ${s}`));
    }
  }
  if (other.length > 0) {
    console.log(chalk.bold(`\n  🟡 Other (${other.length})`));
    for (const s of other.slice(0, 5)) {
      console.log(chalk.yellow(`    ${s}`));
    }
  }

  const rawEstimate = lines.length * 120;
  const slimBytes = Buffer.byteLength(output, 'utf-8');
  console.log(chalk.dim(`\n  ${lines.length} services total (~${Math.round((1 - slimBytes / rawEstimate) * 100)}% savings)\n`));
  MeterRecorder.recordCommand('services', rawEstimate, slimBytes);
}
