/**
 * types — Extract only TypeScript type definitions from a file.
 * Shows interfaces, types, enums, and class shapes without implementation details.
 * A 300-line file with 5 interfaces → ~85% token savings.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { MeterRecorder } from '../meter/recorder.js';

interface TypeBlock {
  kind: string;  // 'interface' | 'type' | 'enum' | 'class shape'
  name: string;
  lines: string[];
}

export async function typesCommand(fileStr: string): Promise<void> {
  if (!fileStr) {
    console.error(chalk.red('\n❌ Usage: contextslim types <file>\n'));
    return;
  }

  const targetFile = resolve(process.cwd(), fileStr);

  try {
    const content = await readFile(targetFile, 'utf-8');
    const lines = content.split('\n');
    const blocks: TypeBlock[] = [];

    let currentBlock: TypeBlock | null = null;
    let braceDepth = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      if (currentBlock) {
        // Track brace depth to find end of block
        for (const ch of trimmed) {
          if (ch === '{') braceDepth++;
          if (ch === '}') braceDepth--;
        }

        currentBlock.lines.push(line);

        if (braceDepth <= 0) {
          blocks.push(currentBlock);
          currentBlock = null;
          braceDepth = 0;
        }
        continue;
      }

      // Detect type definitions
      const interfaceMatch = trimmed.match(/^(?:export\s+)?interface\s+(\w+)/);
      const typeMatch = trimmed.match(/^(?:export\s+)?type\s+(\w+)/);
      const enumMatch = trimmed.match(/^(?:export\s+)?(?:const\s+)?enum\s+(\w+)/);

      if (interfaceMatch) {
        currentBlock = { kind: 'interface', name: interfaceMatch[1], lines: [line] };
        braceDepth = (trimmed.match(/{/g) || []).length - (trimmed.match(/}/g) || []).length;
        if (braceDepth <= 0 && trimmed.includes('{')) {
          blocks.push(currentBlock);
          currentBlock = null;
          braceDepth = 0;
        }
      } else if (typeMatch) {
        // Type aliases can be single-line
        currentBlock = { kind: 'type', name: typeMatch[1], lines: [line] };
        if (trimmed.endsWith(';') || !trimmed.includes('{')) {
          blocks.push(currentBlock);
          currentBlock = null;
        } else {
          braceDepth = (trimmed.match(/{/g) || []).length - (trimmed.match(/}/g) || []).length;
        }
      } else if (enumMatch) {
        currentBlock = { kind: 'enum', name: enumMatch[1], lines: [line] };
        braceDepth = (trimmed.match(/{/g) || []).length - (trimmed.match(/}/g) || []).length;
        if (braceDepth <= 0 && trimmed.includes('{')) {
          blocks.push(currentBlock);
          currentBlock = null;
          braceDepth = 0;
        }
      }
    }

    // Catch unclosed blocks
    if (currentBlock) blocks.push(currentBlock);

    console.log(chalk.bold.hex('#7C3AED')(`\n  🔷 ContextSlim TYPES: ${targetFile}\n`));

    if (blocks.length === 0) {
      console.log(chalk.yellow('  No type definitions (interface, type, enum) found.\n'));
      return;
    }

    const outputParts: string[] = [];

    for (const block of blocks) {
      const kindColor = block.kind === 'interface' ? chalk.cyan
        : block.kind === 'type' ? chalk.blue
        : chalk.green;

      console.log(kindColor.bold(`  ${block.kind.toUpperCase()}`) + chalk.white.bold(` ${block.name}`));

      for (const line of block.lines) {
        const colored = line
          .replace(/\b(export|interface|type|enum|const|extends|implements)\b/g, chalk.magenta('$1'))
          .replace(/:\s*(string|number|boolean|null|undefined|void|any|never|unknown|bigint)/g, ': ' + chalk.green('$1'))
          .replace(/(\w+)\s*\??\s*:/g, chalk.white('$1') + ':');

        console.log(`  ${colored}`);
        outputParts.push(line);
      }
      console.log('');
    }

    const outputText = outputParts.join('\n');
    const outputBytes = Buffer.byteLength(outputText, 'utf-8');
    const rawBytes = Buffer.byteLength(content, 'utf-8');
    const savings = rawBytes > 0 ? ((1 - outputBytes / rawBytes) * 100).toFixed(0) : '0';

    console.log(chalk.dim(`  (${blocks.length} type definitions extracted — ${savings}% tokens saved vs full file)\n`));

    MeterRecorder.record('file_read', fileStr, rawBytes, outputBytes);
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error reading file: ${error.message}\n`));
  }
}
