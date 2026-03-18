/**
 * TokenMeter Dashboard — Rich terminal visualizations for token consumption.
 * Renders session reports, lifetime stats, comparison charts, and live status.
 */

import chalk from 'chalk';
import type { SessionData, TokenEvent } from './token-counter.js';
import { TokenCounter } from './token-counter.js';

const PURPLE = '#7C3AED';
const CYAN_HEX = '#06B6D4';
const GREEN_HEX = '#10B981';
const RED_HEX = '#EF4444';
const AMBER_HEX = '#F59E0B';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function formatDuration(startIso: string, endIso?: string): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const diffMs = end - start;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function progressBar(ratio: number, width: number = 30, filledColor = chalk.hex(GREEN_HEX), emptyColor = chalk.dim): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filledLen = Math.round(clamped * width);
  const emptyLen = width - filledLen;
  return filledColor('█'.repeat(filledLen)) + emptyColor('░'.repeat(emptyLen));
}

function sparkline(values: number[]): string {
  if (values.length === 0) return '';
  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return values.map(v => {
    const idx = Math.round(((v - min) / range) * (chars.length - 1));
    return chalk.hex(CYAN_HEX)(chars[idx]);
  }).join('');
}

export class Dashboard {
  /**
   * Show live session status (compact, one-liner style)
   */
  static showLiveStatus(session: SessionData): void {
    const duration = formatDuration(session.startedAt);
    const tokens = formatTokens(session.totalTokens);
    const saved = formatTokens(session.totalSaved);

    console.log('');
    console.log(
      chalk.bold.hex(PURPLE)('  📡 Active Session') +
      chalk.dim(` — ${session.projectName} — ${duration}`)
    );
    console.log('');
    console.log(
      chalk.dim('    ') +
      chalk.hex(CYAN_HEX)('⚡') + chalk.white(` ${tokens} tokens consumed`) +
      chalk.dim('  │  ') +
      chalk.hex(GREEN_HEX)('💚') + chalk.white(` ${saved} tokens saved`) +
      chalk.dim('  │  ') +
      chalk.hex(AMBER_HEX)('📊') + chalk.white(` ${session.totalEvents} events`)
    );
    console.log('');
  }

  /**
   * Render a full session report with breakdown
   */
  static showSessionReport(session: SessionData): void {
    const duration = formatDuration(session.startedAt, session.endedAt);
    const stats = TokenCounter.aggregate(session.events);

    console.log('');
    console.log(
      chalk.bold.hex(PURPLE)('  📊 TokenMeter Session Report')
    );
    console.log(chalk.dim('  ─'.repeat(25)));
    console.log('');

    // Header info
    console.log(chalk.dim('    Project:  ') + chalk.white.bold(session.projectName));
    console.log(chalk.dim('    Duration: ') + chalk.white(duration));
    console.log(chalk.dim('    Events:   ') + chalk.white(`${session.totalEvents}`));
    console.log('');

    // Main metrics — big numbers
    console.log(chalk.bold.hex(CYAN_HEX)('    ⚡ Tokens Consumed'));
    console.log(chalk.white(`       ${formatTokens(stats.totalTokens)}`));
    console.log('');

    console.log(chalk.bold.hex(GREEN_HEX)('    💚 Tokens Saved by ContextSlim'));
    console.log(chalk.white(`       ${formatTokens(stats.totalSaved)}`));
    console.log('');

    // Savings bar
    const savingsRatio = stats.totalRaw > 0 ? stats.totalSaved / stats.totalRaw : 0;
    const bar = progressBar(savingsRatio, 35);
    console.log(chalk.bold('    Optimization Impact:'));
    console.log(`       ${bar} ${chalk.bold.hex(GREEN_HEX)(stats.savingsPercent + '%')} saved`);
    console.log('');

    // Breakdown by type
    if (Object.keys(stats.byType).length > 0) {
      console.log(chalk.bold.hex(AMBER_HEX)('    📋 Breakdown by Operation'));
      console.log(chalk.dim('    ─'.repeat(20)));

      const typeEmojis: Record<string, string> = {
        file_read: '📄',
        command_output: '🖥️ ',
        tree: '🌳',
        map: '🗺️ ',
        grep: '🔍',
        cat: '📖',
        ls: '📂',
        diff: '📝',
        brief: '📋',
      };

      const sortedTypes = Object.entries(stats.byType)
        .sort((a, b) => b[1].tokens - a[1].tokens);

      for (const [type, data] of sortedTypes) {
        const emoji = typeEmojis[type] || '•';
        const pct = stats.totalTokens > 0
          ? ((data.tokens / stats.totalTokens) * 100).toFixed(0)
          : '0';

        console.log(
          `       ${emoji} ${chalk.white(type.padEnd(16))}` +
          chalk.hex(CYAN_HEX)(`${formatTokens(data.tokens).padStart(8)}`) +
          chalk.dim(` (${pct}%)`) +
          (data.saved > 0 ? chalk.hex(GREEN_HEX)(` ↓${formatTokens(data.saved)}`) : '')
        );
      }
      console.log('');
    }

    // Top 5 heaviest files
    const fileEvents = session.events
      .filter(e => e.type === 'file_read')
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);

