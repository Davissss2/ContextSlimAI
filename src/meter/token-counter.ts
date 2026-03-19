/**
 * TokenCounter — Core token estimation engine for ContextSlim TokenMeter.
 * Estimates tokens consumed per file read, command output, or arbitrary text.
 * Uses a 4-bytes-per-token heuristic (standard for GPT/Gemini tokenizers).
 */

export interface TokenEvent {
  timestamp: string;
  type: 'file_read' | 'command_output' | 'tree' | 'map' | 'grep' | 'cat' | 'ls' | 'diff' | 'brief' | 'sysinfo' | 'procs' | 'services' | 'netinfo' | 'envinfo' | 'registry' | 'dbschema' | 'dbquery' | 'dbsample' | 'dbstats' | 'dbdiff';
  source: string;          // file path or command name
  rawBytes: number;
  tokens: number;
  savedTokens: number;     // tokens saved by ContextSlim (0 if no optimization)
  optimized: boolean;      // whether this was processed through contextslim
}

export interface SessionData {
  id: string;
  startedAt: string;
  endedAt?: string;
  projectPath: string;
  projectName: string;
  events: TokenEvent[];
  totalTokens: number;
  totalSaved: number;
  totalEvents: number;
}

const BYTES_PER_TOKEN = 4;

export class TokenCounter {
  /**
   * Estimate tokens from raw byte count
   */
  static estimateTokens(bytes: number): number {
    return Math.ceil(bytes / BYTES_PER_TOKEN);
  }

  /**
   * Estimate tokens from a string
   */
  static estimateFromText(text: string): number {
    return Math.ceil(Buffer.byteLength(text, 'utf-8') / BYTES_PER_TOKEN);
  }

  /**
   * Calculate how many tokens a ContextSlim-optimized output saves
   * compared to reading the raw file/directory
   */
  static calculateSavings(rawBytes: number, optimizedBytes: number): number {
    const rawTokens = TokenCounter.estimateTokens(rawBytes);
    const optimizedTokens = TokenCounter.estimateTokens(optimizedBytes);
    return Math.max(0, rawTokens - optimizedTokens);
  }

  /**
   * Create a token event record
   */
  static createEvent(
    type: TokenEvent['type'],
    source: string,
    rawBytes: number,
    optimizedBytes?: number,
  ): TokenEvent {
    const tokens = TokenCounter.estimateTokens(optimizedBytes ?? rawBytes);
    const savedTokens = optimizedBytes != null
      ? TokenCounter.calculateSavings(rawBytes, optimizedBytes)
      : 0;

    return {
      timestamp: new Date().toISOString(),
      type,
      source,
      rawBytes,
      tokens,
      savedTokens,
      optimized: optimizedBytes != null && optimizedBytes < rawBytes,
    };
  }

  /**
   * Aggregate stats from a list of events
   */
  static aggregate(events: TokenEvent[]) {
    const totalTokens = events.reduce((sum, e) => sum + e.tokens, 0);
    const totalSaved = events.reduce((sum, e) => sum + e.savedTokens, 0);
    const totalRaw = events.reduce((sum, e) => sum + TokenCounter.estimateTokens(e.rawBytes), 0);
    const optimizedCount = events.filter(e => e.optimized).length;

    const byType: Record<string, { count: number; tokens: number; saved: number }> = {};
    for (const event of events) {
      if (!byType[event.type]) {
        byType[event.type] = { count: 0, tokens: 0, saved: 0 };
      }
      byType[event.type].count++;
      byType[event.type].tokens += event.tokens;
      byType[event.type].saved += event.savedTokens;
    }

    return {
      totalTokens,
      totalSaved,
      totalRaw,
      optimizedCount,
      totalEvents: events.length,
      savingsPercent: totalRaw > 0 ? ((totalSaved / totalRaw) * 100).toFixed(1) : '0.0',
      byType,
    };
  }
}
