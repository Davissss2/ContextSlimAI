import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';

const MAX_LINES = 150; // Context ceiling, if it's bigger we start truncating the middle.
const HEAD_LINES = 75; // Number of lines to show at the top
const TAIL_LINES = 75; // Number of lines to show at the bottom

export async function catCommand(fileStr: string): Promise<void> {
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

    if (meaningfulLines.length <= MAX_LINES) {
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
      for (let i = 0; i < HEAD_LINES; i++) {
        console.log(chalk.gray(`${i + 1} | `) + chalk.white(meaningfulLines[i]));
      }

      // Snip
      const hiddenLinesCount = meaningfulLines.length - HEAD_LINES - TAIL_LINES;
      console.log(
        chalk.bold.yellow(
          `\n  ... [ ✂️ TRUNCATED: ${hiddenLinesCount} lines hidden to prevent token burnout ] ...\n`
        )
      );

      // Print Tail
      const startIndex = meaningfulLines.length - TAIL_LINES;
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
