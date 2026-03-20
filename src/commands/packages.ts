import { execSync } from 'node:child_process';
import chalk from 'chalk';

export async function packagesCommand(filter?: string) {
  const isWindows = process.platform === 'win32';

  console.log(chalk.blue(`📦 Installed Packages${filter ? ` (filter: ${filter})` : ''}`));
  console.log(chalk.gray('─'.repeat(60)));

  try {
    let raw: string;

    if (isWindows) {
      const filterClause = filter ? `| Where-Object { $_.Name -like '*${filter}*' }` : '';
      raw = execSync(
        `powershell -Command "Get-Package ${filterClause} | Select-Object -First 30 Name, Version | Format-Table -AutoSize"`,
        { encoding: 'utf-8', timeout: 15000 }
      );
    } else {
      // Try dpkg first (Debian/Ubuntu), then rpm (RHEL/CentOS), then apk (Alpine)
      const filterArg = filter || '';
      try {
        raw = execSync(
          `dpkg-query -W --showformat='\${Package}||\${Version}||\${Status}\\n' 2>/dev/null | grep 'install ok installed' | grep -i '${filterArg}' | head -40 | awk -F'||' '{printf "  %-35s %s\\n", $1, $2}'`,
          { encoding: 'utf-8', timeout: 15000, shell: '/bin/sh' }
        );
      } catch {
        try {
          raw = execSync(
            `rpm -qa --queryformat '%-35{NAME} %{VERSION}\\n' 2>/dev/null | grep -i '${filterArg}' | sort | head -40`,
            { encoding: 'utf-8', timeout: 15000, shell: '/bin/sh' }
          );
        } catch {
          try {
            raw = execSync(
              `apk list --installed 2>/dev/null | grep -i '${filterArg}' | head -40`,
              { encoding: 'utf-8', timeout: 15000, shell: '/bin/sh' }
            );
          } catch {
            console.log(chalk.yellow('  No supported package manager found (dpkg/rpm/apk).'));
            return;
          }
        }
      }
    }

    const lines = raw.split('\n').filter(l => l.trim());
    console.log(chalk.bold(`  ${'Package'.padEnd(36)}Version`));
    for (const l of lines) {
      console.log(`  ${l.trim()}`);
    }
    console.log(chalk.gray(`\n  Showing ${lines.length} packages${filter ? ` matching "${filter}"` : ' (use filter to narrow)'}`));
  } catch (e: any) {
    console.error(chalk.red(`❌ Error: ${e.message}`));
  }
}
