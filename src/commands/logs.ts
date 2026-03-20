import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import chalk from 'chalk';

const MAX_LINES = 50;

export async function logsCommand(file: string, lines?: string) {
  if (!existsSync(file)) {
    console.error(chalk.red(`❌ File not found: ${file}`));
    return;
  }

  const maxLines = lines ? parseInt(lines, 10) : MAX_LINES;
  if (isNaN(maxLines) || maxLines < 1) {
    console.error(chalk.red('❌ Invalid line count.'));
    return;
  }

  const content = await readFile(file, 'utf-8');
  const allLines = content.split(/\r?\n/).filter(l => l.trim() !== '');

  // Strip common timestamp prefixes to save tokens
  const stripped = allLines.map(l =>
    l.replace(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*Z?\s*[-|]?\s*/g, '')
     .replace(/^\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\S+\s+/g, '') // syslog format
     .trim()
  ).filter(l => l.length > 0);

  const tail = stripped.slice(-maxLines);
  const total = allLines.length;

  console.log(chalk.blue(`📋 ${file} — last ${tail.length} of ${total} lines (timestamps stripped)`));
  console.log(chalk.gray('─'.repeat(60)));
  tail.forEach(l => console.log(l));
  if (total > maxLines) {
    console.log(chalk.gray(`\n... ${total - maxLines} earlier lines omitted`));
  }
}
