import { execSync } from 'node:child_process';
import chalk from 'chalk';

export async function diskCommand(dir?: string) {
  const isWindows = process.platform === 'win32';
  const target = dir || '.';

  console.log(chalk.blue(`💾 Disk Usage — ${target}`));
  console.log(chalk.gray('─'.repeat(60)));

  // Part 1: Filesystem overview
  try {
    let dfOutput: string;
    if (isWindows) {
      dfOutput = execSync('wmic logicaldisk get caption,freespace,size /format:list', { encoding: 'utf-8', timeout: 10000 });
      const blocks = dfOutput.split(/\n\n+/).filter(b => b.includes('Caption'));
      console.log(chalk.bold('Filesystems:'));
      for (const block of blocks) {
        const cap = block.match(/Caption=(.+)/)?.[1]?.trim();
        const free = block.match(/FreeSpace=(\d+)/)?.[1];
        const size = block.match(/Size=(\d+)/)?.[1];
        if (cap && size) {
          const sizeGB = (parseInt(size) / 1073741824).toFixed(1);
          const freeGB = free ? (parseInt(free) / 1073741824).toFixed(1) : '?';
          const usedPct = free ? Math.round((1 - parseInt(free) / parseInt(size)) * 100) : 0;
          console.log(`  ${cap}  ${sizeGB}GB total, ${freeGB}GB free (${usedPct}% used)`);
        }
      }
    } else {
      dfOutput = execSync('df -h --output=target,size,used,avail,pcent 2>/dev/null | head -15', { encoding: 'utf-8', timeout: 10000, shell: '/bin/sh' });
      console.log(chalk.bold('Filesystems:'));
      const lines = dfOutput.split('\n').filter(l => l.trim());
      for (const l of lines.slice(0, 10)) {
        console.log(`  ${l.trim()}`);
      }
    }
  } catch {
    console.log(chalk.yellow('  (filesystem info unavailable)'));
  }

  // Part 2: Directory sizes (top 10 biggest)
  console.log('');
  console.log(chalk.bold(`Top directories by size in ${target}:`));

  try {
    let duOutput: string;
    if (isWindows) {
      // Simplified for Windows
      duOutput = execSync(`powershell -Command "Get-ChildItem '${target}' -Directory -ErrorAction SilentlyContinue | ForEach-Object { $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; [PSCustomObject]@{Size=if($size){[math]::Round($size/1MB,1)}else{0};Name=$_.Name} } | Sort-Object Size -Descending | Select-Object -First 10 | ForEach-Object { '{0,8}MB  {1}' -f $_.Size, $_.Name }"`, { encoding: 'utf-8', timeout: 30000 });
    } else {
      duOutput = execSync(`du -sh ${target}/*/ 2>/dev/null | sort -rh | head -10`, { encoding: 'utf-8', timeout: 15000, shell: '/bin/sh' });
    }
    const lines = duOutput.split('\n').filter(l => l.trim());
    for (const l of lines) {
      console.log(`  ${l.trim()}`);
    }
    if (lines.length === 0) {
      console.log(chalk.gray('  (no subdirectories found)'));
    }
  } catch {
    console.log(chalk.yellow('  (directory sizes unavailable)'));
  }
}