    if (fileEvents.length > 0) {
      console.log(chalk.bold.hex(RED_HEX)('    🔥 Top Token Consumers'));
      console.log(chalk.dim('    ─'.repeat(20)));

      for (const ev of fileEvents) {
        const shortPath = ev.source.length > 40
          ? '...' + ev.source.slice(-37)
          : ev.source;
        console.log(
          chalk.dim('       • ') +
          chalk.white(shortPath.padEnd(42)) +
          chalk.hex(RED_HEX)(`${formatTokens(ev.tokens)} tokens`)
        );
      }
      console.log('');
    }
  }

  /**
   * Show lifetime stats across all sessions
   */
  static showLifetimeReport(lifetimeStats: {
    totalSessions: number;
    totalTokensConsumed: number;
    totalTokensSaved: number;
    totalEvents: number;
    avgTokensPerSession: number;
    avgSavingsPercent: string;
    projectBreakdown: Record<string, { sessions: number; tokens: number; saved: number }>;
  }): void {
    console.log('');
    console.log(
      chalk.bold.hex(PURPLE)('  🏆 TokenMeter Lifetime Report')
    );
    console.log(chalk.dim('  ─'.repeat(25)));
    console.log('');

    // Big stats
    console.log(chalk.dim('    Total Sessions:      ') + chalk.white.bold(`${lifetimeStats.totalSessions}`));
    console.log(chalk.dim('    Total Events:        ') + chalk.white(`${lifetimeStats.totalEvents}`));
    console.log(chalk.dim('    Tokens Consumed:     ') + chalk.hex(CYAN_HEX).bold(formatTokens(lifetimeStats.totalTokensConsumed)));
    console.log(chalk.dim('    Tokens Saved:        ') + chalk.hex(GREEN_HEX).bold(formatTokens(lifetimeStats.totalTokensSaved)));
    console.log(chalk.dim('    Avg per Session:     ') + chalk.white(formatTokens(lifetimeStats.avgTokensPerSession)));
    console.log('');

    // Lifetime savings bar
    const totalRaw = lifetimeStats.totalTokensConsumed + lifetimeStats.totalTokensSaved;
    const ratio = totalRaw > 0 ? lifetimeStats.totalTokensSaved / totalRaw : 0;
    const bar = progressBar(ratio, 35);
    console.log(chalk.bold('    Lifetime Savings:'));
    console.log(`       ${bar} ${chalk.bold.hex(GREEN_HEX)(lifetimeStats.avgSavingsPercent + '%')} average`);
    console.log('');

    // Per-project breakdown
    const projects = Object.entries(lifetimeStats.projectBreakdown)
      .sort((a, b) => b[1].tokens - a[1].tokens);

    if (projects.length > 0) {
      console.log(chalk.bold.hex(AMBER_HEX)('    📁 By Project'));
      console.log(chalk.dim('    ─'.repeat(20)));

      for (const [name, data] of projects.slice(0, 8)) {
        const projectTotal = data.tokens + data.saved;
        const pct = projectTotal > 0 ? ((data.saved / projectTotal) * 100).toFixed(0) : '0';
        console.log(
          chalk.dim('       ') +
          chalk.white(name.padEnd(20)) +
          chalk.hex(CYAN_HEX)(`${formatTokens(data.tokens).padStart(8)}`) +
          chalk.dim(` consumed, `) +
          chalk.hex(GREEN_HEX)(`${formatTokens(data.saved)}`) +
          chalk.dim(` saved (${pct}%)`)
        );
      }
      console.log('');
    }
  }

  /**
   * Show comparison: sessions with high vs low optimization
   */
  static showSessionList(sessions: SessionData[], limit: number = 10): void {
    console.log('');
    console.log(
      chalk.bold.hex(PURPLE)('  📋 Recent Sessions')
    );
    console.log(chalk.dim('  ─'.repeat(25)));
    console.log('');

    if (sessions.length === 0) {
      console.log(chalk.dim('    No sessions recorded yet. Run `contextslim meter start` to begin.'));
      console.log('');
      return;
    }

    // Header
    console.log(
      chalk.dim('    ') +
      chalk.bold('Project'.padEnd(18)) +
      chalk.bold('Duration'.padEnd(10)) +
      chalk.bold('Tokens'.padEnd(10)) +
      chalk.bold('Saved'.padEnd(10)) +
      chalk.bold('Events')
    );
    console.log(chalk.dim('    ' + '─'.repeat(60)));

    const sparkValues: number[] = [];

    for (const s of sessions.slice(0, limit)) {
      const duration = formatDuration(s.startedAt, s.endedAt);
      sparkValues.push(s.totalTokens);

      console.log(
        chalk.dim('    ') +
        chalk.white(s.projectName.slice(0, 16).padEnd(18)) +
        chalk.dim(duration.padEnd(10)) +
        chalk.hex(CYAN_HEX)(formatTokens(s.totalTokens).padEnd(10)) +
        chalk.hex(GREEN_HEX)(formatTokens(s.totalSaved).padEnd(10)) +
        chalk.white(`${s.totalEvents}`)
      );
    }

    if (sparkValues.length >= 3) {
      console.log('');
      console.log(chalk.dim('    Token trend: ') + sparkline(sparkValues.reverse()));
    }

    console.log('');
  }

  /**
   * Show a compact "session started" message
   */
  static showSessionStarted(session: SessionData): void {
    console.log('');
    console.log(
      chalk.bold.hex(PURPLE)('  ⏱️  TokenMeter') +
      chalk.dim(' — Session Started')
    );
    console.log('');
    console.log(chalk.dim('    Project: ') + chalk.white.bold(session.projectName));
    console.log(chalk.dim('    ID:      ') + chalk.dim(session.id));
    console.log('');
    console.log(chalk.dim('    Your token consumption is now being tracked.'));
    console.log(chalk.dim('    Run ') + chalk.cyan('contextslim meter status') + chalk.dim(' to see live stats.'));
    console.log(chalk.dim('    Run ') + chalk.cyan('contextslim meter stop') + chalk.dim(' to end and see the report.'));
    console.log('');
  }

  /**
   * Show "session stopped" summary
   */
  static showSessionStopped(session: SessionData): void {
    console.log('');
    console.log(
      chalk.bold.hex(GREEN_HEX)('  ✅ Session Ended') +
      chalk.dim(` — ${formatDuration(session.startedAt, session.endedAt)}`)
    );
    Dashboard.showSessionReport(session);
  }

  /**
   * Show "no active session" message
   */
  static showNoActiveSession(): void {
    console.log('');
    console.log(chalk.hex(AMBER_HEX)('  ⚠️  No active TokenMeter session.'));
    console.log(chalk.dim('    Run ') + chalk.cyan('contextslim meter start') + chalk.dim(' to begin tracking.'));
    console.log('');
  }
}
