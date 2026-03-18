<p align="center">
  <img src="assets/banner.svg" alt="ContextSlim Banner" width="500" />
</p>

<h1 align="center">ContextSlim</h1>

<p align="center">
  <strong>🧠 Stop burning tokens. Start shipping faster.</strong>
</p>

<p align="center">
  <a href="#installation"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square&logo=node.js" alt="Node Version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" /></a>
  <a href="#"><img src="https://img.shields.io/badge/PRs-welcome-ff69b4?style=flat-square" alt="PRs Welcome" /></a>
  <a href="#"><img src="https://img.shields.io/badge/version-1.1.0-purple?style=flat-square" alt="Version" /></a>
</p>

<p align="center">
  CLI tool that automatically detects your project stack and generates optimized ignore files, AI rules, and custom terminal wrappers to <b>reduce token consumption by up to 90%</b> in AI-powered IDEs like Antigravity, Cursor, GitHub Copilot, and Claude Code.
</p>

---

## 💸 Stop Burning Your API Budget

When an AI assistant explores your project, a single careless command can burn thousands of tokens instantly. ContextSlim solves this by imposing strict limits and optimized data outputs tailored for LLM consumption.

### **How much do you save?**
- 📉 **90% Token Reduction** when scanning code structures using `contextslim map` instead of reading full files.
- 📉 **80% Token Reduction** when searching files using `contextslim grep` (caps matches to 5 per file vs dumping 500+ lines of logs).
- 📉 **60% Token Reduction** by auto-generating `.gitattributes` to intentionally hide heavy build files from GitHub's AI PR-reviewers and Copilot.
- 📉 **100% Protection** against fatal context overflows caused by an AI running `cat package-lock.json` or `ls` on `node_modules`.

---

## ⚡ The Problem

AI-powered IDEs send **massive amounts of context** to LLMs on every interaction — `node_modules`, build artifacts, logs, media files, and thousands of irrelevant files. This means:

- 🔥 **Wasted tokens** (= wasted money)
- 🐌 **Slower responses** from your AI assistant
- 🧩 **Noisier context** leading to worse code suggestions
- 📉 **Hitting rate limits** faster than necessary

## 💡 The Solution

**One command. Instant optimization.**

```bash
contextslim init
```

ContextSlim analyzes your project, detects the stack (Node, Python, Rust, React, Next.js, etc.), and auto-generates:

| File | Purpose |
|---|---|
| `.antigravityignore` | Exclude heavy dirs from Antigravity context |
| `.cursorignore` | Exclude heavy dirs from Cursor context |
| `.cursorrules` | AI behavior rules optimized for Cursor AI |
| `CLAUDE.md` | Context configuration for Claude Code |
| `.agents/rules.md` | Native rules indexing for Antigravity agents |
| `.github/copilot-instructions.md` | Specific instructions for GitHub Copilot |
| `.gitattributes` | Prevents large auto-generated files from cluttering GitHub PRs |

> **Result:** Up to **60-80% fewer tokens** per interaction. Faster, cheaper, smarter AI assistance.

---

## 🚀 Installation

```bash
# Install globally
npm install -g contextslim

# Or use directly with npx
npx contextslim init
```

### Requirements

- Node.js **≥ 18.0.0**

---

## 📖 Features & Commands

### 1. `init` - The Core Optimizer
Navigate to your project root and run to generate exclusion rules and AI guidelines tailored specifically to your framework and language.

```bash
cd your-project
contextslim init
```

### 2. `scan` - The Token Waste Estimator
Find out how much context noise you currently have. `scan` deeply checks your directories and calculates how many MegaBytes (and estimated tokens) are being wasted by not ignoring heavy folders.

```bash
contextslim scan
```

### 3. `doctor` - The Health Checker
Verifies that all context-slimming files are present and properly configured.

```bash
contextslim doctor
```

### 4. `ls` - The AI-Optimized Directory Listing
Lists files like `ls` o `dir`, but strictly hides noisy directories.

```bash
contextslim ls [target-dir]
```

### 5. `tree` - The AI-Optimized Project Mapper
An intelligent `tree` command that stops at an AI-safe depth (default 3) and ignores irrelevant heavy folders like `.git` or `dist`.

```bash
contextslim tree [target-dir] [maxDepth]
```

### 6. `cat` - The AI-Optimized File Reader
Reads a file but violently optimizes it. It drops empty lines to pack context, and if a file exceeds 150 lines, it snips out the middle.

```bash
contextslim cat <target-file>
```

### 7. `grep` - The AI-Optimized Searcher
A lightweight `grep` killer explicitly built for AI. Automatically ignores massive directories like `node_modules` or `dist` and strictly caps results to just 5 matches per file so your AI doesn't burn out its memory reading thousands of log occurrences.

```bash
contextslim grep <query> [target-dir]
```

### 8. `map` - The Zero-Token Skeleton Reader
Want an AI to understand the structure of a file without reading the logic? `map` strips out everything except `export`, `function`, `class`, and `interface` signatures. What was a 2,000-line file becomes a 20-line structural summary.

```bash
contextslim map <target-file>
```

---

## 🔍 Advanced Stack Detection

ContextSlim automatically detects your project type and adds specific rules:

| Stack | Detection Signal | Auto-Added Rules |
|---|---|---|
| **Node.js/TS** | `package.json` | ES Modules, async/await priorities |
| **Next.js** | Next.js Dependency | App Router patterns, `next/image` |
| **React/Vue** | Framework Dep | Hooks, Composition API patterns |
| **Python** | `requirements.txt` | PEP 8, pathlib, type hints |
| **Rust** | `Cargo.toml` | Result<T, E>, unwrap minimization |

---

## 📂 Generated Files Breakdown

### Output Structure

```
your-project/
├── .antigravityignore               # Context blockers for Antigravity
├── .cursorignore                    # Context blockers for Cursor
├── .cursorrules                     # Rules for Cursor AI behavior
├── CLAUDE.md                        # Claude Code rules
├── .gitattributes                   # Mark heavy files to be ignored by Github AI PR reviewers
├── .github/
│   └── copilot-instructions.md      # Rules for Copilot
└── .agents/
    └── rules.md                     # Native rules index for Antigravity
```

---

## 🏗️ Architecture

```
contextslim/
├── assets/
│   └── banner.png              # Banner asset
├── bin/
│   └── contextslim.js          # CLI entry point
├── src/
│   ├── index.ts                # Commander setup
│   ├── commands/
│   │   ├── init.ts             # Orchestrator
│   │   ├── scan.ts             # Waste estimator logic
│   │   └── doctor.ts           # Health checks
│   ├── analyzers/
│   │   └── stack-detector.ts   # Advanced framework detection
│   └── generators/
│       ├── ignore-generator.ts # Context excluders
│       └── rules-generator.ts  # Workspace rules output
├── package.json
└── tsconfig.json
```

---

## 🤝 Contributing

Contributions are welcome! Whether it's a bug fix, new stack detection, or a feature request.

```bash
# Clone the repo
git clone https://github.com/Davissss2/ContextSlimAI.git
cd contextslim

# Install dependencies
npm install

# Build
npm run build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📄 License

MIT © [ContextSlim Contributors](LICENSE)

---

<p align="center">
  <sub>Built with ❤️ to save tokens and developer sanity.</sub>
</p>
