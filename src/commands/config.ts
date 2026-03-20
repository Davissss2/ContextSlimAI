/**
 * config — Smart config file reader.
 * Strips comments, empty lines, and trailing whitespace.
 * A 200-line nginx.conf → ~40 lines (~80% savings).
 * Works with: nginx, apache, ini, yaml, toml, env, properties, etc.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname } from 'node:path';
import chalk from 'chalk';

const COMMENT_PATTERNS: Record<string, RegExp[]> = {
  // Hash comments: bash, yaml, toml, nginx, apache, python, ruby, env, properties
  hash: [/^\s*#/],
  // Double slash: JS, TS, C, Go, Rust, Java
  doubleslash: [/^\s*\/\//],
  // Semicolon: ini, asm
  semicolon: [/^\s*;/],
  // XML/HTML comments (simplified)
  xml: [/^\s*<!--/, /-->\s*$/],
};

function getCommentPatterns(file: string): RegExp[] {
  const ext = extname(file).toLowerCase();
  const patterns: RegExp[] = [];

  switch (ext) {
    case '.conf': case '.cfg': case '.nginx': case '.htaccess':
    case '.yaml': case '.yml': case '.toml': case '.env':
    case '.properties': case '.sh': case '.bash': case '.zsh':
    case '.py': case '.rb': case '.pl':
      patterns.push(...COMMENT_PATTERNS.hash);
      break;
    case '.js': case '.ts': case '.jsx': case '.tsx':
    case '.c': case '.cpp': case '.h': case '.go':
    case '.rs': case '.java': case '.kt': case '.swift':
    case '.cs': case '.php':
      patterns.push(...COMMENT_PATTERNS.doubleslash);
      break;
    case '.ini':
      patterns.push(...COMMENT_PATTERNS.semicolon, ...COMMENT_PATTERNS.hash);
      break;
    case '.xml': case '.html': case '.svg':
      patterns.push(...COMMENT_PATTERNS.xml);
      break;
    default:
      // Try all comment patterns
      patterns.push(...COMMENT_PATTERNS.hash, ...COMMENT_PATTERNS.doubleslash, ...COMMENT_PATTERNS.semicolon);
  }

  return patterns;
}

const MAX_OUTPUT_LINES = 100;

export async function configCommand(file: string) {
  if (!existsSync(file)) {
    console.error(chalk.red(`❌ File not found: ${file}`));
    return;
  }

  const content = await readFile(file, 'utf-8');
  const allLines = content.split(/\r?\n/);
  const commentPatterns = getCommentPatterns(file);

  const meaningful: { num: number; text: string }[] = [];

  let inBlockComment = false;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Skip block comments /* ... */
    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inBlockComment = true;
      continue;
    }

    // Skip single-line comments
    let isComment = false;
    for (const pattern of commentPatterns) {
      if (pattern.test(trimmed)) {
        isComment = true;
        break;
      }
    }
    if (isComment) continue;

    // Strip inline comments (but be careful with strings)
    let cleanLine = trimmed;
    // Only strip if # is not inside quotes
    if (!cleanLine.includes('"') && !cleanLine.includes("'")) {
      const hashIdx = cleanLine.indexOf('#');
      if (hashIdx > 0) cleanLine = cleanLine.substring(0, hashIdx).trimEnd();
      const slashIdx = cleanLine.indexOf('//');
      if (slashIdx > 0) cleanLine = cleanLine.substring(0, slashIdx).trimEnd();
    }

    if (cleanLine.length > 120) {
      cleanLine = cleanLine.substring(0, 120) + '…';
    }

    meaningful.push({ num: i + 1, text: cleanLine });
  }

  const total = allLines.length;
  const stripped = total - meaningful.length;
  const savings = total > 0 ? Math.round((stripped / total) * 100) : 0;

  console.log(chalk.blue(`⚙️  ${file} — ${meaningful.length} lines (${stripped} comments/blanks stripped, ${savings}% savings)`));
  console.log(chalk.gray('─'.repeat(60)));

  const display = meaningful.slice(0, MAX_OUTPUT_LINES);
  for (const line of display) {
    console.log(chalk.gray(`${String(line.num).padStart(4)} | `) + line.text);
  }

  if (meaningful.length > MAX_OUTPUT_LINES) {
    console.log(chalk.gray(`\n  ... ${meaningful.length - MAX_OUTPUT_LINES} more lines omitted`));
  }
}
