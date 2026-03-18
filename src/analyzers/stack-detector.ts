import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export interface StackInfo {
  name: string;
  language: string;
  hasTypeScript: boolean;
  detectedFiles: string[];
  frameworks: string[];
}

const STACK_SIGNALS: { file: string; stack: string; language: string }[] = [
  // JavaScript / TypeScript ecosystem
  { file: 'package.json', stack: 'Node.js', language: 'JavaScript' },

  // Python
  { file: 'requirements.txt', stack: 'Python', language: 'Python' },
  { file: 'pyproject.toml', stack: 'Python', language: 'Python' },
  { file: 'Pipfile', stack: 'Python', language: 'Python' },

  // Rust
  { file: 'Cargo.toml', stack: 'Rust', language: 'Rust' },

  // Go
  { file: 'go.mod', stack: 'Go', language: 'Go' },

  // JVM
  { file: 'pom.xml', stack: 'Java', language: 'Java' },
  { file: 'build.gradle', stack: 'Java/Kotlin', language: 'Java' },
  { file: 'build.gradle.kts', stack: 'Kotlin', language: 'Kotlin' },

  // PHP
  { file: 'composer.json', stack: 'PHP', language: 'PHP' },

  // Ruby
  { file: 'Gemfile', stack: 'Ruby', language: 'Ruby' },

  // C# / .NET
  { file: 'Program.cs', stack: '.NET', language: 'C#' },
  { file: '*.csproj', stack: '.NET', language: 'C#' },
  { file: '*.sln', stack: '.NET', language: 'C#' },

  // Flutter / Dart
  { file: 'pubspec.yaml', stack: 'Flutter/Dart', language: 'Dart' },

  // Swift / iOS
  { file: 'Package.swift', stack: 'Swift', language: 'Swift' },
  { file: '*.xcodeproj', stack: 'iOS/macOS', language: 'Swift' },

  // Infrastructure as Code
  { file: 'main.tf', stack: 'Terraform', language: 'HCL' },
  { file: 'terraform.tf', stack: 'Terraform', language: 'HCL' },
  { file: 'kubernetes.yaml', stack: 'Kubernetes', language: 'YAML' },
  { file: 'k8s.yaml', stack: 'Kubernetes', language: 'YAML' },
  { file: 'docker-compose.yml', stack: 'Docker', language: 'YAML' },
  { file: 'docker-compose.yaml', stack: 'Docker', language: 'YAML' },
  { file: 'Dockerfile', stack: 'Docker', language: 'Dockerfile' },

  // Desktop
  { file: 'src-tauri/tauri.conf.json', stack: 'Tauri', language: 'Rust' },
];

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function detectFrameworksFromPackageJson(dir: string): Promise<string[]> {
  try {
    const pkgContent = await readFile(join(dir, 'package.json'), 'utf-8');
    const pkg = JSON.parse(pkgContent);
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const frameworks: string[] = [];

    // Meta-frameworks / Full-stack
    if (deps['next']) frameworks.push('Next.js');
    if (deps['nuxt']) frameworks.push('Nuxt');
    if (deps['@remix-run/node'] || deps['@remix-run/react']) frameworks.push('Remix');
    if (deps['astro']) frameworks.push('Astro');

    // Frontend frameworks
    if (deps['react'] && !deps['next'] && !deps['@remix-run/react']) frameworks.push('React');
    if (deps['vue'] && !deps['nuxt']) frameworks.push('Vue');
    if (deps['svelte']) frameworks.push('Svelte');
    if (deps['solid-js']) frameworks.push('SolidJS');
    if (deps['angular'] || deps['@angular/core']) frameworks.push('Angular');

    // Backend frameworks
    if (deps['@nestjs/core']) frameworks.push('NestJS');
    if (deps['express']) frameworks.push('Express');
    if (deps['fastify']) frameworks.push('Fastify');
    if (deps['hono']) frameworks.push('Hono');
    if (deps['koa']) frameworks.push('Koa');

    // Desktop
    if (deps['electron']) frameworks.push('Electron');
    if (deps['@tauri-apps/api']) frameworks.push('Tauri');

    return frameworks;
  } catch {
    return [];
  }
}

async function detectFrameworksFromPython(dir: string): Promise<string[]> {
  const frameworks: string[] = [];
  try {
    // Check requirements.txt
    const reqContent = await readFile(join(dir, 'requirements.txt'), 'utf-8').catch(() => '');
    const pyprojectContent = await readFile(join(dir, 'pyproject.toml'), 'utf-8').catch(() => '');
    const combined = reqContent + pyprojectContent;

    if (combined.includes('django') || combined.includes('Django')) frameworks.push('Django');
    if (combined.includes('fastapi') || combined.includes('FastAPI')) frameworks.push('FastAPI');
    if (combined.includes('flask') || combined.includes('Flask')) frameworks.push('Flask');
    if (combined.includes('streamlit')) frameworks.push('Streamlit');
  } catch {}
  return frameworks;
}

