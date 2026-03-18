import { readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import type { StackInfo } from './stack-detector.js';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', 'dist', 'build', 'out',
  'coverage', '.cache', 'venv', '.venv', 'target', 'vendor',
  '__pycache__', '.tox', '.mypy_cache', '.pytest_cache',
]);

// ── Entry Point Detection ──────────────────────────────────────

interface EntryPointPattern {
  paths: string[];
  label: string;
}

const ENTRY_POINTS_BY_STACK: Record<string, EntryPointPattern[]> = {
  'Node.js': [
    { paths: ['src/index.ts', 'src/index.js', 'index.ts', 'index.js'], label: 'Main entry' },
    { paths: ['src/app.ts', 'src/app.js', 'app.ts', 'app.js'], label: 'App entry' },
    { paths: ['src/server.ts', 'src/server.js', 'server.ts', 'server.js'], label: 'Server entry' },
    { paths: ['src/main.ts', 'src/main.js', 'main.ts', 'main.js'], label: 'Main entry' },
  ],
  'Next.js': [
    { paths: ['src/app/layout.tsx', 'app/layout.tsx'], label: 'Root layout' },
    { paths: ['src/app/page.tsx', 'app/page.tsx'], label: 'Home page' },
    { paths: ['next.config.js', 'next.config.mjs', 'next.config.ts'], label: 'Next.js config' },
  ],
  'React': [
    { paths: ['src/App.tsx', 'src/App.jsx', 'src/App.js'], label: 'App component' },
    { paths: ['src/main.tsx', 'src/main.jsx', 'src/index.tsx', 'src/index.jsx'], label: 'React entry' },
  ],
  'Vue': [
    { paths: ['src/App.vue'], label: 'App component' },
    { paths: ['src/main.ts', 'src/main.js'], label: 'Vue entry' },
  ],
  'Nuxt': [
    { paths: ['app.vue'], label: 'App component' },
    { paths: ['nuxt.config.ts', 'nuxt.config.js'], label: 'Nuxt config' },
  ],
  'NestJS': [
    { paths: ['src/main.ts'], label: 'NestJS bootstrap' },
    { paths: ['src/app.module.ts'], label: 'Root module' },
    { paths: ['src/app.controller.ts'], label: 'Root controller' },
  ],
  'Express': [
    { paths: ['src/app.ts', 'src/app.js', 'app.ts', 'app.js'], label: 'Express app' },
    { paths: ['src/routes/index.ts', 'src/routes/index.js', 'routes/index.ts', 'routes/index.js'], label: 'Route index' },
  ],
  'Svelte': [
    { paths: ['src/routes/+page.svelte', 'src/App.svelte'], label: 'Svelte entry' },
    { paths: ['svelte.config.js'], label: 'Svelte config' },
  ],
  'Python': [
    { paths: ['main.py', 'app.py', 'src/main.py'], label: 'Main entry' },
    { paths: ['manage.py'], label: 'Django manager' },
    { paths: ['wsgi.py', 'asgi.py'], label: 'WSGI/ASGI entry' },
  ],
  'Rust': [
    { paths: ['src/main.rs'], label: 'Main entry' },
    { paths: ['src/lib.rs'], label: 'Library root' },
  ],
  'Go': [
    { paths: ['main.go', 'cmd/main.go'], label: 'Main entry' },
  ],
  'Java': [
    { paths: ['src/main/java'], label: 'Source root (explore with ls)' },
  ],
  'PHP': [
    { paths: ['public/index.php', 'index.php'], label: 'Public entry' },
    { paths: ['artisan'], label: 'Laravel artisan' },
    { paths: ['routes/web.php', 'routes/api.php'], label: 'Route definitions' },
  ],
  'Ruby': [
    { paths: ['config/routes.rb'], label: 'Rails routes' },
    { paths: ['config/application.rb'], label: 'Rails app config' },
    { paths: ['app.rb', 'config.ru'], label: 'Rack/Sinatra entry' },
  ],
};

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function detectEntryPoints(
  dir: string,
  stack: StackInfo,
): Promise<{ file: string; label: string }[]> {
  const found: { file: string; label: string }[] = [];

  // Gather pattern lists: check stack name, then check each framework
  const patternSources: string[] = [];

  // Match against base stack (e.g. "Node.js")
  const baseStack = stack.name.split(' ')[0].replace(/[+(].*/, '').trim();
  if (ENTRY_POINTS_BY_STACK[baseStack]) {
    patternSources.push(baseStack);
  }

  // Match against each detected framework
  for (const fw of stack.frameworks) {
    if (ENTRY_POINTS_BY_STACK[fw]) {
      patternSources.push(fw);
    }
  }

  // Also check language fallback
  if (ENTRY_POINTS_BY_STACK[stack.language] && !patternSources.includes(stack.language)) {
    patternSources.push(stack.language);
  }

  // Deduplicate: track which files we've already added
  const addedFiles = new Set<string>();

  for (const source of patternSources) {
    const patterns = ENTRY_POINTS_BY_STACK[source];
    for (const pattern of patterns) {
      for (const path of pattern.paths) {
        if (addedFiles.has(path)) continue;
        if (await fileExists(join(dir, path))) {
          found.push({ file: path, label: pattern.label });
          addedFiles.add(path);
          break; // first match per pattern group is enough
        }
      }
    }
  }

  return found;
}

// ── Mini-Tree Generation ───────────────────────────────────────

export async function generateMiniTree(
  dir: string,
  maxDepth = 2,
): Promise<string> {
  const lines: string[] = [];
  await buildTree(dir, '', 0, maxDepth, lines);
  return lines.join('\n');
}

async function buildTree(
  dirPath: string,
  prefix: string,
  depth: number,
  maxDepth: number,
  lines: string[],
): Promise<void> {
  if (depth > maxDepth) return;

  try {
    const items = await readdir(dirPath, { withFileTypes: true });
    items.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    // Filter out ignored dirs and hidden files (except important ones)
    const visible = items.filter((item) => {
      if (IGNORED_DIRS.has(item.name)) return false;
      // hide dotfiles except config ones
      if (item.name.startsWith('.') && item.isDirectory()) return false;
      return true;
    });

    for (let i = 0; i < visible.length; i++) {
      const item = visible[i];
      const isLast = i === visible.length - 1;
      const branch = isLast ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');

      if (item.isDirectory()) {
        lines.push(`${prefix}${branch}${item.name}/`);
        await buildTree(join(dirPath, item.name), nextPrefix, depth + 1, maxDepth, lines);
      } else {
        lines.push(`${prefix}${branch}${item.name}`);
      }
    }
  } catch {
    // ignore permission errors
  }
}
