/**
 * TokenMeter Command — Track, measure, and visualize token consumption.
 *
 * Subcommands:
 *   contextslim meter start    — Start a new metering session
 *   contextslim meter stop     — Stop session and show report
 *   contextslim meter status   — Show live session stats
 *   contextslim meter report   — Show lifetime stats dashboard
 *   contextslim meter history  — List recent sessions
 *   contextslim meter simulate — Simulate a session by scanning the current project
 *   contextslim meter clear    — Delete all recorded sessions
 */

import chalk from 'chalk';
import ora from 'ora';
import { resolve, join, relative } from 'node:path';
import { stat, readdir } from 'node:fs/promises';
import { SessionStore } from '../meter/session-store.js';
import { TokenCounter } from '../meter/token-counter.js';
import { Dashboard } from '../meter/dashboard.js';
import { ConfigManager } from '../utils/config.js';
import type { TokenEvent } from '../meter/token-counter.js';

const DEFAULT_IGNORE = new Set([
  '.git', 'node_modules', '.next', '.nuxt', 'dist', 'build', 'out',
  'coverage', '.cache', 'venv', '.venv', 'target', 'vendor',
  '.idea', '.vscode',
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
  '.mp4', '.mp3', '.wav', '.ogg', '.webm',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.woff', '.woff2', '.ttf', '.eot',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.exe', '.dll', '.so', '.dylib',
  '.lock',
]);

