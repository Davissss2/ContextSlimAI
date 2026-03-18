/**
 * deps — Compact dependency viewer.
 * Instead of AI reading the entire package.json (~200-2000 tokens),
 * shows only dependency names in a dense format (~20-80 tokens).
 * Also shows scripts and basic project info.
 */

import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import chalk from 'chalk';
import { MeterRecorder } from '../meter/recorder.js';

interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  type?: string;
}

export async function depsCommand(): Promise<void> {
  const targetDir = resolve(process.cwd());
  const pkgPath = join(targetDir, 'package.json');

  try {
    const content = await readFile(pkgPath, 'utf-8');
    const pkg: PackageJson = JSON.parse(content);

    console.log(chalk.bold.hex('#7C3AED')(`\n  📦 ContextSlim DEPS\n`));

    // Project header (1 line)
    const header = [
      pkg.name && chalk.white.bold(pkg.name),
      pkg.version && chalk.dim(`v${pkg.version}`),
      pkg.type && chalk.dim(`(${pkg.type})`),
    ].filter(Boolean).join(' ');
    if (header) console.log(`  ${header}`);
    if (pkg.description) console.log(chalk.dim(`  ${pkg.description}`));
    console.log('');

    // Scripts (compact, 1 line each)
    if (pkg.scripts && Object.keys(pkg.scripts).length > 0) {
      console.log(chalk.bold.yellow('  ⚡ Scripts'));
      for (const [name, cmd] of Object.entries(pkg.scripts)) {
        const shortCmd = cmd.length > 60 ? cmd.slice(0, 57) + '...' : cmd;
        console.log(chalk.dim('    ') + chalk.cyan(name.padEnd(12)) + chalk.dim(shortCmd));
      }
      console.log('');
    }

    // Dependencies — just names, no versions (AI doesn't need semver ranges)
    const printDeps = (label: string, emoji: string, deps?: Record<string, string>) => {
      if (!deps || Object.keys(deps).length === 0) return;
      const names = Object.keys(deps);
      console.log(chalk.bold.green(`  ${emoji} ${label}`) + chalk.dim(` (${names.length})`));

      // Print in compact columns (3 per row)
      const colWidth = 28;
      for (let i = 0; i < names.length; i += 3) {
        const row = names.slice(i, i + 3)
          .map(n => chalk.white(n.padEnd(colWidth)))
          .join('');
        console.log(chalk.dim('    ') + row);
      }
      console.log('');
    };

    printDeps('Dependencies', '📗', pkg.dependencies);
    printDeps('DevDependencies', '📘', pkg.devDependencies);
    printDeps('PeerDependencies', '📙', pkg.peerDependencies);

    // Engines
    if (pkg.engines) {
      console.log(chalk.bold.dim('  🔧 Engines: ') + Object.entries(pkg.engines).map(([k, v]) => `${k} ${v}`).join(', '));
      console.log('');
    }

    // Token savings
    const rawBytes = Buffer.byteLength(content, 'utf-8');
    const depNames = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ];
    const outputText = depNames.join(', ');
    const outputBytes = Buffer.byteLength(outputText, 'utf-8') + 200; // account for scripts section
    const savings = rawBytes > 0 ? ((1 - outputBytes / rawBytes) * 100).toFixed(0) : '0';

    console.log(chalk.dim(`  (Compact deps view: ${savings}% smaller than raw package.json)\n`));

    MeterRecorder.record('file_read', 'package.json', rawBytes, outputBytes);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(chalk.yellow('\n  ⚠️  No package.json found in current directory.\n'));
      // Try looking for other dependency formats
      await tryAlternativeDeps(targetDir);
    } else {
      console.error(chalk.red(`\n❌ Error reading package.json: ${error.message}\n`));
    }
  }
}

async function tryAlternativeDeps(dir: string): Promise<void> {
  const alternatives = [
    { file: 'requirements.txt', label: 'Python (pip)' },
    { file: 'Pipfile', label: 'Python (pipenv)' },
    { file: 'pyproject.toml', label: 'Python (poetry/pip)' },
    { file: 'Cargo.toml', label: 'Rust (cargo)' },
    { file: 'go.mod', label: 'Go (modules)' },
    { file: 'Gemfile', label: 'Ruby (bundler)' },
    { file: 'composer.json', label: 'PHP (composer)' },
  ];

  for (const alt of alternatives) {
    try {
      const content = await readFile(join(dir, alt.file), 'utf-8');
      console.log(chalk.cyan(`  Found ${alt.label}: ${alt.file}`));

      // For requirements.txt, extract package names
      if (alt.file === 'requirements.txt') {
        const pkgs = content.split('\n')
          .filter(l => l.trim() && !l.startsWith('#'))
          .map(l => l.split(/[>=<!\s]/)[0])
          .filter(Boolean);
        console.log(chalk.dim(`  Packages: `) + chalk.white(pkgs.join(', ')));
      } else {
        // Just show it exists — full parsing for each format is too complex
        const lines = content.split('\n').filter(l => l.trim()).length;
        console.log(chalk.dim(`  (${lines} lines — use 'contextslim cat ${alt.file}' for details)`));
      }
      console.log('');
      return;
    } catch {
      // file not found, try next
    }
  }
}
