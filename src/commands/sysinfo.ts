import chalk from 'chalk';
import { isWindows, runCommand, truncateStr, formatBytes } from '../utils/os-detect.js';
import { MeterRecorder } from '../meter/recorder.js';

/**
 * Compact system information — replaces verbose `systeminfo` / `uname -a`
 * Windows: ~80 lines → ~12 lines
 * Linux/Mac: gathers from multiple sources into one compact view
 */
export async function sysinfoCommand(): Promise<void> {
  console.log(chalk.bold.hex('#7C3AED')('\n  🖥️  ContextSlim SYSINFO\n'));

  try {
    if (isWindows()) {
      await windowsSysinfo();
    } else {
      await unixSysinfo();
    }
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error getting system info: ${error.message}\n`));
  }
}

async function windowsSysinfo(): Promise<void> {
  // Use PowerShell to get compact system info — semicolons separate statements in one-liner
  const psCmd = [
    '$os = Get-CimInstance Win32_OperatingSystem',
    '$cs = Get-CimInstance Win32_ComputerSystem',
    '$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1)',
    '$memTotal = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)',
    '$memFree = [math]::Round($os.FreePhysicalMemory / 1MB, 1)',
    'Write-Output "OS: $($os.Caption) $($os.Version) ($($os.OSArchitecture))"',
    'Write-Output "Host: $($cs.Name) ($($cs.Domain))"',
    'Write-Output "CPU: $($cpu.Name.Trim()) ($($cpu.NumberOfCores)c/$($cpu.NumberOfLogicalProcessors)t)"',
    'Write-Output "RAM: ${memFree}GB free / ${memTotal}GB total"',
    'Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object { Write-Output "Disk: $($_.DeviceID) $([math]::Round($_.FreeSpace/1GB,1))/$([math]::Round($_.Size/1GB,1))GB free" }',
    'Write-Output "Shell: PowerShell $($PSVersionTable.PSVersion)"',
    'Write-Output "User: $env:USERNAME"',
  ].join('; ');


  const output = await runCommand(psCmd);
  const rawEstimate = 3500; // systeminfo outputs ~3500 bytes
  const slimBytes = Buffer.byteLength(output, 'utf-8');

  const lines = output.split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines) {
    const [key, ...rest] = line.split(':');
    if (rest.length > 0) {
      console.log(chalk.cyan(`  ${key.trim()}:`) + chalk.white(` ${rest.join(':').trim()}`));
    } else {
      console.log(chalk.white(`  ${line}`));
    }
  }

  console.log(chalk.dim(`\n  (${lines.length} lines vs ~80 from systeminfo — ~${Math.round((1 - slimBytes / rawEstimate) * 100)}% token savings)\n`));
  MeterRecorder.recordCommand('sysinfo', rawEstimate, slimBytes);
}

async function unixSysinfo(): Promise<void> {
  const commands = [
    { key: 'OS', cmd: 'uname -srm' },
    { key: 'Host', cmd: 'hostname' },
    { key: 'CPU', cmd: "grep 'model name' /proc/cpuinfo 2>/dev/null | head -1 | cut -d: -f2 | xargs || sysctl -n machdep.cpu.brand_string 2>/dev/null || echo 'unknown'" },
    { key: 'RAM', cmd: "free -h 2>/dev/null | awk '/^Mem:/{print $3\"/\"$2\" used\"}' || vm_stat 2>/dev/null | head -3 | tail -1" },
    { key: 'Disk', cmd: "df -h / | awk 'NR==2{print $4\"/\"$2\" free (\"$5\" used)\"}'" },
    { key: 'Uptime', cmd: 'uptime -p 2>/dev/null || uptime | sed "s/.*up/up/"' },
    { key: 'Shell', cmd: 'echo $SHELL' },
    { key: 'User', cmd: 'whoami' },
  ];

  let totalRaw = 0;
  let totalSlim = 0;

  for (const { key, cmd } of commands) {
    try {
      const value = await runCommand(cmd, { shell: '/bin/sh' });
      const trimmed = truncateStr(value.split('\n')[0], 80);
      console.log(chalk.cyan(`  ${key}:`) + chalk.white(` ${trimmed}`));
      totalSlim += key.length + trimmed.length;
      totalRaw += 200; // estimated raw per command
    } catch {
      console.log(chalk.cyan(`  ${key}:`) + chalk.dim(' (unavailable)'));
    }
  }

  console.log(chalk.dim(`\n  (${commands.length} lines — compact system overview)\n`));
  MeterRecorder.recordCommand('sysinfo', totalRaw, totalSlim);
}
