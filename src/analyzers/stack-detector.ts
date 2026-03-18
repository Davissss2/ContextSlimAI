import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface StackInfo {
  name: string;
  language: string;
  hasTypeScript: boolean;
  detectedFiles: string[];
  frameworks: string[];
}

const STACK_SIGNALS: { file: string; stack: string; language: string }[] = [
  { file: 'package.json', stack: 'Node.js', language: 'JavaScript' },
  { file: 'requirements.txt', stack: 'Python', language: 'Python' },
  { file: 'pyproject.toml', stack: 'Python', language: 'Python' },
  { file: 'Cargo.toml', stack: 'Rust', language: 'Rust' },
  { file: 'go.mod', stack: 'Go', language: 'Go' },
  { file: 'pom.xml', stack: 'Java', language: 'Java' },
  { file: 'build.gradle', stack: 'Java/Kotlin', language: 'Java' },
  { file: 'composer.json', stack: 'PHP', language: 'PHP' },
  { file: 'Gemfile', stack: 'Ruby', language: 'Ruby' },
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

    if (deps['next']) frameworks.push('Next.js');
    if (deps['react']) frameworks.push('React');
    if (deps['vue']) frameworks.push('Vue');
    if (deps['nuxt']) frameworks.push('Nuxt');
    if (deps['@nestjs/core']) frameworks.push('NestJS');
    if (deps['express']) frameworks.push('Express');
    if (deps['svelte']) frameworks.push('Svelte');

    return frameworks;
  } catch {
    return [];
  }
}

export async function detectStack(dir: string): Promise<StackInfo> {
  const detectedFiles: string[] = [];
  let name = 'Unknown';
  let language = 'Unknown';
  let hasTypeScript = false;
  let frameworks: string[] = [];

  for (const signal of STACK_SIGNALS) {
    const filePath = join(dir, signal.file);
    if (await fileExists(filePath)) {
      detectedFiles.push(signal.file);
      // Use the first match as primary stack
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

  if (name.includes('Node.js')) {
    frameworks = await detectFrameworksFromPackageJson(dir);
    if (frameworks.length > 0) {
      name += ` (${frameworks[0]})`;
    }
  }

  return { name, language, hasTypeScript, detectedFiles, frameworks };
}
