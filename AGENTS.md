# Repository Guidelines

## Project Structure & Module Organization
This repository is a source snapshot of a TypeScript CLI/TUI application. Top-level integration files such as `main.tsx`, `setup.ts`, `query.ts`, `commands.ts`, `tools.ts`, and `tasks.ts` wire the runtime together. Major subsystems live in `commands/`, `tools/`, `tasks/`, `components/`, `screens/`, `services/`, `skills/`, `plugins/`, `bridge/`, `remote/`, and `server/`. Treat these folders as ownership boundaries: command work usually starts in `commands/`, tool behavior in `tools/`, and UI changes in `components/` or `screens/`.

## Build, Test, and Development Commands
This snapshot does not include a root `package.json`, lockfile, or repo-wide lint/test config, so do not invent project-wide commands. Verified requirements are Node.js 18+ and Bun-aware runtime paths. Use lightweight inspection commands while working:

- `rg --files` lists repository files quickly.
- `rg "pattern" commands tools services` finds feature owners.
- `git log --oneline` shows recent commit style.

If your full checkout contains missing manifests, verify the real build, lint, and test commands before documenting or running them.

## Coding Style & Naming Conventions
Follow the existing TypeScript style: 2-space indentation, single quotes, semicolons, and ESM imports. React/Ink components use `PascalCase` file names such as `BashTool.tsx`; utility modules use `camelCase` file names such as `bashPermissions.ts`. Keep comments sparse and purposeful. This codebase uses both Biome and ESLint suppression comments in source, so match the established tool-specific format when exceptions are required.

## Testing Guidelines
No top-level test runner is verified in this snapshot. The only visible spec-style area is `utils/bash/specs/`. Place new tests near the subsystem they cover and prefer descriptive names ending in `.spec.ts` or `.test.ts` when the surrounding module already follows that pattern. Run only confirmed test commands from the real checkout.

## Commit & Pull Request Guidelines
Recent history follows conventional prefixes such as `feat:` and `docs:`. Keep commit subjects short, imperative, and scoped to one change. For pull requests, include a concise summary, affected paths, manual verification steps, and screenshots or terminal captures for UI/TUI changes. Link related issues when available and call out any missing verification caused by this incomplete snapshot.

## Agent-Specific Notes
Start from the owning integration point instead of reading `main.tsx` linearly. Check `CLAUDE.md` before large changes, and verify feature gates such as `bun:bundle` before assuming a code path is active.
