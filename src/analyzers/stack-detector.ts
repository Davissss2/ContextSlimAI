import { access } from 'node:fs/promises';
import { join } from 'node:path';

export interface StackInfo {
  name: string;
  language: string;
  hasTypeScript: boolean;
  detectedFiles: string[];
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

export async function detectStack(dir: string): Promise<StackInfo> {
  const detectedFiles: string[] = [];
  let name = 'Unknown';
  let language = 'Unknown';
  let hasTypeScript = false;

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

  return { name, language, hasTypeScript, detectedFiles };
}
