/**
 * changes — Compact git log + diffs. Replaces verbose `git log` + `git show`.
 * Shows last N commits with only changed files and insertion/deletion counts.
 * A typical `git log -5 --stat` might be 200 lines → this shows ~30.
 */

import { execSync } from 'node:child_process';
import chalk from 'chalk';

export async function changesCommand(count?: string) {
  const n = count ? parseInt(count, 10) : 5;
  if (isNaN(n) || n < 1 || n > 20) {
    console.error(chalk.red('❌ Count must be 1-20'));
    return;
  }

  console.log(chalk.blue(`📝 Last ${n} commits (compact)`));
  console.log(chalk.gray('─'.repeat(60)));

  try {
    // One-liner format: hash | date | author | message
    const log = execSync(
      `git log -${n} --pretty=format:"%h|%ar|%an|%s" --stat --stat-width=60 --stat-name-width=35`,
      { encoding: 'utf-8', timeout: 10000 }
    );

    const blocks = log.split(/\n(?=[0-9a-f]{7,}\|)/);

    for (const block of blocks) {
      const lines = block.split('\n').filter(l => l.trim());
      if (lines.length === 0) continue;

      const [header, ...statLines] = lines;
      const parts = header.split('|');
      if (parts.length >= 4) {
        const [hash, date, author, ...msgParts] = parts;
        const msg = msgParts.join('|'); // In case message has |
        console.log(
          chalk.yellow(hash) + ' ' +
          chalk.gray(`(${date})`) + ' ' +
          chalk.cyan(author) + ': ' +
          chalk.white(msg.substring(0, 80))
        );
      }

      // Show only the summary line (N files changed, X insertions, Y deletions)
      const summaryLine = statLines.find(l => /files? changed/.test(l));
      if (summaryLine) {
        console.log(chalk.dim(`  ${summaryLine.trim()}`));
      }

      // Show max 5 changed files
      const fileLines = statLines.filter(l => l.includes('|') && !l.includes('files? changed'));
      for (const fl of fileLines.slice(0, 5)) {
        const trimmed = fl.trim();
        if (trimmed.length > 0) {
          console.log(chalk.dim(`  ${trimmed.substring(0, 70)}`));
        }
      }
      if (fileLines.length > 5) {
        console.log(chalk.dim(`  ... +${fileLines.length - 5} more files`));
      }
      console.log('');
    }
  } catch (e: any) {
    if (e.message.includes('not a git repository')) {
      console.error(chalk.red('❌ Not a git repository'));
    } else {
      console.error(chalk.red(`❌ ${e.message}`));
    }
  }
}
