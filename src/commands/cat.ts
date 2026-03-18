import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { ConfigManager } from '../utils/config.js';

export async function catCommand(fileStr: string): Promise<void> {
  const config = ConfigManager.loadConfig();
  const maxLines = config.limits.catLines;
  const headLines = Math.floor(maxLines / 2);
  const tailLines = Math.ceil(maxLines / 2);

  if (!fileStr) {
    console.error(chalk.red('\n❌ Usage: contextslim cat <file>\n'));
    return;
  }

  const targetFile = resolve(process.cwd(), fileStr);

  try {
    const content = await readFile(targetFile, 'utf-8');
    const allLines = content.split('\n');

    // Remove empty lines or purely whitespace lines to pack density
    const meaningfulLines = allLines.filter((l) => l.trim().length > 0);
    const blankLinesRemoved = allLines.length - meaningfulLines.length;

    console.log(chalk.bold.hex('#7C3AED')(`\n  📄 ContextSlim CAT: ${targetFile}\n`));


    if (meaningfulLines.length <= maxLines) {
      meaningfulLines.forEach((l, i) => {
        console.log(chalk.gray(`${i + 1} | `) + chalk.white(l));
      });
      console.log(
        chalk.dim(
          `\n  (Full file shown. ${blankLinesRemoved} blank lines stripped for context efficiency)\n`
        )
      );
    } else {
      // Print Head
      for (let i = 0; i < headLines; i++) {
        console.log(chalk.gray(`${i + 1} | `) + chalk.white(meaningfulLines[i]));
      }

      // Snip
      const hiddenLinesCount = meaningfulLines.length - headLines - tailLines;
      console.log(
        chalk.bold.yellow(
          `\n  ... [ ✂️ TRUNCATED: ${hiddenLinesCount} lines hidden to prevent token burnout ] ...\n`
        )
      );

      // Print Tail
      const startIndex = meaningfulLines.length - tailLines;
      for (let i = startIndex; i < meaningfulLines.length; i++) {
        console.log(chalk.gray(`${i + 1} | `) + chalk.white(meaningfulLines[i]));
      }

      console.log(
        chalk.dim(
          `\n  (File too large. ${blankLinesRemoved} blank lines stripped and middle hidden. Use specialized grep for deeper search)\n`
        )
      );
    }
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error reading file: ${error.message}\n`));
  }
}
