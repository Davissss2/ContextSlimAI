import { execSync } from 'node:child_process';
import chalk from 'chalk';

const HEAVY_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', 'venv', '__pycache__', 'vendor', '.next', '.nuxt'];
const MAX_RESULTS = 30;

export async function findfilesCommand(pattern: string, dir?: string) {
  const isWindows = process.platform === 'win32';
  const target = dir || '.';

  console.log(chalk.blue(`🔍 Find: "${pattern}" in ${target} (max ${MAX_RESULTS} results)`));
  console.log(chalk.gray('─'.repeat(60)));

  try {
    let raw: string;

    if (isWindows) {
      const excludes = HEAVY_DIRS.map(d => `$_.FullName -notlike '*\\\\${d}\\\\*'`).join(' -and ');
      raw = execSync(
        `powershell -Command "Get-ChildItem '${target}' -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*${pattern}*' -and ${excludes} } | Select-Object -First ${MAX_RESULTS} | ForEach-Object { $rel = $_.FullName.Replace((Resolve-Path '${target}').Path + '\\\\', ''); if($_.PSIsContainer){'📁 '+$rel}else{'{0,8}  {1}' -f ('{0:N0}B' -f $_.Length), $rel} }"`,
        { encoding: 'utf-8', timeout: 20000 }
      );
    } else {
      const excludes = HEAVY_DIRS.map(d => `-not -path '*/${d}/*'`).join(' ');
      raw = execSync(
        `find ${target} ${excludes} -iname '*${pattern}*' 2>/dev/null | head -${MAX_RESULTS}`,
        { encoding: 'utf-8', timeout: 15000, shell: '/bin/sh' }
      );
    }

    const lines = raw.split('\n').filter(l => l.trim());

    if (lines.length === 0) {
      console.log(chalk.yellow(`  No files matching "${pattern}" found.`));
      return;
    }

    for (const l of lines) {
      console.log(`  ${l.trim()}`);
    }

    if (lines.length >= MAX_RESULTS) {
      console.log(chalk.gray(`\n  ... results capped at ${MAX_RESULTS}. Narrow your search.`));
    } else {
      console.log(chalk.gray(`\n  ${lines.length} results found.`));
    }
  } catch (e: any) {
    console.error(chalk.red(`❌ Error: ${e.message}`));
  }
}
