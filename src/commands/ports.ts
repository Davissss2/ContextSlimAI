import { execSync } from 'node:child_process';
import chalk from 'chalk';

export async function portsCommand(filter?: string) {
  const isWindows = process.platform === 'win32';

  let raw: string;
  try {
    if (isWindows) {
      raw = execSync('netstat -ano', { encoding: 'utf-8', timeout: 10000 });
    } else {
      // Try ss first, fall back to netstat
      try {
        raw = execSync('ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null', { encoding: 'utf-8', timeout: 10000, shell: '/bin/sh' });
      } catch {
        raw = execSync('netstat -tlnp 2>/dev/null || ss -tlnp', { encoding: 'utf-8', timeout: 10000, shell: '/bin/sh' });
      }
    }
  } catch (e: any) {
    console.error(chalk.red(`❌ Cannot read ports: ${e.message}`));
    return;
  }

  const lines = raw.split(/\r?\n/).filter(l => l.trim() && /LISTEN|ESTABLISHED/i.test(l));

  // Parse and deduplicate
  const seen = new Set<string>();
  const entries: { proto: string; local: string; state: string; process: string }[] = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;

    let proto = parts[0];
    let local = isWindows ? parts[1] : parts[3] || parts[1];
    let state = isWindows ? parts[3] : (parts[0].startsWith('LISTEN') ? 'LISTEN' : parts[4] || 'LISTEN');
    let proc = parts[parts.length - 1] || '-';

    // Normalize
    const port = local.split(':').pop() || local;
    const key = `${proto}:${port}:${state}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (filter && !line.toLowerCase().includes(filter.toLowerCase())) continue;

    entries.push({ proto, local, state, process: proc });
  }

  // Sort by port number
  entries.sort((a, b) => {
    const pa = parseInt(a.local.split(':').pop() || '0');
    const pb = parseInt(b.local.split(':').pop() || '0');
    return pa - pb;
  });

  // Limit output
  const max = 30;
  const display = entries.slice(0, max);

  console.log(chalk.blue(`🔌 Open Ports${filter ? ` (filter: ${filter})` : ''} — ${entries.length} found`));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.bold('Proto    Local Address              State       Process'));

  for (const e of display) {
    console.log(`${e.proto.padEnd(9)}${e.local.padEnd(27)}${e.state.padEnd(12)}${e.process}`);
  }

  if (entries.length > max) {
    console.log(chalk.gray(`\n... ${entries.length - max} more entries omitted`));
  }
}
