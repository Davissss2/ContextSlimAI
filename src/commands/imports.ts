/**
 * imports — Extract only import/require statements from a file.
 * A file of 500 lines might have 15 imports → 97% token savings.
 * Supports: ES6 imports, CommonJS require, dynamic import()
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { MeterRecorder } from '../meter/recorder.js';

const IMPORT_PATTERNS = [
  /^\s*import\s+/,                          // import x from 'y'
  /^\s*import\s*\(/,                        // import('dynamic')
  /^\s*const\s+.*=\s*require\s*\(/,         // const x = require('y')
  /^\s*const\s+.*=\s*await\s+import\s*\(/,  // const x = await import('y')
  /^\s*export\s+.*\s+from\s+/,              // export { x } from 'y'
  /^\s*require\s*\(/,                       // require('y')
];

export async function importsCommand(fileStr: string): Promise<void> {
  if (!fileStr) {
    console.error(chalk.red('\n❌ Usage: contextslim imports <file>\n'));
    return;
  }

  const targetFile = resolve(process.cwd(), fileStr);

  try {
    const content = await readFile(targetFile, 'utf-8');
    const lines = content.split('\n');
    const imports: string[] = [];
    let inMultilineImport = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Continue collecting multi-line imports
      if (inMultilineImport) {
        imports.push(line.trimEnd());
        if (trimmed.includes(';') || (trimmed.endsWith("'") || trimmed.endsWith('"'))) {
          inMultilineImport = false;
        }
        continue;
      }

      // Check if line matches any import pattern
      if (IMPORT_PATTERNS.some(p => p.test(line))) {
        imports.push(line.trimEnd());

        // Check if this is a multi-line import (no semicolon or closing quote)
        if (!trimmed.endsWith(';') && !trimmed.match(/from\s+['"].*['"];?\s*$/)) {
          inMultilineImport = true;
        }
      }
    }

    console.log(chalk.bold.hex('#7C3AED')(`\n  📥 ContextSlim IMPORTS: ${targetFile}\n`));

    if (imports.length === 0) {
      console.log(chalk.yellow('  No import/require statements found.\n'));
      return;
    }

    for (const imp of imports) {
      // Colorize keywords
      const colored = imp
        .replace(/\b(import|from|require|export)\b/g, chalk.cyan('$1'))
        .replace(/(['"])([^'"]+)\1/g, chalk.green('$1$2$1'));
      console.log(`  ${colored}`);
    }

    const savings = ((1 - imports.length / lines.filter(l => l.trim()).length) * 100).toFixed(0);
    console.log(chalk.dim(`\n  (${imports.length} imports extracted from ${lines.length} lines — ${savings}% tokens saved)\n`));

    // Record meter event
    const outputText = imports.join('\n');
    MeterRecorder.record('file_read', fileStr, Buffer.byteLength(content, 'utf-8'), Buffer.byteLength(outputText, 'utf-8'));
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error reading file: ${error.message}\n`));
  }
}