function isBinary(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Simulate what an AI *would* read if it explored the project,
 * and compare against what ContextSlim would actually serve.
 * This creates a simulated session with realistic events.
 */
async function simulateSession(targetDir: string): Promise<TokenEvent[]> {
  const config = ConfigManager.loadConfig();
  const allIgnores = new Set([...DEFAULT_IGNORE, ...(config.patterns?.alwaysExclude || [])]);
  const events: TokenEvent[] = [];

  async function walk(dir: string, isIgnored: boolean = false): Promise<void> {
    try {
      const items = await readdir(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = join(dir, item.name);
        const newlyIgnored = !isIgnored && allIgnores.has(item.name);
        const currentlyIgnored = isIgnored || newlyIgnored;

        if (item.isDirectory()) {
          await walk(fullPath, currentlyIgnored);
        } else {
          if (isBinary(item.name)) continue;

          try {
            const { size } = await stat(fullPath);
            if (size === 0) continue;

            const relPath = relative(targetDir, fullPath);

            if (currentlyIgnored) {
              // This file would be read by a naive AI but ignored by ContextSlim
              events.push(TokenCounter.createEvent('file_read', relPath, size, 0));
            } else {
              // This file is read by both — no savings
              events.push(TokenCounter.createEvent('file_read', relPath, size, size));
            }
          } catch {
            // stat error, skip
          }
        }
      }
    } catch {
      // readdir error (permissions), skip
    }
  }

  await walk(targetDir);
  return events;
}

export async function meterCommand(action?: string): Promise<void> {
  switch (action) {
    case 'start': {
      const existing = SessionStore.getActiveSession();
      if (existing) {
        console.log('');
        console.log(chalk.hex('#F59E0B')('  ⚠️  A session is already active.'));
        console.log(chalk.dim(`    Project: ${existing.projectName}`));
        console.log(chalk.dim('    Run ') + chalk.cyan('contextslim meter stop') + chalk.dim(' first to end it.'));
        console.log('');
        return;
      }

      const projectPath = resolve(process.cwd());
      const session = SessionStore.startSession(projectPath);
      Dashboard.showSessionStarted(session);
      break;
    }

    case 'stop': {
      const session = SessionStore.stopSession();
      if (!session) {
        Dashboard.showNoActiveSession();
        return;
      }
      Dashboard.showSessionStopped(session);
      break;
    }

    case 'status': {
      const session = SessionStore.getActiveSession();
      if (!session) {
        Dashboard.showNoActiveSession();
        return;
      }
      Dashboard.showLiveStatus(session);
      break;
    }

    case 'report': {
      const lifetime = SessionStore.getLifetimeStats();
      if (lifetime.totalSessions === 0) {
        console.log('');
        console.log(chalk.dim('  No sessions recorded yet.'));
        console.log(chalk.dim('  Run ') + chalk.cyan('contextslim meter simulate') + chalk.dim(' to generate a demo report.'));
        console.log('');
        return;
      }
      Dashboard.showLifetimeReport(lifetime);
      break;
    }

    case 'history': {
      const sessions = SessionStore.listSessions();
      Dashboard.showSessionList(sessions);
      break;
    }

    case 'simulate': {
      const targetDir = resolve(process.cwd());
      
      console.log('');
      console.log(
        chalk.bold.hex('#7C3AED')('  🔬 TokenMeter Simulation') +
        chalk.dim(' — Estimating AI token consumption')
      );
      console.log('');

      const spinner = ora({
        text: chalk.cyan('Simulating AI exploration of your project...'),
        spinner: 'dots',
      }).start();

      const events = await simulateSession(targetDir);
      spinner.succeed(chalk.green('Simulation complete!'));

      // Create a temporary session to display with the dashboard
      const simSession = {
        id: 'simulation',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        projectPath: targetDir,
        projectName: targetDir.split(/[\\/]/).pop() || 'project',
        events,
        totalTokens: events.reduce((sum, e) => sum + e.tokens, 0),
        totalSaved: events.reduce((sum, e) => sum + e.savedTokens, 0),
        totalEvents: events.length,
      };

      Dashboard.showSessionReport(simSession);

      // Show the "what if" comparison
      const rawTotal = events.reduce((sum, e) => sum + TokenCounter.estimateTokens(e.rawBytes), 0);
      const optimizedTotal = simSession.totalTokens;
      const savings = rawTotal - optimizedTotal;
      const savingsPct = rawTotal > 0 ? ((savings / rawTotal) * 100).toFixed(1) : '0.0';

      console.log(chalk.bold.hex('#7C3AED')('    🆚 What-If Comparison'));
      console.log(chalk.dim('    ─'.repeat(20)));
      console.log('');
      console.log(
        chalk.dim('    Without ContextSlim: ') +
        chalk.hex('#EF4444').bold(`${(rawTotal / 1000).toFixed(1)}k tokens`)
      );
      console.log(
        chalk.dim('    With ContextSlim:    ') +
        chalk.hex('#10B981').bold(`${(optimizedTotal / 1000).toFixed(1)}k tokens`)
      );
      console.log(
        chalk.dim('    You save:            ') +
        chalk.hex('#10B981').bold(`${(savings / 1000).toFixed(1)}k tokens (${savingsPct}%)`)
      );
      console.log('');
      break;
    }

    case 'clear': {
      const count = SessionStore.clearAll();
      console.log('');
      console.log(chalk.green(`  ✅ Cleared ${count} session(s).`));
      console.log('');
      break;
    }

    default: {
      // No action or unknown → show help
      console.log('');
      console.log(
        chalk.bold.hex('#7C3AED')('  ⏱️  TokenMeter') +
        chalk.dim(' — Track and visualize AI token consumption')
      );
      console.log('');
      console.log(chalk.bold('  Usage:'));
      console.log(chalk.dim('    contextslim meter ') + chalk.cyan('start') + chalk.dim('      Start tracking a session'));
      console.log(chalk.dim('    contextslim meter ') + chalk.cyan('stop') + chalk.dim('       Stop session & show report'));
      console.log(chalk.dim('    contextslim meter ') + chalk.cyan('status') + chalk.dim('     Show live session stats'));
      console.log(chalk.dim('    contextslim meter ') + chalk.cyan('simulate') + chalk.dim('   Simulate AI token usage for this project'));
      console.log(chalk.dim('    contextslim meter ') + chalk.cyan('report') + chalk.dim('     Show lifetime stats dashboard'));
      console.log(chalk.dim('    contextslim meter ') + chalk.cyan('history') + chalk.dim('    List recent sessions'));
      console.log(chalk.dim('    contextslim meter ') + chalk.cyan('clear') + chalk.dim('      Delete all session data'));
      console.log('');
      console.log(chalk.dim('  💡 Quick start: ') + chalk.cyan('contextslim meter simulate'));
      console.log('');
      break;
    }
  }
}
