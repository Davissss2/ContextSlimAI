# Contributing to ContextSlim

First off, thanks for taking the time to contribute! ContextSlim is a community-driven tool to optimize AI coding contexts.

## How to Contribute

### 1. Reporting Bugs
- Use the Bug Report template when opening an issue.
- Please include your Node.js version, OS, and the exact command that failed.

### 2. Suggesting Features
- We love new ideas! Open a Feature Request issue detailing your idea.
- If it involves supporting a new framework/language, please list the key config files that identify that stack.

### 3. Submitting Pull Requests
1. Clone the repository: `git clone https://github.com/Davissss2/ContextSlimAI.git`
2. Create a new branch: `git checkout -b feature/my-awesome-feature`
3. Install dependencies: `npm install`
4. Make your changes in the `src/` directory.
5. Build to verify no TypeScript errors: `npm run build`
6. Test your changes locally using `node ./bin/contextslim.js <command>`
7. Commit your changes and open a PR!

## Development Guidelines
- Always use TypeScript with strict mode.
- ContextSlim is meant to be lightweight. Please avoid bringing in heavy dependencies unless strictly necessary.
- If you're adding support for a new IDE, ensure the generated file only hides *irrelevant* files to avoid breaking essential AI logic.
