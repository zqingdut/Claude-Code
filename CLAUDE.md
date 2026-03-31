# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Verified development commands

- This repository snapshot does **not** include a root `package.json`, lockfile, README, or repo-level lint/test config, so there are no verified `build` / `lint` / `test` commands to rely on from the workspace itself.
- The runtime clearly targets:
  - **Node.js 18+** (`setup.ts` exits on older versions)
  - **Bun-aware builds/runtime paths** (`bun:bundle` is used throughout the codebase)
- Before suggesting or running any project-wide build/test command, first verify whether the missing manifest/config files exist elsewhere in the user’s real checkout.

## High-level architecture

This codebase is the source for a large TypeScript/Bun-based CLI application with an interactive REPL/TUI, a tool-calling runtime, slash commands, background tasks, agent support, MCP integration, and several optional feature-gated subsystems.

### Startup flow

- `entrypoints/cli.tsx`
  - Thin bootstrap entrypoint.
  - Handles fast paths like `--version`, background-session commands, bridge/daemon modes, worktree/tmux fast paths, and then loads the full CLI.
- `main.tsx`
  - Main CLI composition root.
  - Initializes config, telemetry, permissions, plugins, bundled skills, MCP resources, session state, startup migrations, and interactive vs non-interactive execution.
  - Wires together command registration, rendering, resume flows, and session bootstrap.
- `setup.ts`
  - Per-session environment setup.
  - Validates runtime requirements, sets cwd/project root, initializes hooks/watchers, handles `--worktree`, starts background services, prefetches command/plugin state, and enforces dangerous permission-mode constraints.

### Conversation / model execution pipeline

- `query.ts`
  - Core assistant turn loop.
  - Owns message normalization, context/token budgeting, compact/recovery logic, tool execution orchestration, stop hooks, and continuation behavior across multi-step tool-using turns.
- `context.ts`
  - Builds cached conversation context injected into prompts.
  - Pulls git snapshot info and discovered `CLAUDE.md` / memory files into the user/system context.
- `Tool.ts`
  - Core type definitions for tool contracts and `ToolUseContext`.
  - Important because most runtime wiring flows through this context object.

### Commands layer

- `commands.ts`
  - Central registry for slash/local commands.
  - Combines built-in commands, dynamically loaded skill commands, bundled skills, and plugin-provided commands.
  - Many commands are feature-gated with `bun:bundle` flags or runtime environment checks.
- `commands/`
  - One directory per command area.
  - Contains both user-facing slash commands and utility/admin flows (auth, config, review, plan, resume, MCP, plugin management, worktree/session flows, etc.).

### Tools layer

- `tools.ts`
  - Source of truth for which tools are available in the current environment.
  - Assembles the tool list from core tools plus feature-gated tools, MCP/resource tools, planning/task tools, worktree tools, and platform-specific additions.
- `tools/`
  - One directory per tool implementation.
  - Key categories:
    - file/search tools (`FileReadTool`, `FileEditTool`, `GlobTool`, `GrepTool`, etc.)
    - execution tools (`BashTool`, `PowerShellTool`)
    - orchestration tools (`AgentTool`, `SkillTool`, plan/worktree/task tools)
    - web/MCP/resource tools
- Tool availability is not static: it depends on feature flags, environment, permission mode, MCP connections, and task-system state.

### Tasks / background execution

- `tasks.ts`
  - Registry for executable task types.
- `tasks/`
  - Implementations for background/local/remote/agent tasks.
  - Includes shell tasks, local agent tasks, remote agent tasks, and feature-gated workflow/monitor tasks.
- Background execution is a first-class concept in this codebase; don’t assume all work happens synchronously in the main REPL turn.

### Interactive UI

- `main.tsx`, `interactiveHelpers.tsx`, `replLauncher.tsx`
  - Drive interactive CLI startup and REPL lifecycle.
- `components/`, `screens/`, `hooks/`, `ink/`
  - Ink/React TUI implementation.
  - `components/` contains reusable UI pieces, permission dialogs, prompt input, diff views, MCP/agent/task UI, etc.
  - `screens/` contains full-screen flows like REPL/resume/doctor.
  - `hooks/` contains UI and session hooks.
  - `ink/` contains terminal rendering helpers and lower-level TUI plumbing.
- `main.tsx` is very large and acts as a practical integration hub, so prefer tracing feature-specific behavior outward from its imports rather than trying to understand it linearly top-to-bottom.

### Skills and plugins

- `skills/`
  - Loads dynamic skills from skill directories and bundled skills shipped with the app.
  - Skill commands are surfaced into the command registry and can also affect prompting/behavior.
- `plugins/` and `services/plugins/`
  - Plugin discovery, installation, marketplace state, caching, hot reload, and plugin CLI integration.
- `plugins/builtinPlugins.ts` differentiates built-in plugins from bundled skills; they are related but not the same concept.

### MCP / remote / bridge

- `services/mcp/`, `commands/mcp/`, `entrypoints/mcp.ts`
  - MCP config, client/resource loading, server wiring, and command surface.
- `bridge/`, `remote/`, `server/`
  - Remote-control / bridge session infrastructure, websocket/session transport, direct connect, and remote execution plumbing.
- `entrypoints/cli.tsx` contains multiple specialized startup fast paths for remote-control, daemon, and background-session flows, so CLI behavior depends heavily on argv.

### State, config, and persistence

- `bootstrap/state.js` (imported broadly from TS source) is the shared session bootstrap/state backbone referenced by startup, tools, context, and command logic.
- `state/`
  - App state store and mutation helpers.
- `services/SessionMemory/`, `memdir/`, `history.ts`
  - Session-local memory/history and related prompt/context support.
- `migrations/`
  - Startup migrations for settings/model defaults/feature transitions.

## Structural patterns to expect

- **Heavy feature-gating via `bun:bundle`**: many modules are conditionally required for dead-code elimination. Check feature gates before assuming a code path is active.
- **Dynamic imports to avoid startup cost and circular dependencies**: many subsystems intentionally load lazily.
- **Large integration hubs**: `main.tsx`, `commands.ts`, `tools.ts`, `query.ts`, and `setup.ts` are the best entry points for understanding system behavior.
- **Environment-sensitive behavior**: interactive vs non-interactive, ant/internal vs external, bare mode, worktree mode, remote mode, and permission mode all materially change execution.

## Practical navigation guide

When changing behavior, start from the layer that owns it:

- CLI startup / argv dispatch: `entrypoints/cli.tsx`, `main.tsx`, `setup.ts`
- slash commands: `commands.ts` + the relevant file in `commands/`
- tool availability / tool execution: `tools.ts`, `Tool.ts`, relevant file in `tools/`
- model turn loop / multi-step assistant behavior: `query.ts`
- context injection / CLAUDE.md loading / git snapshot context: `context.ts`
- background tasks: `tasks.ts` + `tasks/`
- TUI rendering / dialogs: `components/`, `screens/`, `interactiveHelpers.tsx`
- skills / plugin-provided behavior: `skills/`, `plugins/`, `services/plugins/`
- MCP / remote control / bridge flows: `services/mcp/`, `bridge/`, `remote/`, `server/`
