import chalk from 'chalk';
import { isWindows, runCommand, truncateStr } from '../utils/os-detect.js';
import { MeterRecorder } from '../meter/recorder.js';

/**
 * Compact environment variables — replaces verbose `set` / `env` / `$env:`
 * Filters out sensitive vars (keys, tokens, passwords, secrets)
 * Groups by category for quick overview
 */
export async function envinfoCommand(filter?: string): Promise<void> {
  console.log(chalk.bold.hex('#7C3AED')(`\n  🔑 ContextSlim ENV${filter ? ` (filter: "${filter}")` : ''}\n`));

  try {
    if (isWindows()) {
      await windowsEnv(filter);
    } else {
      await unixEnv(filter);
    }
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Error reading environment: ${error.message}\n`));
  }
}

// Patterns that indicate sensitive environment variables
const SENSITIVE_PATTERNS = [
  /key/i, /secret/i, /token/i, /password/i, /passwd/i, /credential/i,
  /auth/i, /api_key/i, /apikey/i, /private/i, /access.*key/i,
  /connection.*string/i, /conn.*str/i, /jwt/i, /bearer/i, /session/i,
];

// Categories for grouping
const CATEGORIES: Record<string, RegExp> = {
  '📂 Paths': /^(path|home|userprofile|appdata|temp|tmp|programfiles|windir|systemroot|gopath|cargo|npm|node|python|java_home|ruby|gem_home)/i,
  '🖥️ System': /^(os|processor|computer|number_of|system|hostname|userdomain|logonserver|username|user|shell|term|lang|lc_|tz)/i,
  '🔧 Dev Tools': /^(node|npm|yarn|pnpm|go|rust|cargo|python|pip|java|maven|gradle|dotnet|ruby|gem|php|composer|conda|virtual|venv)/i,
  '🌐 Network': /^(http|https|ftp|proxy|no_proxy|curl|wget|dns|ssh)/i,
  '📦 App Config': /^(debug|verbose|log|ci|cd|docker|container|kube|aws|azure|gcp|cloud|git|editor|visual|vs|ide)/i,
};

function categorize(key: string): string {
  for (const [category, pattern] of Object.entries(CATEGORIES)) {
    if (pattern.test(key)) return category;
  }
  return '📋 Other';
}

function isSensitive(key: string): boolean {
  return SENSITIVE_PATTERNS.some((p) => p.test(key));
}

async function windowsEnv(filter: string | undefined): Promise<void> {
  const envVars = process.env;
  displayEnv(envVars, filter);
}

async function unixEnv(filter: string | undefined): Promise<void> {
  const envVars = process.env;
  displayEnv(envVars, filter);
}

function displayEnv(envVars: NodeJS.ProcessEnv, filter?: string): void {
  const entries = Object.entries(envVars)
    .filter(([key]) => !key.startsWith('=')) // Windows internal vars
    .filter(([key]) => !filter || key.toLowerCase().includes(filter.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    console.log(chalk.dim('  No environment variables found matching filter.\n'));
    return;
  }

  // Group by category
  const grouped: Record<string, [string, string][]> = {};
  let sensitiveCount = 0;

  for (const [key, value] of entries) {
    if (isSensitive(key)) {
      sensitiveCount++;
      continue; // Skip sensitive vars entirely
    }
    const category = categorize(key);
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push([key, value || '']);
  }

  let totalShown = 0;
  const rawEstimate = entries.length * 80; // Average env var line ~80 chars

  for (const [category, vars] of Object.entries(grouped)) {
    console.log(chalk.bold(`  ${category} (${vars.length})`));
    for (const [key, value] of vars) {
      totalShown++;
      const displayVal = truncateStr(value, 60);

      // Special handling for PATH - show count instead of full value
      if (key.toLowerCase() === 'path') {
        const pathCount = value.split(isWindows() ? ';' : ':').length;
        console.log(`    ${chalk.cyan(key)} = ${chalk.dim(`(${pathCount} entries)`)}`);
      } else {
        console.log(`    ${chalk.cyan(key)} = ${chalk.white(displayVal)}`);
      }
    }
    console.log('');
  }

  const slimEstimate = totalShown * 40;
  console.log(chalk.dim(`  ${totalShown} vars shown, ${sensitiveCount} sensitive vars hidden`));
  console.log(chalk.dim(`  (~${Math.round((1 - slimEstimate / rawEstimate) * 100)}% token savings vs raw env dump)\n`));
  MeterRecorder.recordCommand('envinfo', rawEstimate, slimEstimate);
}
