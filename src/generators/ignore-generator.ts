import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { StackInfo } from '../analyzers/stack-detector.js';

const BASE_IGNORE_PATTERNS = [
  '# ===== ContextSlim Auto-Generated =====',
  '# Dependencies',
  'node_modules/',
  '.pnp.*',
  '',
  '# Build outputs',
  'dist/',
  'build/',
  '.next/',
  'out/',
  '.nuxt/',
  '.output/',
  '.vercel/',
  '.netlify/',
  '',
  '# Environment & Secrets',
  '.env',
  '.env.*',
  '*.pem',
  '*.key',
  '',
  '# Version control',
  '.git/',
  '.svn/',
  '.hg/',
  '',
  '# IDE / Editor',
  '.idea/',
  '.vscode/',
  '*.swp',
  '*.swo',
  '',
  '# OS files',
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
  '',
  '# Logs & Caches',
  '*.log',
  'npm-debug.log*',
  '.cache/',
  '.tmp/',
  '.temp/',
  '',
  '# Heavy media assets',
  '*.mp4',
  '*.mov',
  '*.avi',
  '*.mkv',
  '*.mp3',
  '*.wav',
  '*.flac',
  '*.zip',
  '*.tar.gz',
  '*.rar',
  '*.7z',
  '*.iso',
  '*.dmg',
  '*.pdf',
  '*.psd',
  '*.ai',
  '',
  '# Lock files (usually not needed for AI context)',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '',
  '# Test coverage',
  'coverage/',
  '.nyc_output/',
];

const PYTHON_PATTERNS = [
  '',
  '# Python-specific',
  'venv/',
  '.venv/',
  '__pycache__/',
  '*.pyc',
  '*.pyo',
  '.mypy_cache/',
  '.pytest_cache/',
  '.tox/',
  'htmlcov/',
  '*.egg-info/',
  'pip-wheel-metadata/',
];

const RUST_PATTERNS = [
  '',
  '# Rust-specific',
  'target/',
  '*.rlib',
  'Cargo.lock',
];

const GO_PATTERNS = [
  '',
  '# Go-specific',
  'vendor/',
  'go.sum',
];

const JAVA_PATTERNS = [
  '',
  '# Java-specific',
  '.gradle/',
  'gradle/',
  '*.class',
  '*.jar',
  '*.war',
  '.m2/',
];

const PHP_PATTERNS = [
  '',
  '# PHP-specific',
  'vendor/',
  'composer.lock',
];

function getStackPatterns(stack: StackInfo): string[] {
  const patterns = [...BASE_IGNORE_PATTERNS];

  switch (stack.language) {
    case 'Python':
      patterns.push(...PYTHON_PATTERNS);
      break;
    case 'Rust':
      patterns.push(...RUST_PATTERNS);
      break;
    case 'Go':
      patterns.push(...GO_PATTERNS);
      break;
    case 'Java':
      patterns.push(...JAVA_PATTERNS);
      break;
    case 'PHP':
      patterns.push(...PHP_PATTERNS);
      break;
  }

  patterns.push('', '# ===== End ContextSlim =====');
  return patterns;
}

function getGitAttributesPatterns(stack: StackInfo): string[] {
  const patterns = [
    '# ===== ContextSlim Auto-Generated =====',
    '# Ignore these files in GitHub PR diffs & repo language stats',
    'package-lock.json linguist-generated=true',
    'yarn.lock linguist-generated=true',
    'pnpm-lock.yaml linguist-generated=true',
    'dist/** linguist-generated=true',
    'build/** linguist-generated=true',
    '.next/** linguist-generated=true',
    '.nuxt/** linguist-generated=true',
    'out/** linguist-generated=true',
  ];

  if (stack.language === 'Go') {
    patterns.push('go.sum linguist-generated=true');
    patterns.push('vendor/** linguist-generated=true');
  } else if (stack.language === 'Java') {
    patterns.push('gradlew linguist-generated=true');
    patterns.push('gradlew.bat linguist-generated=true');
  } else if (stack.language === 'PHP') {
    patterns.push('composer.lock linguist-generated=true');
  }

  patterns.push('# ===== End ContextSlim =====');
  return patterns;
}

export async function generateIgnoreFiles(
  dir: string,
  stack: StackInfo,
): Promise<string[]> {
  const patterns = getStackPatterns(stack);
  const content = patterns.join('\n') + '\n';
  const createdFiles: string[] = [];

  const files = ['.antigravityignore', '.cursorignore'];

  for (const fileName of files) {
    const filePath = join(dir, fileName);
    await writeFile(filePath, content, 'utf-8');
    createdFiles.push(fileName);
  }

  // Generate .gitattributes
  const gitattrPatterns = getGitAttributesPatterns(stack);
  await writeFile(join(dir, '.gitattributes'), gitattrPatterns.join('\n') + '\n', 'utf-8');
  createdFiles.push('.gitattributes');

  return createdFiles;
}
