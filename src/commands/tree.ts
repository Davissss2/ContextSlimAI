import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import chalk from 'chalk';
import { ConfigManager } from '../utils/config.js';
import { MeterRecorder } from '../meter/recorder.js';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', 'dist', 'build', 'out', 'coverage', '.cache', 'venv', '.venv', 'target', 'vendor'
]);

let _treeOutputLines = 0;

async function generateTree(dirPath: string, prefix = '', depth = 0, maxDepth = 3): Promise<number> {
  if (depth > maxDepth) {
    console.log(chalk.dim(`${prefix}├── ... [Max depth reached, use 'ls' for deeper inspect]`));
    _treeOutputLines++;
    return 0; // stop deep dive to save tokens
  }

  let hiddenCount = 0;
  try {
    const items = await readdir(dirPath, { withFileTypes: true });
    items.sort((a, b) => {
      // Dirs first, then files
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (IGNORED_DIRS.has(item.name)) {
        hiddenCount++;
        continue;
      }

      const isLast = i === items.length - 1;
      const branch = isLast ? '└── ' : '├── ';

      if (item.isDirectory()) {
        console.log(`${prefix}${branch}${chalk.cyan.bold(item.name)}/`);
        _treeOutputLines++;
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        hiddenCount += await generateTree(join(dirPath, item.name), nextPrefix, depth + 1, maxDepth);
      } else {
        console.log(`${prefix}${branch}${chalk.white(item.name)}`);
        _treeOutputLines++;
      }
    }
  } catch {
    console.log(chalk.red(`${prefix}└── [Access Denied]`));
  }
  return hiddenCount;
}

export async function treeCommand(dirStr?: string, maxDepthStr?: string): Promise<void> {
  const config = ConfigManager.loadConfig();
  const targetDir = resolve(process.cwd(), dirStr || '.');
  const maxDepth = maxDepthStr ? parseInt(maxDepthStr, 10) : config.limits.treeDepth;

  console.log(chalk.bold.hex('#7C3AED')(`\n  🌳 ContextSlim TREE (Max Depth: ${maxDepth})\n`));
  console.log(chalk.cyan.bold(targetDir));

  _treeOutputLines = 0;
  const totalHidden = await generateTree(targetDir, '', 0, maxDepth);

  console.log(chalk.dim(`\n  (Tree mapped. ${totalHidden} noisy or irrelevant folders skipped to protect context memory)\n`));

  // Record: estimate raw tree size (all files+dirs including ignored) vs compact output
  const rawEstimate = (_treeOutputLines + totalHidden * 15) * 40; // rough: ignored dirs hold ~15 entries, ~40 bytes each
  const outputEstimate = _treeOutputLines * 40;
  MeterRecorder.recordTree(targetDir, rawEstimate, outputEstimate);
}
