import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';

export async function mapCommand(fileStr: string): Promise<void> {
  if (!fileStr) {
    console.error(chalk.red('\n❌ Usage: contextslim map <file>\n'));
    return;
  }

  const targetFile = resolve(process.cwd(), fileStr);
  
  // Basic RegExp to match function, class, and export signatures.
  const signatureRegex = /^(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const)[\s\w<>=:]+/;

  try {
    const content = await readFile(targetFile, 'utf-8');
    const lines = content.split('\n');
    const signatures: string[] = [];

    for (const line of lines) {
      if (signatureRegex.test(line.trim())) {
        // Find opening brace and cut it off to keep just the signature
        const braceIndex = line.indexOf('{');
        if (braceIndex !== -1) {
          signatures.push(line.substring(0, braceIndex).trim());
        } else {
          signatures.push(line.trim());
        }
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
        .replace(/\b(function|class|interface|type)\b/g, chalk.magenta('$1'))
        .replace(/\b(const|let)\b/g, chalk.blue('$1'));
        
      console.log(`  ${colored}`);
    }

    console.log(chalk.dim(`\n  (File mapped: Only structural signatures displayed to save massive tokens)\n`));
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error mapping file: ${error.message}\n`));
  }
}
