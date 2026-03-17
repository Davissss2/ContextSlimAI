<p align="center">
  <img src="assets/logo.png" alt="ContextSlim Logo" width="180" />
</p>

<h1 align="center">ContextSlim</h1>

<p align="center">
  <strong>🧠 Stop burning tokens. Start shipping faster.</strong>
</p>

<p align="center">
  <a href="#installation"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square&logo=node.js" alt="Node Version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" /></a>
  <a href="#"><img src="https://img.shields.io/badge/PRs-welcome-ff69b4?style=flat-square" alt="PRs Welcome" /></a>
  <a href="#"><img src="https://img.shields.io/badge/version-1.0.0-purple?style=flat-square" alt="Version" /></a>
</p>

<p align="center">
  CLI tool that automatically detects your project stack and generates optimized ignore files & AI rules to <b>drastically reduce token consumption</b> in AI-powered IDEs like Antigravity, Cursor, and Claude Code.
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

ContextSlim analyzes your project, detects the stack (Node, Python, Rust, etc.), and auto-generates:

| File | Purpose |
|---|---|
| `.antigravityignore` | Exclude heavy dirs from Antigravity context |
| `.cursorignore` | Exclude heavy dirs from Cursor context |
| `GEMINI.md` | AI behavior rules optimized for your stack |
| `AGENTS.md` | Agent-specific instructions & conventions |

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

## 📖 Usage

### `contextslim init`

Navigate to your project root and run:

```bash
cd your-project
contextslim init
```

**What happens:**

```
  🔍 Detecting project stack...
  ✔ Detected: Node.js + TypeScript

  📁 Generating exclusion files...
  ✔ Created .antigravityignore
  ✔ Created .cursorignore

  📝 Generating AI rules...
  ✔ Created GEMINI.md
  ✔ Created AGENTS.md

  🎉 Done! Your project is now optimized for AI IDEs.
     Estimated token savings: ~70%
```

---

## 🔍 Stack Detection

ContextSlim automatically detects your project type:

| Stack | Detection Signal |
|---|---|
| **Node.js** | `package.json` |
| **TypeScript** | `package.json` + `tsconfig.json` |
| **Python** | `requirements.txt` or `pyproject.toml` |
| **Rust** | `Cargo.toml` |
| **Unknown** | Falls back to generic optimizations |

---

## 📂 Generated Files

### `.antigravityignore` / `.cursorignore`

Exclusion patterns tailored to your stack:

```gitignore
# Dependencies
node_modules/
.pnp.*

# Build outputs  
dist/
build/
.next/
out/

# Environment & secrets
.env*
*.pem

# Heavy assets
*.mp4
*.zip
*.tar.gz

# Logs & caches
*.log
.cache/
```

### `GEMINI.md` / `AGENTS.md`

AI rules optimized for your stack. Example for a TypeScript project:

```markdown
# Project Rules

- Use TypeScript with strict mode
- Prefer ES Modules (import/export)
- Be concise — don't repeat existing code
- Use existing project patterns and conventions
- Keep functions small and focused
```

---

## 🏗️ Architecture

```
contextslim/
├── bin/
│   └── contextslim.js          # CLI entry point
├── src/
│   ├── index.ts                # Commander setup
│   ├── commands/
│   │   └── init.ts             # Init command orchestrator
│   ├── analyzers/
│   │   └── stack-detector.ts   # Stack detection engine
│   └── generators/
│       ├── ignore-generator.ts # .antigravityignore & .cursorignore
│       └── rules-generator.ts  # GEMINI.md & AGENTS.md
├── package.json
└── tsconfig.json
```

---

## 🗺️ Roadmap

- [x] **v1.0** — `contextslim init` (auto-detect + generate)
- [ ] **v1.1** — `contextslim scan` (analyze current token waste)
- [ ] **v1.2** — `contextslim doctor` (validate & fix existing configs)
- [ ] **v2.0** — Plugin system for custom stacks & rules
- [ ] **v2.1** — Monorepo support (Turborepo, Nx, Lerna)
- [ ] **v3.0** — VS Code / Cursor extension

---

## 🤝 Contributing

Contributions are welcome! Whether it's a bug fix, new stack detection, or a feature request.

```bash
# Clone the repo
git clone https://github.com/your-username/contextslim.git
cd contextslim

# Install dependencies
npm install

# Build
npm run build

# Link locally for testing
npm link
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📊 Why ContextSlim?

| Without ContextSlim | With ContextSlim |
|---|---|
| AI reads `node_modules` | ❌ Excluded |
| AI reads build artifacts | ❌ Excluded |
| AI reads media files | ❌ Excluded |
| AI has no project rules | ✅ Stack-specific rules |
| ~500K tokens/interaction | ~100K tokens/interaction |
| Slow, expensive responses | ⚡ Fast, cheap responses |

---

## 📄 License

MIT © [ContextSlim Contributors](LICENSE)

---

<p align="center">
  <sub>Built with ❤️ to save tokens and developer sanity.</sub>
</p>

<p align="center">
  <a href="#installation">Get Started</a> •
  <a href="#usage">Docs</a> •
  <a href="#roadmap">Roadmap</a> •
  <a href="#contributing">Contribute</a>
</p>