async function detectFrameworksFromPHP(dir: string): Promise<string[]> {
  const frameworks: string[] = [];
  if (await fileExists(join(dir, 'artisan'))) frameworks.push('Laravel');
  if (await fileExists(join(dir, 'symfony.lock'))) frameworks.push('Symfony');
  if (await fileExists(join(dir, 'wp-config.php'))) frameworks.push('WordPress');
  return frameworks;
}

async function detectFrameworksFromRuby(dir: string): Promise<string[]> {
  const frameworks: string[] = [];
  if (await fileExists(join(dir, 'config', 'routes.rb'))) frameworks.push('Rails');
  return frameworks;
}

async function detectFrameworksFromDotnet(dir: string): Promise<string[]> {
  const frameworks: string[] = [];
  // Simple heuristic: check for Controllers or Pages directories
  if (await fileExists(join(dir, 'Controllers'))) frameworks.push('ASP.NET');
  if (await fileExists(join(dir, 'Pages'))) frameworks.push('Razor Pages');
  if (await fileExists(join(dir, 'Hubs'))) frameworks.push('SignalR');
  return frameworks;
}

async function matchesGlob(dir: string, pattern: string): Promise<string | null> {
  const ext = pattern.replace('*', '');
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(ext)) {
        return entry.name;
      }
    }
  } catch {}
  return null;
}

async function scanDirForStack(dir: string): Promise<StackInfo> {
  const detectedFiles: string[] = [];
  let name = 'Unknown';
  let language = 'Unknown';
  let hasTypeScript = false;
  let frameworks: string[] = [];

  for (const signal of STACK_SIGNALS) {
    if (signal.file.startsWith('*')) {
      // Resolve glob patterns (*.csproj, *.sln, *.xcodeproj)
      const matched = await matchesGlob(dir, signal.file);
      if (matched) {
        detectedFiles.push(matched);
        if (name === 'Unknown') {
          name = signal.stack;
          language = signal.language;
        }
      }
      continue;
    }
    const filePath = join(dir, signal.file);
    if (await fileExists(filePath)) {
      detectedFiles.push(signal.file);
      if (name === 'Unknown') {
        name = signal.stack;
        language = signal.language;
      }
    }
  }

  // Check for TypeScript (enhances Node.js detection)
  if (await fileExists(join(dir, 'tsconfig.json'))) {
    detectedFiles.push('tsconfig.json');
    hasTypeScript = true;
    if (name === 'Node.js') {
      name = 'Node.js + TypeScript';
      language = 'TypeScript';
    }
  }

  // Detect frameworks based on stack
  if (name.includes('Node.js')) {
    frameworks = await detectFrameworksFromPackageJson(dir);
    if (frameworks.length > 0) {
      name += ` (${frameworks[0]})`;
    }
  } else if (name === 'Python') {
    frameworks = await detectFrameworksFromPython(dir);
    if (frameworks.length > 0) {
      name += ` (${frameworks[0]})`;
    }
  } else if (name === 'PHP') {
    frameworks = await detectFrameworksFromPHP(dir);
    if (frameworks.length > 0) {
      name += ` (${frameworks[0]})`;
    }
  } else if (name === 'Ruby') {
    frameworks = await detectFrameworksFromRuby(dir);
    if (frameworks.length > 0) {
      name += ` (${frameworks[0]})`;
    }
  } else if (name === '.NET') {
    frameworks = await detectFrameworksFromDotnet(dir);
    if (frameworks.length > 0) {
      name += ` (${frameworks[0]})`;
    }
  }

  return { name, language, hasTypeScript, detectedFiles, frameworks };
}

export async function detectStack(dir: string): Promise<StackInfo> {
  // First: try to detect in the root directory
  const rootResult = await scanDirForStack(dir);
  if (rootResult.name !== 'Unknown') {
    return rootResult;
  }

  // Fallback: scan immediate subdirectories (depth 1)
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const subdirs = entries.filter(
      (e) => e.isDirectory() && !e.name.startsWith('.') && !SKIP_DIRS.has(e.name),
    );

    for (const sub of subdirs) {
      const subResult = await scanDirForStack(join(dir, sub.name));
      if (subResult.name !== 'Unknown') {
        return subResult;
      }
    }
  } catch {}

  // Nothing found anywhere
  return rootResult;
}

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', '.git', '.next', '.nuxt',
  'coverage', '.cache', 'venv', '.venv', 'target', 'vendor',
  '__pycache__', '.tox', '.mypy_cache', '.pytest_cache',
]);
