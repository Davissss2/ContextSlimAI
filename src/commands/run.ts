import { spawn } from 'node:child_process';
import chalk from 'chalk';

export async function runCommand(cmd: string, args: string[], timeoutSeconds: string = '5') {
  const timeoutMs = parseInt(timeoutSeconds.replace(/s$/i, ''), 10) * 1000;
  if (isNaN(timeoutMs)) {
    console.error(chalk.red('❌ Invalid timeout value. Must be a number (e.g. 5 or 5s).'));
    return;
  }

  console.log(chalk.blue(`⏳ Executing: ${cmd} ${args.join(' ')} (Timeout: ${timeoutMs}ms)`));
  
  const startTime = Date.now();
  let stdoutData = '';
  let stderrData = '';

  const proc = spawn(cmd, args, { shell: true });

  proc.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });

  proc.stderr.on('data', (data) => {
    stderrData += data.toString();
  });

  const timer = setTimeout(() => {
    console.log(chalk.yellow(`\n⚠️ Timeout reached (${timeoutMs}ms). Terminating process...`));
    proc.kill('SIGTERM');
  }, timeoutMs);

  proc.on('close', (code, signal) => {
    clearTimeout(timer);
    const duration = Date.now() - startTime;
    
    console.log(chalk.gray(`\n--- Output ---`));
    if (stdoutData) console.log(stdoutData.trim());
    if (stderrData) console.error(chalk.red(stderrData.trim()));
    console.log(chalk.gray(`--------------`));

    if (signal === 'SIGTERM') {
      console.log(chalk.yellow(`\n🛑 Process was killed due to timeout after ${duration}ms.`));
    } else {
      console.log(chalk.green(`\n✅ Process exited with code ${code} after ${duration}ms.`));
    }
  });

  proc.on('error', (err) => {
    clearTimeout(timer);
    console.error(chalk.red(`\n❌ Failed to start process: ${err.message}`));
  });
}
