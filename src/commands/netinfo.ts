import chalk from 'chalk';
import { isWindows, runCommand } from '../utils/os-detect.js';
import { MeterRecorder } from '../meter/recorder.js';

/**
 * Compact network information — replaces verbose `ipconfig /all` + `netstat`
 * Windows: ~200+ lines → ~15 lines
 * Linux/Mac: combines ip addr + ss/netstat into compact view
 */
export async function netinfoCommand(): Promise<void> {
  console.log(chalk.bold.hex('#7C3AED')('\n  🌐 ContextSlim NETINFO\n'));

  try {
    if (isWindows()) {
      await windowsNetinfo();
    } else {
      await unixNetinfo();
    }
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error getting network info: ${error.message}\n`));
  }
}

async function windowsNetinfo(): Promise<void> {
  const psCmd = [
    '$adapters = Get-NetIPConfiguration -ErrorAction SilentlyContinue | Where-Object { $_.IPv4Address }',
    'foreach ($a in $adapters) { $gw = if ($a.IPv4DefaultGateway) { $a.IPv4DefaultGateway.NextHop } else { \'-\' }; $dns = ($a.DNSServer | Where-Object { $_.AddressFamily -eq 2 } | Select-Object -First 2 | ForEach-Object { $_.ServerAddresses }) -join \',\'; Write-Output "IFACE:$($a.InterfaceAlias)|$($a.IPv4Address.IPAddress)|$gw|$dns" }',
    'Write-Output "---PORTS---"',
    'Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Select-Object -First 15 | ForEach-Object { $proc = (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName; Write-Output "PORT:$($_.LocalPort)|$proc|$($_.LocalAddress)" }',
  ].join('; ');

  const output = await runCommand(psCmd, { timeout: 20000 });
  const lines = output.split(/\r?\n/).filter((l) => l.trim());

  let section = 'iface';
  let portCount = 0;

  console.log(chalk.bold('  📡 Network Interfaces'));
  for (const line of lines) {
    if (line === '---PORTS---') {
      section = 'ports';
      console.log(chalk.bold('\n  🔌 Listening Ports (top 15)'));
      console.log(chalk.dim('  PORT     PROCESS          BIND'));
      console.log(chalk.dim('  ──────── ──────────────── ─────────────'));
      continue;
    }

    if (line.startsWith('IFACE:')) {
      const [name, ip, gw, dns] = line.replace('IFACE:', '').split('|');
      console.log(chalk.cyan(`  ${name}`));
      console.log(chalk.white(`    IP: ${ip}  GW: ${gw}  DNS: ${dns || '-'}`));
    } else if (line.startsWith('PORT:')) {
      const [port, proc, bind] = line.replace('PORT:', '').split('|');
      portCount++;
      console.log(
        `  ${chalk.yellow(port.padEnd(9))}` +
        `${chalk.cyan((proc || '?').padEnd(17))}` +
        `${chalk.dim(bind || '0.0.0.0')}`,
      );
    }
  }

  const rawEstimate = 8000; // ipconfig /all + netstat -an easily 8KB+
  const slimBytes = Buffer.byteLength(output, 'utf-8');
  console.log(chalk.dim(`\n  (~${Math.round((1 - slimBytes / rawEstimate) * 100)}% token savings vs ipconfig /all + netstat)\n`));
  MeterRecorder.recordCommand('netinfo', rawEstimate, slimBytes);
}

async function unixNetinfo(): Promise<void> {
  // Interfaces
  console.log(chalk.bold('  📡 Network Interfaces'));
  try {
    const ifOutput = await runCommand(
      "ip -4 addr show 2>/dev/null | awk '/^[0-9]/{name=$2} /inet /{print name, $2}' || ifconfig | awk '/^[a-z]/{name=$1} /inet /{print name, $2}'",
      { shell: '/bin/sh' },
    );
    for (const line of ifOutput.split(/\r?\n/).filter((l) => l.trim())) {
      const [name, ip] = line.split(/\s+/);
      console.log(`  ${chalk.cyan(name || '?')} ${chalk.white(ip || '-')}`);
    }
  } catch {
    console.log(chalk.dim('  (interface info unavailable)'));
  }

  // Default gateway
  try {
    const gw = await runCommand("ip route 2>/dev/null | awk '/default/{print $3}' || route -n get default 2>/dev/null | awk '/gateway/{print $2}'", { shell: '/bin/sh' });
    console.log(`  ${chalk.dim('Gateway:')} ${chalk.white(gw.split('\n')[0])}`);
  } catch { /* skip */ }

  // Listening ports
  console.log(chalk.bold('\n  🔌 Listening Ports (top 15)'));
  try {
    const portsOutput = await runCommand(
      "ss -tlnp 2>/dev/null | tail -15 || netstat -tlnp 2>/dev/null | tail -15",
      { shell: '/bin/sh' },
    );
    const portLines = portsOutput.split(/\r?\n/).filter((l) => l.trim());
    console.log(chalk.dim('  PORT     PROCESS'));
    console.log(chalk.dim('  ──────── ────────────────'));
    for (const line of portLines.slice(0, 15)) {
      const parts = line.split(/\s+/);
      const addr = parts[3] || '';
      const port = addr.split(':').pop() || '?';
      const proc = parts[parts.length - 1]?.replace(/.*"([^"]+)".*/, '$1') || '?';
      console.log(`  ${chalk.yellow(port.padEnd(9))}${chalk.cyan(proc)}`);
    }
  } catch {
    console.log(chalk.dim('  (port info unavailable)'));
  }

  console.log('');
  MeterRecorder.recordCommand('netinfo', 6000, 500);
}
