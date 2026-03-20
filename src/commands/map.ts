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
  
  // Match functions, classes, interfaces, types, enums
  const signatureRegex = /^(\s{0,2})(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function|class|interface|type|enum)\s/;
  
  // Match constant/let declarations (often used for React components or config)
  // We want: export const, or top-level const that defines an arrow function/array/object
  const constRegex = /^(?:export\s+(?:default\s+)?)?(?:const|let)\s+([a-zA-Z0-9_]+)\s*=/;
  
  // Match export default identifier
  const defaultExportRegex = /^export\s+default\s+[a-zA-Z0-9_]+/;

  try {
    const content = await readFile(targetFile, 'utf-8');
    const lines = content.split('\n');
    const signatures: string[] = [];

    for (const line of lines) {
      if (signatureRegex.test(line) || constRegex.test(line) || defaultExportRegex.test(line)) {
        // Find opening brace or equals sign and clean it
        let sig = line.trim();
        const braceIndex = sig.indexOf('{');
        const arrowIndex = sig.indexOf('=>');
        
        if (braceIndex !== -1 && (arrowIndex === -1 || braceIndex < arrowIndex)) {
          sig = sig.substring(0, braceIndex).trim();
        } else if (arrowIndex !== -1 && sig.endsWith('{')) {
          sig = sig.replace(/\{\s*$/, '').trim();
        }

        // Clean up exported arrays/objects that start on this line
        if (sig.endsWith('[') || sig.endsWith('{')) {
          sig = sig.substring(0, sig.length - 1).trim();
        }

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

