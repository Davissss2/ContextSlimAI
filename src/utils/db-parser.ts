import { runCommand, runCommandLines } from '../utils/os-detect.js';

/**
 * Parser genérico para output de herramientas CLI de bases de datos.
 * Soporta MySQL, PostgreSQL, SQLite, MongoDB y Redis.
 */

export type DBEngine = 'mysql' | 'postgres' | 'sqlite' | 'mongodb' | 'redis' | 'unknown';

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  key: string; // PK, FK, UQ, IDX, ''
  defaultVal: string;
  extra: string; // AUTO_INCREMENT, etc.
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  rowCount?: number;
  sizeBytes?: number;
}

export interface DBSchemaInfo {
  engine: DBEngine;
  version: string;
  database: string;
  tables: TableInfo[];
}

/**
 * Detect which DB engine is available by checking CLI tools
 */
export async function detectDBEngine(hint?: string): Promise<DBEngine> {
  if (hint) {
    const h = hint.toLowerCase();
    if (h.includes('mysql') || h.includes('mariadb')) return 'mysql';
    if (h.includes('postgres') || h.includes('psql') || h.includes('pg')) return 'postgres';
    if (h.includes('sqlite')) return 'sqlite';
    if (h.includes('mongo')) return 'mongodb';
    if (h.includes('redis')) return 'redis';
  }
  return 'unknown';
}

/**
 * Parse MySQL DESCRIBE output into ColumnInfo[]
 */
export function parseMySQLDescribe(output: string): ColumnInfo[] {
  const lines = output.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('+') && !l.startsWith('|  Field'));
  const columns: ColumnInfo[] = [];

  for (const line of lines) {
    // Parse pipe-delimited MySQL output: | Field | Type | Null | Key | Default | Extra |
    const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 4) {
      columns.push({
        name: parts[0],
        type: parts[1],
        nullable: parts[2] === 'YES',
        key: parts[3] === 'PRI' ? 'PK' : parts[3] === 'UNI' ? 'UQ' : parts[3] === 'MUL' ? 'IDX' : '',
        defaultVal: parts[4] || '',
        extra: parts[5] || '',
      });
    }
  }

  return columns;
}

/**
 * Parse PostgreSQL \d output into ColumnInfo[]
 */
export function parsePostgresDescribe(output: string): ColumnInfo[] {
  const lines = output.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('-'));
  const columns: ColumnInfo[] = [];

  for (const line of lines) {
    const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      const type = parts[1] || '';
      const modifiers = (parts[2] || '').toLowerCase();
      columns.push({
        name: parts[0],
        type,
        nullable: !modifiers.includes('not null'),
        key: modifiers.includes('primary key') ? 'PK' : '',
        defaultVal: '',
        extra: modifiers.includes('nextval') ? 'AUTO' : '',
      });
    }
  }

  return columns;
}

/**
 * Parse SQLite .schema or PRAGMA table_info output
 */
export function parseSQLitePragma(output: string): ColumnInfo[] {
  // PRAGMA table_info format: cid|name|type|notnull|dflt_value|pk
  const lines = output.split(/\r?\n/).filter((l) => l.trim());
  const columns: ColumnInfo[] = [];

  for (const line of lines) {
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length >= 6) {
      columns.push({
        name: parts[1],
        type: parts[2] || 'TEXT',
        nullable: parts[3] !== '1',
        key: parts[5] === '1' ? 'PK' : '',
        defaultVal: parts[4] || '',
        extra: '',
      });
    }
  }

  return columns;
}

/**
 * Format a column info into a compact single-line representation
 */
export function formatColumnCompact(col: ColumnInfo): string {
  let result = `${col.name} ${col.type}`;
  if (col.key === 'PK') result += ' PK';
  if (col.key === 'UQ') result += ' UQ';
  if (col.key === 'FK') result += ' FK';
  if (col.extra.includes('AUTO') || col.extra.includes('auto_increment')) result += ' AUTO';
  if (!col.nullable) result += ' NN';
  return result;
}

/**
 * Format an entire table info into compact multi-line output
 */
export function formatTableCompact(table: TableInfo): string {
  const colCount = table.columns.length;
  const rowStr = table.rowCount !== undefined ? `, ~${formatCountShort(table.rowCount)} rows` : '';
  const sizeStr = table.sizeBytes ? `, ${formatBytesShort(table.sizeBytes)}` : '';

  let output = `─ ${table.name} (${colCount} cols${rowStr}${sizeStr})\n`;

  // Columns in groups of 3 per line for compact display
  const colStrs = table.columns.map(formatColumnCompact);
  for (let i = 0; i < colStrs.length; i += 3) {
    const chunk = colStrs.slice(i, i + 3);
    output += `   ${chunk.join(' | ')}\n`;
  }

  // Indexes
  if (table.indexes.length > 0) {
    const idxStrs = table.indexes.map((idx) => {
      const prefix = idx.unique ? 'UQ:' : 'IDX:';
      return `${prefix} ${idx.name}(${idx.columns.join(',')})`;
    });
    output += `   ${idxStrs.join(', ')}\n`;
  }

  return output;
}

