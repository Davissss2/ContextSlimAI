/**
 * SessionStore — Persistent session storage for TokenMeter.
 * Stores session data as JSON files in ~/.contextslim/sessions/
 * Each session is a separate file for easy cleanup and inspection.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { SessionData, TokenEvent } from './token-counter.js';

const STORE_DIR = path.join(os.homedir(), '.contextslim', 'sessions');
const ACTIVE_SESSION_FILE = path.join(STORE_DIR, '_active.json');
const MAX_SESSIONS = 50;

function ensureStoreDir(): void {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function generateId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class SessionStore {
  /**
   * Start a new metering session
   */
  static startSession(projectPath: string): SessionData {
    ensureStoreDir();

    const session: SessionData = {
      id: generateId(),
      startedAt: new Date().toISOString(),
      projectPath,
      projectName: path.basename(projectPath),
      events: [],
      totalTokens: 0,
      totalSaved: 0,
      totalEvents: 0,
    };

    fs.writeFileSync(ACTIVE_SESSION_FILE, JSON.stringify(session, null, 2), 'utf-8');
    return session;
  }

  /**
   * Get the currently active session (if any)
   */
  static getActiveSession(): SessionData | null {
    if (!fs.existsSync(ACTIVE_SESSION_FILE)) return null;

    try {
      const content = fs.readFileSync(ACTIVE_SESSION_FILE, 'utf-8');
      return JSON.parse(content) as SessionData;
    } catch {
      return null;
    }
  }

  /**
   * Add an event to the active session
   */
  static addEvent(event: TokenEvent): void {
    const session = SessionStore.getActiveSession();
    if (!session) return;

    session.events.push(event);
    session.totalTokens += event.tokens;
    session.totalSaved += event.savedTokens;
    session.totalEvents = session.events.length;

    fs.writeFileSync(ACTIVE_SESSION_FILE, JSON.stringify(session, null, 2), 'utf-8');
  }

  /**
   * Stop the active session and archive it
   */
  static stopSession(): SessionData | null {
    const session = SessionStore.getActiveSession();
    if (!session) return null;

    session.endedAt = new Date().toISOString();

    // Archive the session
    ensureStoreDir();
    const archivePath = path.join(STORE_DIR, `${session.id}.json`);
    fs.writeFileSync(archivePath, JSON.stringify(session, null, 2), 'utf-8');

    // Remove active session file
    try {
      fs.unlinkSync(ACTIVE_SESSION_FILE);
    } catch {
      // ignore
    }

    // Prune old sessions
    SessionStore.pruneOldSessions();

    return session;
  }

  /**
   * List all archived sessions, sorted by most recent first
   */
  static listSessions(): SessionData[] {
    ensureStoreDir();

    const files = fs.readdirSync(STORE_DIR)
      .filter(f => f.startsWith('session_') && f.endsWith('.json'));

    const sessions: SessionData[] = [];
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(STORE_DIR, file), 'utf-8');
        sessions.push(JSON.parse(content));
      } catch {
        // skip corrupted files
      }
    }

    return sessions.sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  /**
   * Get aggregate stats across all sessions
   */
  static getLifetimeStats(): {
    totalSessions: number;
    totalTokensConsumed: number;
    totalTokensSaved: number;
    totalEvents: number;
    avgTokensPerSession: number;
    avgSavingsPercent: string;
    projectBreakdown: Record<string, { sessions: number; tokens: number; saved: number }>;
  } {
    const sessions = SessionStore.listSessions();
    const active = SessionStore.getActiveSession();
    const all = active ? [active, ...sessions] : sessions;

    let totalTokens = 0;
    let totalSaved = 0;
    let totalEvents = 0;
    const projectBreakdown: Record<string, { sessions: number; tokens: number; saved: number }> = {};

    for (const s of all) {
      totalTokens += s.totalTokens;
      totalSaved += s.totalSaved;
      totalEvents += s.totalEvents;

      if (!projectBreakdown[s.projectName]) {
        projectBreakdown[s.projectName] = { sessions: 0, tokens: 0, saved: 0 };
      }
      projectBreakdown[s.projectName].sessions++;
      projectBreakdown[s.projectName].tokens += s.totalTokens;
      projectBreakdown[s.projectName].saved += s.totalSaved;
    }

    const avgTokens = all.length > 0 ? Math.round(totalTokens / all.length) : 0;
    const totalRaw = totalTokens + totalSaved;
    const avgSavings = totalRaw > 0 ? ((totalSaved / totalRaw) * 100).toFixed(1) : '0.0';

    return {
      totalSessions: all.length,
      totalTokensConsumed: totalTokens,
      totalTokensSaved: totalSaved,
      totalEvents,
      avgTokensPerSession: avgTokens,
      avgSavingsPercent: avgSavings,
      projectBreakdown,
    };
  }

  /**
   * Delete a specific session
   */
  static deleteSession(sessionId: string): boolean {
    const filePath = path.join(STORE_DIR, `${sessionId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  /**
   * Clear all session data
   */
  static clearAll(): number {
    ensureStoreDir();
    const files = fs.readdirSync(STORE_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(STORE_DIR, file));
      } catch {
        // ignore
      }
    }
    return files.length;
  }

  /**
   * Keep only the N most recent sessions
   */
  private static pruneOldSessions(): void {
    const sessions = SessionStore.listSessions();
    if (sessions.length <= MAX_SESSIONS) return;

    const toDelete = sessions.slice(MAX_SESSIONS);
    for (const s of toDelete) {
      SessionStore.deleteSession(s.id);
    }
  }
}
