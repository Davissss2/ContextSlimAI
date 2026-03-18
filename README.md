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
  <a href="#"><img src="https://img.shields.io/badge/version-1.3.0-purple?style=flat-square" alt="Version" /></a>
</p>

<p align="center">
  CLI tool that automatically detects your project stack and generates optimized ignore files, AI rules, and custom terminal wrappers to <b>reduce token consumption by up to 90%</b> in AI-powered IDEs like Antigravity, Cursor, GitHub Copilot, and Claude Code.
</p>

---

## 💸 Stop Burning Your API Budget

When an AI assistant explores your project, a single careless command can burn thousands of tokens instantly. ContextSlim solves this by imposing strict limits and optimized data outputs tailored for LLM consumption.

### **How much do you save?**
- 📉 **90% Token Reduction** when scanning code structures using `contextslim map` instead of reading full files.
- 📉 **80% Token Reduction** when searching files using `contextslim grep` (caps matches to 5 per file vs dumping 500+ lines).
- 📉 **60% Token Reduction** by auto-generating `.gitattributes` to hide heavy build files from GitHub AI PR-reviewers.
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
npx contextslim init
```

ContextSlim analyzes your project, detects the stack, and auto-generates:

| File | Purpose |
|---|---|
| `.antigravityignore` | Exclude heavy dirs from Antigravity context |
| `.cursorignore` | Exclude heavy dirs from Cursor context |
| `.cursorrules` | AI behavior rules optimized for Cursor AI |
| `CLAUDE.md` | Context configuration for Claude Code |
| `.agent/rules/general.md` | **Local** project-specific context for Antigravity (stack, entry points, structure) |
| `~/.gemini/GEMINI.md` | **Global** ContextSlim command guide for Antigravity |
| `.github/copilot-instructions.md` | Specific instructions for GitHub Copilot |
| `.gitattributes` | Prevents large auto-generated files from cluttering GitHub PRs |

> **Result:** Up to **60-80% fewer tokens** per interaction. Faster, cheaper, smarter AI assistance.

---

## 🚀 Installation

```bash
# Install globally
npm install -g contextslim

# Or use directly with npx (no install needed)
npx contextslim init
```

### Requirements
- Node.js **≥ 18.0.0**

---

## 📖 Commands

### `init` — The Core Optimizer

Detects your project stack, generates exclusion rules, AI behavior guidelines, and project-specific context files.

```bash
npx contextslim init
```

**Generates:**
- **Global rules** (Antigravity): how to use ContextSlim commands, safe editing, progressive context, file type strategies
- **Local rules** (`.agent/rules/general.md`): detected stack, entry points, mini-tree of your project, coding conventions
- Ignore files for Antigravity, Cursor, Copilot, Claude

### `brief` — The Project Summary ⭐ NEW

Generates a ~300-token project summary you can **copy and paste into any AI conversation** for instant context.

```bash
npx contextslim brief
```

**Example output:**
```
Project: my-api
Stack: Node.js + TypeScript (Express)
Language: TypeScript (TypeScript)
Frameworks: Express
Entry points: src/index.ts (Main entry), src/app.ts (Express app)

Structure:
  src/
  ├── controllers/
  ├── models/
  ├── routes/