/**
 * Format the full schema into a slim, token-efficient output
 */
export function formatSchemaCompact(schema: DBSchemaInfo): string {
  let output = `📊 DB Schema: ${schema.database} (${schema.engine} ${schema.version})\n`;
  output += `   ${schema.tables.length} tables\n\n`;

  for (let i = 0; i < schema.tables.length; i++) {
    const table = schema.tables[i];
    const prefix = i === schema.tables.length - 1 ? '└' : '├';
    const tableOutput = formatTableCompact(table);
    // Add tree prefix to first line
    const lines = tableOutput.split('\n');
    output += `${prefix}${lines[0]}\n`;
    for (let j = 1; j < lines.length; j++) {
      if (lines[j].trim()) {
        const connector = i === schema.tables.length - 1 ? ' ' : '│';
        output += `${connector}${lines[j]}\n`;
      }
    }
  }

  return output;
}

/**
 * Parse and compress a raw SQL query result (pipe-delimited table)
 * into a compact representation.
 */
export function compressQueryOutput(rawOutput: string, options?: {
  maxRows?: number;
  maxColWidth?: number;
  stripBorders?: boolean;
}): string {
  const maxRows = options?.maxRows ?? 20;
  const maxColWidth = options?.maxColWidth ?? 40;

  const lines = rawOutput.split(/\r?\n/).filter((l) => l.trim());

  // Filter out border lines (+---+---+)
  const dataLines = lines.filter((l) => !l.match(/^\+[-+]+\+$/));

  if (dataLines.length === 0) return '(No results)';

  // First line is header
  const header = dataLines[0];
  const dataRows = dataLines.slice(1);

  const totalRows = dataRows.length;
  const shownRows = dataRows.slice(0, maxRows);

  // Parse columns
  const parseRow = (line: string): string[] => {
    return line.split('|')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => c.length > maxColWidth ? c.substring(0, maxColWidth - 1) + '\u2026' : c);
  };

  const headerCols = parseRow(header);
  const outputLines: string[] = [];

  outputLines.push(headerCols.join(' | '));
  outputLines.push(headerCols.map((c) => '-'.repeat(Math.min(c.length, maxColWidth))).join('-+-'));

  for (const row of shownRows) {
    outputLines.push(parseRow(row).join(' | '));
  }

  if (totalRows > maxRows) {
    outputLines.push(`... (${totalRows - maxRows} more rows, ${totalRows} total)`);
  }

  return outputLines.join('\n');
}

/**
 * Compress MongoDB JSON output into a compact format
 */
export function compressMongoOutput(rawOutput: string, maxItems?: number): string {
  const max = maxItems ?? 10;

  try {
    // Try to parse as JSON array
    const data = JSON.parse(rawOutput);
    if (Array.isArray(data)) {
      const total = data.length;
      const shown = data.slice(0, max);
      const compacted = shown.map((item) => compactJSON(item));
      let result = compacted.join('\n');
      if (total > max) {
        result += `\n... (${total - max} more documents, ${total} total)`;
      }
      return result;
    }
    return compactJSON(data);
  } catch {
    // Not valid JSON, just truncate lines
    const lines = rawOutput.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length > max * 3) {
      return lines.slice(0, max * 3).join('\n') + `\n... (${lines.length - max * 3} more lines)`;
    }
    return rawOutput;
  }
}

/**
 * Compact a JSON object into a single-line summary
 */
function compactJSON(obj: any, maxDepth = 2, currentDepth = 0): string {
  if (currentDepth >= maxDepth) return '{...}';
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj !== 'object') {
    const str = String(obj);
    return str.length > 50 ? str.substring(0, 49) + '\u2026' : str;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    if (obj.length <= 3) return `[${obj.map((i) => compactJSON(i, maxDepth, currentDepth + 1)).join(', ')}]`;
    return `[${obj[0]}, ... (${obj.length} items)]`;
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}';

  const entries = keys.slice(0, 6).map((k) => {
    const val = compactJSON(obj[k], maxDepth, currentDepth + 1);
    return `${k}: ${val}`;
  });

  const suffix = keys.length > 6 ? `, +${keys.length - 6} more` : '';
  return `{ ${entries.join(', ')}${suffix} }`;
}

function formatCountShort(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1000000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1000000).toFixed(1)}M`;
}

function formatBytesShort(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}
