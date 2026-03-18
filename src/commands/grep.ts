import { stat, readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import chalk from 'chalk';
import { ConfigManager } from '../utils/config.js';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', 'dist', 'build', 'out', 'coverage', '.cache', 'venv', '.venv', 'target', 'vendor'
]);

async function searchDirectory(dir: string, query: string, results: { file: string; line: number; content: string }[], maxResults: number, maxMatchesPerFile: number) {
  if (results.length >= maxResults) return;

  try {
    const files = await readdir(dir, { withFileTypes: true });
    for (const file of files) {
      if (IGNORED_DIRS.has(file.name)) continue;

      const fullPath = join(dir, file.name);
      if (file.isDirectory()) {
        await searchDirectory(fullPath, query, results, maxResults, maxMatchesPerFile);
      } else {
        await searchFile(fullPath, query, results, maxResults, maxMatchesPerFile);
      }
    }
  } catch {
    // ignore permission errors
  }
}

async function searchFile(file: string, query: string, results: { file: string; line: number; content: string }[], maxResults: number, maxMatchesPerFile: number) {
  if (results.length >= maxResults) return;
  // skip binary or obvious non-text files based on extension
  if (file.match(/\.(png|jpg|jpeg|gif|ico|svg|mp4|zip|tar\.gz|pdf|lock|exe|dll)$/i)) return;

  try {
    const content = await readFile(file, 'utf-8');
    const lines = content.split('\n');
    let matchesInFile = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(query)) {
        if (matchesInFile < maxMatchesPerFile) {
          results.push({ file, line: i + 1, content: lines[i].trim() });
          matchesInFile++;
        }
        if (results.length >= maxResults) return;
      }
    }
  } catch {
    // ignore read errors
  }
}

export async function grepCommand(query: string, dirStr?: string): Promise<void> {
  const config = ConfigManager.loadConfig();
  const maxMatchesPerFile = config.limits.grepMatches;
  
  const targetDir = resolve(process.cwd(), dirStr || '.');
  const maxResults = 50;
  const results: { file: string; line: number; content: string }[] = [];

  console.log(chalk.bold.hex('#7C3AED')(`\n  🔍 ContextSlim GREP: "${query}" in ${targetDir}\n`));

  await searchDirectory(targetDir, query, results, maxResults, maxMatchesPerFile);

  if (results.length === 0) {
    console.log(chalk.yellow(`  No matches found for "${query}".\n`));
    return;
  }

  const grouped: Record<string, { line: number; content: string }[]> = {};
  for (const r of results) {
    if (!grouped[r.file]) grouped[r.file] = [];
    grouped[r.file].push({ line: r.line, content: r.content });
  }

  for (const [file, matches] of Object.entries(grouped)) {
    console.log(chalk.cyan(`  📄 ${file}`));
    for (const m of matches) {
      console.log(chalk.gray(`     ${m.line} | `) + chalk.white(m.content));
    }
    if (matches.length === maxMatchesPerFile) {
      console.log(chalk.dim(`     ... [Truncated max matches per file]`));
    }
    console.log('');
  }

  if (results.length >= maxResults) {
    console.log(chalk.yellow(`  ⚠️ Stopping at ${maxResults} total matches to save context.`));
  }
  console.log('');
}
