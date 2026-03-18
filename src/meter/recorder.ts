/**
 * MeterRecorder — Lightweight helper for commands to record token events
 * into the active TokenMeter session.
 * 
 * If no session is active, all calls are no-ops (zero overhead).
 * Commands should call `recordEvent()` after producing their output.
 */

import { SessionStore } from './session-store.js';
import { TokenCounter } from './token-counter.js';
import type { TokenEvent } from './token-counter.js';

export class MeterRecorder {
  /**
   * Check if there's an active metering session
   */
  static isActive(): boolean {
    return SessionStore.getActiveSession() !== null;
  }

  /**
   * Record a file read event (used by cat, map, and direct file reads)
   */
  static recordFileRead(source: string, rawBytes: number, optimizedBytes: number): void {
    if (!MeterRecorder.isActive()) return;
    const event = TokenCounter.createEvent('file_read', source, rawBytes, optimizedBytes);
    SessionStore.addEvent(event);
  }

  /**
   * Record a cat command event (file read with truncation)
   */
  static recordCat(source: string, rawBytes: number, outputBytes: number): void {
    if (!MeterRecorder.isActive()) return;
    const event = TokenCounter.createEvent('cat', source, rawBytes, outputBytes);
    SessionStore.addEvent(event);
  }

  /**
   * Record a map command event (file signatures extraction)
   */
  static recordMap(source: string, rawBytes: number, outputBytes: number): void {
    if (!MeterRecorder.isActive()) return;
    const event = TokenCounter.createEvent('map', source, rawBytes, outputBytes);
    SessionStore.addEvent(event);
  }

  /**
   * Record a tree command event
   */
  static recordTree(source: string, rawEstimateBytes: number, outputBytes: number): void {
    if (!MeterRecorder.isActive()) return;
    const event = TokenCounter.createEvent('tree', source, rawEstimateBytes, outputBytes);
    SessionStore.addEvent(event);
  }

  /**
   * Record a grep command event
   */
  static recordGrep(source: string, rawBytes: number, outputBytes: number): void {
    if (!MeterRecorder.isActive()) return;
    const event = TokenCounter.createEvent('grep', source, rawBytes, outputBytes);
    SessionStore.addEvent(event);
  }

  /**
   * Record an ls command event
   */
  static recordLs(source: string, rawBytes: number, outputBytes: number): void {
    if (!MeterRecorder.isActive()) return;
    const event = TokenCounter.createEvent('ls', source, rawBytes, outputBytes);
    SessionStore.addEvent(event);
  }

  /**
   * Record a diff command event
   */
  static recordDiff(source: string, rawBytes: number, outputBytes: number): void {
    if (!MeterRecorder.isActive()) return;
    const event = TokenCounter.createEvent('diff', source, rawBytes, outputBytes);
    SessionStore.addEvent(event);
  }

  /**
   * Record a brief command event
   */
  static recordBrief(source: string, rawEstimateBytes: number, outputBytes: number): void {
    if (!MeterRecorder.isActive()) return;
    const event = TokenCounter.createEvent('brief', source, rawEstimateBytes, outputBytes);
    SessionStore.addEvent(event);
  }

  /**
   * Generic event recording
   */
  static record(type: TokenEvent['type'], source: string, rawBytes: number, outputBytes?: number): void {
    if (!MeterRecorder.isActive()) return;
    const event = TokenCounter.createEvent(type, source, rawBytes, outputBytes);
    SessionStore.addEvent(event);
  }
}
