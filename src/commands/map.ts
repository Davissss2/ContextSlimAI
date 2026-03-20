import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { MeterRecorder } from '../meter/recorder.js';
import { ConfigManager } from '../utils/config.js';

export async function mapCommand(fileStr: string): Promise<void> {
  if (!fileStr) {
    console.error(chalk.red('\n❌ Usage: contextslim map <file>\n'));
    return;
  }

  const config = ConfigManager.loadConfig();
  const maxLineWidth = config.limits.maxLineWidth;
  const targetFile = resolve(process.cwd(), fileStr);
  
  // Only match top-level declarations (0-2 spaces indent = module level)
  const signatureRegex = /^(\s{0,2})(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|enum)\s/;
  // For const/let, only match exports or top-level (not local vars)
  const constRegex = /^(?:export\s+)(?:const|let)\s/;

  try {
    const content = await readFile(targetFile, 'utf-8');
    const lines = content.split('\n');
    const signatures: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (signatureRegex.test(line) || constRegex.test(trimmed)) {
        // Find opening brace and cut it off to keep just the signature
        const braceIndex = line.indexOf('{');
        let sig: string;
        if (braceIndex !== -1) {
          sig = line.substring(0, braceIndex).trim();
        } else {
          sig = trimmed;
        }
        // Truncate long signatures
        if (sig.length > maxLineWidth) {
          sig = sig.substring(0, maxLineWidth) + '…';
        }
        signatures.push(sig);
      }
    }

    console.log(chalk.bold.hex('#7C3AED')(`\n  🗺️  ContextSlim MAP: ${targetFile}\n`));
    
    if (signatures.length === 0) {
       console.log(chalk.yellow(`  No structural signatures (classes, functions, interfaces) found.\n`));
       return;
    }

    for (const sig of signatures) {
      // Colorize the keywords
      let colored = sig
        .replace(/\b(export|async)\b/g, chalk.cyan('$1'))
        .replace(/\b(function|class|interface|type|enum)\b/g, chalk.magenta('$1'))
        .replace(/\b(const|let)\b/g, chalk.blue('$1'));
        
      console.log(`  ${colored}`);
    }

    console.log(chalk.dim(`\n  (${signatures.length} signatures from ${lines.length} lines)\n`));

    // Record: raw file vs compressed signatures output
    const sigText = signatures.join('\n');
    MeterRecorder.recordMap(fileStr, Buffer.byteLength(content, 'utf-8'), Buffer.byteLength(sigText, 'utf-8'));
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error mapping file: ${error.message}\n`));
  }
}

