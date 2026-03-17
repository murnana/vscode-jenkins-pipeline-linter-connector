# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code extension that validates Jenkinsfiles by sending them to the Jenkins Pipeline Linter API. Published as `jenkins-pipeline-linter-connector` by janjoerke on the VS Code Marketplace.

## Build & Development Commands

```bash
npm install                    # Install dependencies (also runs postinstall for vscode types)
npm run compile                # One-time TypeScript compilation to out/
npm run watch                  # Watch mode compilation (used during development)
npm test                       # Compile + run tests via VS Code test runner
npm run vscode:prepublish      # Pre-publish compilation
```

For interactive debugging, use the VS Code launch configurations in `.vscode/launch.json`:
- **Extension** — launches a new VS Code window with the extension loaded
- **Extension Tests** — runs the Mocha test suite in the extension host

## Architecture

Single-file extension (`src/extension.ts`) with this flow:

1. Extension activates on command `jenkins.pipeline.linter.connector.validate`
2. Reads configuration from VS Code workspace settings (`jenkins.pipeline.linter.connector.*`)
3. Prompts user for missing config (URL, credentials)
4. Optionally fetches a CSRF crumb token from Jenkins
5. Reads the active editor's file content and POSTs it to the Jenkins Pipeline Linter endpoint
6. Displays validation results in the "Jenkins Pipeline Linter" output channel

Authentication modes: none, basic (user+password), token-based (user+token). CSRF crumb support via `crumbUrl` setting.

## Key Configuration Settings

Defined in `package.json` under `contributes.configuration`: `url`, `user`, `pass`, `token`, `crumbUrl`, `strictssl`.

## Tech Stack

- TypeScript (strict mode, target ES6, CommonJS modules)
- Linting: TSLint (`tslint.json`)
- Test framework: Mocha with TDD interface
- HTTP: `request` library, URL parsing via `url-parse`
- Minimum VS Code engine: ^1.25.0

## Repository Notes

- This is a fork (`murnana-main` branch). Upstream is tracked via `upstream/master`.
- Compiled output goes to `out/` (excluded from git and VS Code search).
- `.vscodeignore` strips source files from the packaged `.vsix`.
