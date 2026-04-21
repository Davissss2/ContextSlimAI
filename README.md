<p align="center">
  <img src="assets/banner.svg" alt="ContextSlim Banner" width="500" />
</p>

# 🧠 ContextSlim

<p align="center">
  <strong>The Ultimate Token Optimizer for AI-Powered IDEs</strong><br>
  <i>Stop burning tokens. Start shipping faster.</i>
</p>

<p align="center">
  <a href="#installation"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square&logo=node.js" alt="Node Version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" /></a>
  <a href="#"><img src="https://img.shields.io/badge/PRs-welcome-ff69b4?style=flat-square" alt="PRs Welcome" /></a>
  <a href="#"><img src="https://img.shields.io/badge/version-1.6.0-purple?style=flat-square" alt="Version" /></a>
</p>

<br/>

> **ContextSlim** is a powerful CLI tool that automatically detects your project stack and provides a suite of **40+ AI-optimized commands**. It generates optimized ignore files, strict AI rules, and custom terminal wrappers to **reduce AI token consumption by up to 95%** in tools like Antigravity, Cursor, GitHub Copilot, and Claude Code.

---

## 💸 Stop Burning Your API Budget

When an AI assistant explores your project, a single careless command (like `cat package-lock.json` or `ls -R node_modules`) can burn **thousands of tokens instantly**. ContextSlim solves this by imposing strict limits and providing summarized, token-efficient outputs tailored specifically for LLM consumption.

### 🌟 Intelligent Token Savings

| Scenario | Raw AI Command | ContextSlim Command | Token Reduction |
| :--- | :--- | :--- | :--- |
| **Code Structure** | Read entire file | `contextslim map` | **~90% 📉** |
| **File Search** | `grep -r "auth" .` | `contextslim grep` | **~80% 📉** |
| **Code Analysis** | Read full file | `contextslim summary`| **~95% 📉** |
| **Git History** | `git log --stat` | `contextslim changes`| **~80% 📉** |
| **Log Debugging** | Read full log file | `contextslim errors` | **~99% 📉** |
| **DB Inspection** | `DESCRIBE table` | `contextslim dbschema`| **~85% 📉** |

**Zero Risk:** Protect your context window from fatal overflows. ContextSlim automatically hides heavy build files, lockfiles, and media sets from your AI's view.

---

## ⚡ One Command to Rule Them All

Start saving tokens instantly with a single command:

```bash
contextslim init
```

ContextSlim analyzes your project, detects the stack (*out of 20+ supported frameworks*), and auto-generates:

*   🔒 **Ignore Files:** `.antigravityignore`, `.cursorignore`, `.gitattributes`
*   📜 **AI Behavior Rules:** `.cursorrules`, `CLAUDE.md`, `.github/copilot-instructions.md`
*   🧠 **Context Awareness:** `.agent/rules/general.md` (Local project context) and Global Antigravity Rules.

---

## 🚀 Installation

```bash
# Install globally (Recommended for IDE integrations)
npm install -g contextslim

# Or use directly with npx (no install needed)
contextslim init
```

*Requires Node.js **≥ 18.0.0***

---

## 🛠️ The Arsenal: 40+ AI-Optimized Commands

ContextSlim replaces standard, verbose terminal outputs with slim, intelligent summaries.

### 🏗️ Codebase Exploration
*   `init` - Auto-detect stack, generate rules and ignore files.
*   `brief` - Generate a ~300-token project summary for instant context.
*   `tree [dir]` - AI-Optimized directory tree (hides noisy folders).
*   `map <file>` - Extract ONLY function/class signatures (~90% savings).
*   `outline [dir]` - Full architectural scanner of ALL source files (~82% savings).
*   `ls [dir]` - Optimized directory listing with counts.

### 📖 Smart File Reading & Analysis
*   `cat <file>` - Reads a file, strips blanks, and safely truncates if >150 lines.
*   `head <file>` - Quick peek at the first N lines.
*   `summary <file>` - 🌟 **NEW:** Structured file stats (imports, exports, error handling, async patterns, TODOs).
*   `config <file>` - 🌟 **NEW:** Reads configs stripping comments and empty lines.
*   `imports <file>` - Extracts ONLY `import`/`require` statements.
*   `types <file>` - Extracts ONLY TypeScript types/interfaces.
*   `todo [dir]` - Finds pending work (`TODO`, `FIXME`) grouped by severity.

### 🔍 Search & Debugging
*   `grep <query>` - Searches files, auto-skipping heavy dirs. Caps at 5 matches/file.
*   `errors <file>` - 🌟 **NEW:** Extracts ONLY error/warning lines from huge log files (~99% savings).
*   `compare <f1> <f2>` - 🌟 **NEW:** Compact git-style diff between two files.
*   `changes [n]` - 🌟 **NEW:** Compact git history summarizing insertions/deletions.

### 🖥️ OS & Infrastructure
*   `sysinfo` - Compact system specs (replaces `uname -a`).
*   `procs` - Formatted process list.
*   `services` - Formatted background services list.
*   `netinfo` / `ports` - Compact network and port mapping.
*   `docker` - Unified, token-light view of containers and images.

### 🗄️ Database Mastery
*   `dbschema <connection>` - Tree-view of DB schemas, tables, and indexes (limits output size).
*   `dbstats <connection>` - Quick metrics on row counts and data size.
*   `dbquery "<query>"` - Executes SQL with strict truncation on wide rows/columns.
*   `dbsample <table>` - Auto-generates `SELECT * LIMIT 10` for quick data peeks.

---

## 🔍 Smart Framework Detection

ContextSlim doesn't guess. It knows exactly what you're building:

*   🟢 **Node/TS:** Next.js, React, Vue, Svelte, Express, NestJS, Astro...
*   🐍 **Python:** Django, FastAPI, Flask...
*   🐘 **PHP:** Laravel, Symfony...
*   💎 **Ruby:** Rails
*   🦀 **Rust**, 🐹 **Go**, ☕ **Java**, 🌐 **.NET**, 📱 **Flutter/Swift** & more.

---

## 🗺️ Roadmap & Ecosystem

*   ✅ **Deep Git Integration** (`changes`, `compare`, `diff`)
*   ✅ **Logs Analysis** (`errors`)
*   ✅ **Config Parsing** (`config`)
*   🔜 **Monorepo Support** (Turborepo / pnpm workspaces context generation)
*   🔜 **Advanced Health Checks** (`status`)

---

## 🤝 Contributing

We welcome contributions to make AI workflows even more efficient!

```bash
git clone https://github.com/Davissss2/ContextSlimAI.git
cd contextslim
npm install
npm run build
contextslim brief
```

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/Built_with-%E2%9D%A4%EF%B8%8F-ff69b4?style=for-the-badge" alt="Built with love" /><br/>
  <sub>Saving tokens and developer sanity globally.</sub>
</p>
