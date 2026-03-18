---
description: General rules and instructions for Antigravity
---
# Antigravity General Rules

## General Guidelines

- **Token Optimization Priority**: Read only the necessary context. Do not read entire directories or large lockfiles unless explicitly requested.
- **Use AI-Optimized Commands**: When exploring the terminal, PREFER `npx contextslim ls [dir]` instead of `ls`. When reading files, PREFER `npx contextslim cat <file>` instead of `cat`. When making text searches, PREFER `npx contextslim grep <query>` instead of `grep` or `find`.
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
- Always prioritize using specific builtin tools like `grep_search` and `find_by_name` over bash commands.
- Use `npx contextslim` terminal wrappers if you must use bash exploration.
- When editing blocks, use `replace_file_content` instead of multi-edit unless strictly non-contiguous.
- Keep line ranges tight to save tokens.