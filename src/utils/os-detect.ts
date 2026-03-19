import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export type OSPlatform = 'windows' | 'linux' | 'mac' | 'unknown';

/**
 * Detects the current OS platform
 */
export function detectOS(): OSPlatform {
  switch (process.platform) {
    case 'win32':
      return 'windows';
    case 'linux':
      return 'linux';
    case 'darwin':
      return 'mac';
    default:
      return 'unknown';
  }
}

/**
 * Returns true if running on Windows
 */
export function isWindows(): boolean {
  return process.platform === 'win32';
}

/**
 * Execute a shell command and return stdout.
 * On Windows, uses PowerShell by default.
 * On Linux/Mac, uses the default shell.
 */
export async function runCommand(command: string, options?: {
  shell?: string;
  timeout?: number;
  maxBuffer?: number;
}): Promise<string> {
  const timeout = options?.timeout ?? 15000;
  const maxBuffer = options?.maxBuffer ?? 1024 * 1024 * 5; // 5MB

  let shell: string | undefined = options?.shell;
  if (!shell && isWindows()) {
    shell = 'powershell.exe';
  }

  try {
    const { stdout } = await execAsync(command, {
      shell,
      timeout,
      maxBuffer,
      windowsHide: true,
    });
    return stdout.trim();
  } catch (error: any) {
    if (error.killed) {
      throw new Error(`Command timed out after ${timeout}ms: ${command}`);
    }
    // Some commands write to stderr but still succeed
    if (error.stdout && error.stdout.trim().length > 0) {
      return error.stdout.trim();
    }
    throw new Error(`Command failed: ${error.message}`);
  }
}

/**
 * Execute a command and return structured lines
 */
export async function runCommandLines(command: string, options?: {
  shell?: string;
  timeout?: number;
}): Promise<string[]> {
  const output = await runCommand(command, options);
  return output.split(/\r?\n/).filter((line) => line.trim().length > 0);
}

/**
 * Parse a table-like output (columns separated by whitespace) into objects.
 * Useful for parsing tasklist, Get-Process, etc.
 */
export function parseTableOutput(lines: string[], separator?: RegExp): string[][] {
  const sep = separator || /\s{2,}/;
  return lines.map((line) => line.split(sep).map((col) => col.trim()).filter(Boolean));
}

/**
 * Truncate a string to a max length, adding ellipsis if needed
 */
export function truncateStr(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 1) + '\u2026';
}

/**
 * Format bytes into human-readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

/**
 * Format a number with K/M suffix for compact display
 */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1000000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1000000).toFixed(1)}M`;
}