Config files: package.json, tsconfig.json
```

This gives any AI 80% understanding of your project in ~70 tokens instead of 5,000.

### `tree` — AI-Optimized Project Structure

Clean directory tree that auto-hides noisy folders (`node_modules`, `dist`, `.git`, etc).

```bash
npx contextslim tree [dir] [maxDepth]
npx contextslim tree . 2    # depth 2, current dir
```

### `map` — Zero-Token Skeleton Reader

Extracts only function, class, interface, and type signatures. A 2,000-line file becomes a 20-line structural summary.

```bash
npx contextslim map <file>
npx contextslim map src/index.ts
```

### `cat` — Optimized File Reader

Reads a file, strips blank lines, and if it exceeds 150 lines, shows first 75 + last 75 with a truncation notice.

```bash
npx contextslim cat <file>
```

> ⚠️ **Never use `cat` before editing a file** — it may truncate content. Use `view_file` (native) instead.

### `grep` — Optimized Search

Searches across files, auto-skipping heavy directories. Max 5 matches per file, 50 total.

```bash
npx contextslim grep <query> [dir]
npx contextslim grep "handleSubmit" src/
```

### `ls` — Optimized Directory Listing

Lists files and folders, hiding heavy directories. Shows summary counts.

```bash
npx contextslim ls [dir]
```

### `scan` — Token Waste Estimator

Calculates how many MB and estimated tokens are wasted by unignored heavy folders.

```bash
npx contextslim scan
```

### `doctor` — Health Checker

Verifies all context-optimization files are present and properly configured.

```bash
npx contextslim doctor
```

---

## 🔍 Stack Detection

ContextSlim auto-detects **20+ stacks and frameworks**:

| Stack | Detection Signal | Framework Detection |
|---|---|---|
| **Node.js / TypeScript** | `package.json`, `tsconfig.json` | Next.js, React, Vue, Nuxt, Svelte, Angular, NestJS, Express, Fastify, Hono, Koa, Remix, Astro, SolidJS, Electron, Tauri |
| **Python** | `requirements.txt`, `pyproject.toml`, `Pipfile` | Django, FastAPI, Flask, Streamlit |
| **PHP** | `composer.json` | Laravel, Symfony, WordPress |
| **Ruby** | `Gemfile` | Rails |
| **Rust** | `Cargo.toml` | — |
| **Go** | `go.mod` | — |
| **Java** | `pom.xml`, `build.gradle` | — |
| **Kotlin** | `build.gradle.kts` | Android |
| **C# / .NET** | `Program.cs`, `*.csproj` | ASP.NET, Razor Pages |
| **Flutter / Dart** | `pubspec.yaml` | — |
| **Swift / iOS** | `Package.swift` | — |
| **Terraform** | `main.tf` | — |
| **Docker** | `Dockerfile`, `docker-compose.yml` | — |

---

## 🧠 AI Rules System

ContextSlim generates a **two-layer rules system** for Antigravity:

### Global Rules (`~/.gemini/GEMINI.md`)
Teaches the AI **how to use ContextSlim** and best practices:

- **Progressive Context** — Always escalate: `tree` → `map` → `view_file` (specific lines) → `view_file` (full)
- **Safe Editing** — Always `view_file` before editing. Never edit based on truncated `cat` output
- **File Handling Strategy** — Which tool to use per file type
- **When NOT to Use ContextSlim** — Small files, before editing, git diffs, config files
- **NEVER Rules** — node_modules, lockfiles, .env, auto-generated files
- **Smart Search** — Check tree/conventions before searching
- **Efficiency** — Don't repeat commands, group reads, keep responses lean
- **Error Recovery** — Fallback to native tools when ContextSlim fails

### Local Rules (`.agent/rules/general.md`)
Gives the AI **project-specific context**:

- **Stack** detected (e.g., "Node.js + TypeScript (Express)")
- **Entry points** auto-detected (e.g., `src/index.ts — Main entry`)
- **Mini-tree** of the project structure embedded
- **Coding conventions** for the detected language (ESM, TypeScript types, framework patterns)

---

## 📂 Generated Files

```
your-project/
├── .antigravityignore               # Context blockers for Antigravity
├── .cursorignore                    # Context blockers for Cursor
├── .cursorrules                     # Rules for Cursor AI behavior
├── CLAUDE.md                        # Claude Code rules
├── .gitattributes                   # Hide heavy files from GitHub AI
├── .agent/
│   └── rules/
│       └── general.md               # Local project context (stack, entry points, tree)
├── .github/
│   └── copilot-instructions.md      # Rules for Copilot
└── ~/.gemini/
    └── GEMINI.md                    # Global ContextSlim command guide
```

---

## 🗺️ Roadmap

Features planned for future releases:

| Feature | Description | Status |
|---------|-------------|--------|
| `contextslim diff` | Show only changes since last commit — saves massive tokens for "fix this bug" flows | ✅ Done |
| `contextslim deps <file>` | Dependency graph: what a file imports and what imports it | 🔜 Planned |
| `contextslim stats` | Real metrics: measure exact token savings during runs | ✅ Done |
| `.contextslimrc` | Config file to customize limits, exclude patterns, IDEs logic | ✅ Done |
| Monorepo support | Detect Turborepo/pnpm workspaces and generate context per package | 🔜 Planned |
| `contextslim status` | Health Checks / Rule states | 🔜 Planned |
| `contextslim clean` | Purge all generated optimization files to reset | 🔜 Planned |
| `contextslim benchmark` | Compare token usage with/without ContextSlim on real workflows | 💡 Idea |

---

## 🏗️ Architecture

```
contextslim/
├── bin/
│   └── contextslim.js            # CLI entry point
├── src/
│   ├── index.ts                  # Commander setup (10 commands)
│   ├── commands/
│   │   ├── init.ts               # Core: detect stack + generate all files
│   │   ├── brief.ts              # NEW: ~300-token project summary
│   │   ├── scan.ts               # Token waste estimator
│   │   ├── doctor.ts             # Health checks
│   │   ├── tree.ts               # AI-optimized directory tree
│   │   ├── map.ts                # Zero-token skeleton reader
│   │   ├── cat.ts                # Optimized file reader
│   │   ├── grep.ts               # Optimized search
│   │   └── ls.ts                 # Optimized directory listing
│   ├── analyzers/
│   │   ├── stack-detector.ts     # 20+ stack/framework detection
│   │   └── project-context.ts    # Entry point + mini-tree generator
│   └── generators/
│       ├── ignore-generator.ts   # Context excluders
│       └── rules-generator.ts    # Global + local rules for all IDEs
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

# Test locally
npx contextslim brief
npx contextslim init
```

---

## 📄 License

MIT © [ContextSlim Contributors](LICENSE)

---

<p align="center">
  <sub>Built with ❤️ to save tokens and developer sanity.</sub>
</p>
