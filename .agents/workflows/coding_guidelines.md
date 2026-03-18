---
description: Standard Coding Guidelines and Context Management
---

# Antigravity Workflow: Coding & Context

## General Guidelines

- **Token Optimization Priority**: Read only the necessary context. Do not read entire directories or large lockfiles unless explicitly requested.
- **Be concise**: Give direct answers. Do not repeat code that already exists in the project unless modifying it.
- **Be modular**: Write small, focused functions with clear responsibilities.
- **Follow existing patterns**: Match the coding style, naming conventions, and patterns already used in this codebase.
- **Prefer edits over rewrites**: When modifying code, show only the changed parts or use strict replacements.

## Stack: Node.js + TypeScript

- Use **ES Modules** (`import`/`export`) — not CommonJS (`require`).
- Prefer `const` over `let`. Never use `var`.
- Use **async/await** over raw Promises or callbacks.
- Use optional chaining (`?.`) and nullish coalescing (`??`).
- Handle errors gracefully with try/catch.
- Define explicit **TypeScript types** for function parameters and return values.
- Use `interface` for object shapes, `type` for unions/intersections.
- Avoid `any` — use `unknown` when the type is truly uncertain.

## Antigravity Specific Instructions
- Use `grep_search` and `find_by_name` to locate files instead of heavy `list_dir` or reading large files.
- When editing exactly 1 contiguous block, use `replace_file_content`.
- Keep line ranges tight to save tokens.
- For new functionalities, verify by running tests or the compiler via `run_command` if safe.