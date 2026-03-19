import chalk from 'chalk';
import { isWindows, runCommand, truncateStr } from '../utils/os-detect.js';
import { MeterRecorder } from '../meter/recorder.js';

/**
 * Compact Windows Registry reader — replaces verbose `reg query` output
 * Only available on Windows. On other platforms, shows a helpful message.
 */
export async function registryCommand(regPath: string): Promise<void> {
  console.log(chalk.bold.hex('#7C3AED')('\n  🗝️  ContextSlim REGISTRY\n'));

  if (!isWindows()) {
    console.log(chalk.yellow('  ⚠️  Registry is only available on Windows.\n'));
    return;
  }

  if (!regPath) {
    console.log(chalk.yellow('  Usage: contextslim registry <path>'));
    console.log(chalk.dim('  Example: contextslim registry HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion'));
    console.log(chalk.dim('  Example: contextslim registry HKCU\\Environment\n'));
    return;
  }

  try {
    await windowsRegistry(regPath);
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error reading registry: ${error.message}\n`));
  }
}

async function windowsRegistry(regPath: string): Promise<void> {
  // Use reg query to read the registry
  const output = await runCommand(`reg query "${regPath}" 2>&1`, { shell: 'cmd.exe' });
  const lines = output.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length === 0) {
    console.log(chalk.dim('  (No entries found at this path)\n'));
    return;
  }

  console.log(chalk.cyan(`  Path: ${regPath}\n`));

  let valueCount = 0;
  let subkeyCount = 0;
  const values: { name: string; type: string; data: string }[] = [];
  const subkeys: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip the header line which is the path itself
    if (trimmed === regPath || trimmed.startsWith('HKEY_') || trimmed.startsWith('HKLM\\') || trimmed.startsWith('HKCU\\')) {
      if (trimmed !== regPath) {
        subkeys.push(trimmed);
        subkeyCount++;
      }
      continue;
    }

    // Value entries: name    REG_TYPE    data
    const match = trimmed.match(/^(\S+)\s+(REG_\w+)\s+(.*)$/);
    if (match) {
      values.push({
        name: match[1],
        type: match[2],
        data: match[3],
      });
      valueCount++;
    }
  }

  // Display values compactly
  if (values.length > 0) {
    console.log(chalk.bold(`  📋 Values (${values.length})`));
    const maxNameLen = Math.min(30, Math.max(...values.map((v) => v.name.length)));

    for (const { name, type, data } of values) {
      const typeTag = type.replace('REG_', '');
      const typeColor = typeTag === 'SZ' ? chalk.green
        : typeTag === 'DWORD' ? chalk.yellow
        : typeTag === 'EXPAND_SZ' ? chalk.blue
        : typeTag === 'MULTI_SZ' ? chalk.magenta
        : chalk.dim;

      console.log(
        `    ${typeColor(typeTag.padEnd(10))}` +
        `${chalk.cyan(truncateStr(name, maxNameLen).padEnd(maxNameLen + 2))}` +
        `${chalk.white(truncateStr(data, 50))}`,
      );
    }
  }

  // Display subkeys
  if (subkeys.length > 0) {
    console.log(chalk.bold(`\n  📁 Subkeys (${subkeys.length})`));
    const maxShow = 20;
    for (const key of subkeys.slice(0, maxShow)) {
      const shortKey = key.split('\\').pop() || key;
      console.log(`    ${chalk.cyan(shortKey)}`);
    }
    if (subkeys.length > maxShow) {
      console.log(chalk.dim(`    ... and ${subkeys.length - maxShow} more`));
    }
  }

  const rawEstimate = lines.length * 100;
  const slimBytes = Buffer.byteLength(lines.join('\n'), 'utf-8') * 0.5;
  console.log(chalk.dim(`\n  ${valueCount} values, ${subkeyCount} subkeys (~${Math.round((1 - slimBytes / rawEstimate) * 100)}% token savings)\n`));
  MeterRecorder.recordCommand('registry', rawEstimate, slimBytes);
}
