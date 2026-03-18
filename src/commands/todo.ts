/**
 * todo — Find all TODO/FIXME/HACK/NOTE/XXX comments in the project.
 * Gives AI instant context about pending work, known issues, and tech debt.
 * Much cheaper than grep — focused, capped, and organized by file.
 */

import { readFile, readdir } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import chalk from 'chalk';
import { MeterRecorder } from '../meter/recorder.js';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', 'dist', 'build', 'out',
  'coverage', '.cache', 'venv', '.venv', 'target', 'vendor',
  '__pycache__', '.idea', '.vscode',
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.mp4', '.mp3', '.wav', '.zip', '.tar', '.gz',
  '.woff', '.woff2', '.ttf', '.eot', '.pdf',
  '.exe', '.dll', '.so', '.lock',
]);

const TODO_PATTERN = /\b(TODO|FIXME|HACK|BUG|XXX|NOTE|OPTIMIZE|REFACTOR|TEMP|REVIEW)\b/i;

interface TodoItem {
  file: string;
  line: number;
  tag: string;
  text: string;
}

async function findTodos(dir: string, baseDir: string, todos: TodoItem[], maxTotal: number): Promise<void> {
  if (todos.length >= maxTotal) return;

  try {
    const items = await readdir(dir, { withFileTypes: true });

    for (const item of items) {
      if (todos.length >= maxTotal) return;
      if (IGNORED_DIRS.has(item.name)) continue;
      if (item.name.startsWith('.') && item.isDirectory()) continue;

      const fullPath = join(dir, item.name);

      if (item.isDirectory()) {
        await findTodos(fullPath, baseDir, todos, maxTotal);
      } else {
        const ext = item.name.slice(item.name.lastIndexOf('.')).toLowerCase();
        if (BINARY_EXTENSIONS.has(ext)) continue;

        try {
          const content = await readFile(fullPath, 'utf-8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            if (todos.length >= maxTotal) return;

            const match = lines[i].match(TODO_PATTERN);
            if (match) {
              // Extract the comment text after the tag
              const tag = match[1].toUpperCase();
              const lineText = lines[i].trim();
              // Clean up: remove comment markers and the tag itself
              const cleaned = lineText
                .replace(/^[\s/*#]+/, '')
                .replace(/\*\/\s*$/, '')
                .trim();

              todos.push({
                file: relative(baseDir, fullPath),
                line: i + 1,
                tag,
                text: cleaned.length > 80 ? cleaned.slice(0, 77) + '...' : cleaned,
              });
            }
          }
        } catch {
          // skip unreadable files
        }
      }
    }
  } catch {
    // permission errors
  }
}

const TAG_COLORS: Record<string, (s: string) => string> = {
  TODO: chalk.yellow,
  FIXME: chalk.red,
  HACK: chalk.hex('#FF6B6B'),
  BUG: chalk.red.bold,
  XXX: chalk.hex('#FF6B6B'),
  NOTE: chalk.cyan,
  OPTIMIZE: chalk.green,
  REFACTOR: chalk.hex('#F59E0B'),
  TEMP: chalk.dim,
  REVIEW: chalk.blue,
};

export async function todoCommand(dirStr?: string): Promise<void> {
  const targetDir = resolve(process.cwd(), dirStr || '.');
  const maxTotal = 50;
  const todos: TodoItem[] = [];

  console.log(chalk.bold.hex('#7C3AED')(`\n  📝 ContextSlim TODO\n`));

  await findTodos(targetDir, targetDir, todos, maxTotal);

  if (todos.length === 0) {
    console.log(chalk.green('  ✅ No TODO/FIXME/HACK comments found. Clean codebase!\n'));
    return;
  }

  // Group by tag
  const byTag: Record<string, TodoItem[]> = {};
  for (const todo of todos) {
    if (!byTag[todo.tag]) byTag[todo.tag] = [];
    byTag[todo.tag].push(todo);
  }

  // Show summary first
  const tagSummary = Object.entries(byTag)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([tag, items]) => {
      const colorFn = TAG_COLORS[tag] || chalk.white;
      return colorFn(`${tag}(${items.length})`);
    })
    .join(chalk.dim(' · '));

  console.log(chalk.dim('  Summary: ') + tagSummary);
  console.log('');

  // Show all items grouped by file
  const byFile: Record<string, TodoItem[]> = {};
  for (const todo of todos) {
    if (!byFile[todo.file]) byFile[todo.file] = [];
    byFile[todo.file].push(todo);
  }

  for (const [file, items] of Object.entries(byFile)) {
    console.log(chalk.cyan(`  📄 ${file}`));
    for (const item of items) {
      const colorFn = TAG_COLORS[item.tag] || chalk.white;
      console.log(
        chalk.gray(`     ${item.line.toString().padStart(4)} | `) +
        colorFn(`[${item.tag}]`) +
        chalk.white(` ${item.text.replace(new RegExp(`^${item.tag}:?\\s*`, 'i'), '')}`)
      );
    }
    console.log('');
  }

  if (todos.length >= maxTotal) {
    console.log(chalk.dim(`  ... capped at ${maxTotal} items to save tokens.\n`));
  }

  // Record meter event
  const outputText = todos.map(t => `${t.file}:${t.line} [${t.tag}] ${t.text}`).join('\n');
  const outputBytes = Buffer.byteLength(outputText, 'utf-8');
  MeterRecorder.recordGrep('todo-scan', outputBytes * 5, outputBytes);
}
