import { basename, resolve } from 'node:path';
import chalk from 'chalk';
import { detectStack, StackInfo } from '../analyzers/stack-detector.js';
import { detectEntryPoints, generateMiniTree } from '../analyzers/project-context.js';
import { MeterRecorder } from '../meter/recorder.js';

export async function generateBriefText(targetDir: string, stack: StackInfo): Promise<string> {
  const projectName = basename(targetDir);
  const entryPoints = await detectEntryPoints(targetDir, stack);
  const miniTree = await generateMiniTree(targetDir, 2);

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

  // Structure (depth 2 — shows subdirectories for better context)
  if (miniTree.trim()) {
    lines.push('');
    lines.push('Structure:');
    const treeLines = miniTree.split('\n').filter((l) => l.trim());
    // Include dirs + important root config files (max 20 lines)
    const IMPORTANT_EXTS = new Set(['.json', '.toml', '.yaml', '.yml', '.lock', '.ts', '.js', '.py', '.rs', '.go']);
    const filtered = treeLines.filter((l) => {
      if (l.endsWith('/')) return true; // Always include directories
      // Include root-level config files
      const trimmed = l.replace(/[├└│─\s]/g, '').trim();
      const ext = trimmed.includes('.') ? '.' + trimmed.split('.').pop() : '';
      return IMPORTANT_EXTS.has(ext);
    });
    const output = filtered.length > 0 ? filtered : treeLines;
    lines.push(...output.slice(0, 20).map((l) => `  ${l.trim()}`));
  }

  // Detected config files
  if (stack.detectedFiles.length > 0) {
    lines.push(`Config files: ${stack.detectedFiles.join(', ')}`);
  }

  return lines.join('\n');
}

export async function briefCommand(dir?: string): Promise<void> {
  const targetDir = resolve(dir || '.');
  const stack = await detectStack(targetDir);
  const brief = await generateBriefText(targetDir, stack);
  
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

  // Record: a naive AI would need to read all project files; brief compresses to ~300 tokens
  const briefBytes = Buffer.byteLength(brief, 'utf-8');
  MeterRecorder.recordBrief(targetDir, briefBytes * 20, briefBytes); // brief is ~20x smaller than reading everything
}
