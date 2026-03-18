import { basename, resolve } from 'node:path';
import chalk from 'chalk';
import { detectStack } from '../analyzers/stack-detector.js';
import { detectEntryPoints, generateMiniTree } from '../analyzers/project-context.js';

export async function briefCommand(dir?: string): Promise<void> {
  const targetDir = resolve(dir || '.');
  const projectName = basename(targetDir);

  const stack = await detectStack(targetDir);
  const entryPoints = await detectEntryPoints(targetDir, stack);
  const miniTree = await generateMiniTree(targetDir, 1);

  // Build the brief
  const lines: string[] = [];

  // Header
  lines.push(`Project: ${projectName}`);
  lines.push(`Stack: ${stack.name}`);
  lines.push(`Language: ${stack.language}${stack.hasTypeScript ? ' (TypeScript)' : ''}`);

  if (stack.frameworks.length > 0) {
    lines.push(`Frameworks: ${stack.frameworks.join(', ')}`);
  }

  // Entry points
  if (entryPoints.length > 0) {
    const epList = entryPoints.map((ep) => `${ep.file} (${ep.label})`).join(', ');
    lines.push(`Entry points: ${epList}`);
  }

  // Structure (depth 1 only — very compact)
  if (miniTree.trim()) {
    lines.push('');
    lines.push('Structure:');
    const treeLines = miniTree.split('\n').filter((l) => l.trim());
    // Only include directories for maximum compression
    const dirLines = treeLines.filter((l) => l.endsWith('/'));
    if (dirLines.length > 0) {
      lines.push(...dirLines.map((l) => `  ${l.trim()}`));
    } else {
      lines.push(...treeLines.slice(0, 15).map((l) => `  ${l.trim()}`));
    }
  }

  // Detected config files
  if (stack.detectedFiles.length > 0) {
    lines.push(`Config files: ${stack.detectedFiles.join(', ')}`);
  }

  const brief = lines.join('\n');
  const tokenEstimate = Math.round(brief.length / 4); // rough estimate: ~4 chars per token

  // Print colored output
  console.log('');
  console.log(chalk.cyan.bold('  📋 Project Brief'));
  console.log(chalk.gray('  ─'.repeat(25)));
  console.log('');
  console.log(brief);
  console.log('');
  console.log(chalk.gray('  ─'.repeat(25)));
  console.log(
    chalk.green(`  ~${tokenEstimate} tokens`) +
      chalk.gray(' — copy and paste this into any AI conversation for instant context'),
  );
  console.log('');
}
