import { spawn } from 'node:child_process';
import chalk from 'chalk';
import fs from 'node:fs';

export async function tailCommand(file: string, durationSeconds: string = '2') {
  if (!fs.existsSync(file)) {
    console.error(chalk.red(`❌ File not found: ${file}`));
    return;
  }

  const durationMs = parseInt(durationSeconds.replace(/s$/i, ''), 10) * 1000;
  if (isNaN(durationMs)) {
    console.error(chalk.red('❌ Invalid duration value. Must be a number (e.g. 2 or 2s).'));
    return;
  }

  console.log(chalk.blue(`👀 Tailing ${chalk.bold(file)} for ${durationMs}ms...`));
  
  let outputData = '';

  // Use cross-platform spawn behavior or specific tail logic
  const isWindows = process.platform === 'win32';
  let cmd, args;
  
  if (isWindows) {
    // Windows equivalent of tail -f uses PowerShell
    cmd = 'powershell.exe';
    args = ['-Command', `Get-Content "${file}" -Wait -Tail 10`];
  } else {
    cmd = 'tail';
    args = ['-f', '-n', '10', file];
  }

  const proc = spawn(cmd, args, { shell: true });

  proc.stdout.on('data', (data) => {
    outputData += data.toString();
  });

  proc.stderr.on('data', (data) => {
    console.error(chalk.red(data.toString()));
  });

  const timer = setTimeout(() => {
    console.log(chalk.yellow(`\n⏳ Time is up (${durationMs}ms). Output:`));
    console.log(chalk.gray(`\n--- Output ---`));
    console.log(outputData.trim() || chalk.gray('(No new lines within timeframe)'));
    console.log(chalk.gray(`--------------`));
    proc.kill('SIGTERM');
  }, durationMs);

  proc.on('error', (err) => {
    clearTimeout(timer);
    console.error(chalk.red(`\n❌ Failed to start process: ${err.message}`));
  });
}
