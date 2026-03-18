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
  CLI tool that automatically detects your project stack and generates optimized ignore files & AI rules to <b>drastically reduce token consumption</b> in AI-powered IDEs like Antigravity, Cursor, GitHub Copilot, and Claude Code.
</p>

<br />

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
| `.agents/workflows/coding_guidelines.md` | Workflows and context rules for Antigravity |
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
├── .gitattributes                   # Mark heavy files to be ignored by Github AI PR reviewers
├── .github/
│   └── copilot-instructions.md      # Rules for Copilot
└── .agents/
    └── workflows/
        └── coding_guidelines.md     # Automated workflow logic for Antigravity
```

### Wait, why `.agents/workflows/` for Antigravity?
Antigravity uses a robust agent-based context system. A dedicated Markdown file with YAML frontmatter ensures it understands exactly how to read and write your project token-efficiently.

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
