/**
 * outline — Recursive map of all source files in a directory.
 * Like running `map` on every file at once.
 * Shows the full architecture of a codebase in one compact output.
 * 
 * A 50-file project might be 10,000 lines → outline shows ~200 lines (98% savings)
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import chalk from 'chalk';
import { ConfigManager } from '../utils/config.js';
import { MeterRecorder } from '../meter/recorder.js';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', 'dist', 'build', 'out',
  'coverage', '.cache', 'venv', '.venv', 'target', 'vendor',
  '.idea', '.vscode', '__pycache__',
]);

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rs', '.go', '.java', '.kt', '.swift',
  '.c', '.cpp', '.h', '.hpp', '.cs',
  '.rb', '.php', '.lua', '.zig',
  '.vue', '.svelte', '.astro',
]);

const SIGNATURE_REGEX = /^(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const|let|enum|struct|impl|def|fn|pub\s+fn|pub\s+struct|pub\s+enum|func)\s/;

interface FileOutline {
  path: string;
  signatures: string[];
  rawBytes: number;
}

async function extractSignatures(filePath: string): Promise<FileOutline | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const signatures: string[] = [];

    for (const line of lines) {
      if (SIGNATURE_REGEX.test(line.trim())) {
        const braceIndex = line.indexOf('{');
        if (braceIndex !== -1) {
          signatures.push(line.substring(0, braceIndex).trim());
        } else {
          signatures.push(line.trim());
        }
      }
    }

    if (signatures.length === 0) return null;

    return {
      path: filePath,
      signatures,
      rawBytes: Buffer.byteLength(content, 'utf-8'),
    };
  } catch {
    return null;
  }
}

async function walkForOutline(dir: string, outlines: FileOutline[]): Promise<void> {
  try {
    const items = await readdir(dir, { withFileTypes: true });

    for (const item of items) {
      if (IGNORED_DIRS.has(item.name)) continue;
      if (item.name.startsWith('.') && item.isDirectory()) continue;

      const fullPath = join(dir, item.name);

      if (item.isDirectory()) {
        await walkForOutline(fullPath, outlines);
      } else {
        const ext = item.name.slice(item.name.lastIndexOf('.')).toLowerCase();
        if (!CODE_EXTENSIONS.has(ext)) continue;

        // Skip test files
        if (item.name.includes('.test.') || item.name.includes('.spec.') || item.name.includes('__test__')) continue;

        const outline = await extractSignatures(fullPath);
        if (outline) outlines.push(outline);
      }
    }
  } catch {
    // permission errors
  }
}

export async function outlineCommand(dirStr?: string): Promise<void> {
  const targetDir = resolve(process.cwd(), dirStr || '.');

  console.log(chalk.bold.hex('#7C3AED')(`\n  🏗️  ContextSlim OUTLINE\n`));

  const outlines: FileOutline[] = [];
  await walkForOutline(targetDir, outlines);

  if (outlines.length === 0) {
    console.log(chalk.yellow('  No source files with signatures found.\n'));
    return;
  }

  // Sort by path for logical grouping
  outlines.sort((a, b) => a.path.localeCompare(b.path));

  let totalRawBytes = 0;
  let totalOutputLines = 0;
  const outputParts: string[] = [];

  for (const file of outlines) {
    const relPath = relative(targetDir, file.path);
    totalRawBytes += file.rawBytes;

    const header = `📄 ${relPath}`;
    console.log(chalk.cyan.bold(`  ${header}`));
    outputParts.push(header);

    for (const sig of file.signatures) {
      const colored = sig
        .replace(/\b(export|async)\b/g, chalk.cyan('$1'))
        .replace(/\b(function|class|interface|type|enum|struct|impl|def|fn|pub)\b/g, chalk.magenta('$1'))
        .replace(/\b(const|let)\b/g, chalk.blue('$1'));

      console.log(chalk.dim('     ') + colored);
      outputParts.push(`  ${sig}`);
      totalOutputLines++;
    }
    console.log('');
  }

  const outputText = outputParts.join('\n');
  const outputBytes = Buffer.byteLength(outputText, 'utf-8');
  const savings = totalRawBytes > 0 ? ((1 - outputBytes / totalRawBytes) * 100).toFixed(0) : '0';

  console.log(chalk.dim('  ─'.repeat(25)));
  console.log(
    chalk.dim('  ') +
    chalk.white(`${outlines.length} files`) +
    chalk.dim(' → ') +
    chalk.white(`${totalOutputLines} signatures`) +
    chalk.dim(' | ') +
    chalk.green.bold(`${savings}% tokens saved`)
  );
  console.log('');

  MeterRecorder.recordMap(targetDir, totalRawBytes, outputBytes);
}
