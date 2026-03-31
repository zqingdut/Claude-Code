# Claude Code Source Snapshot

This repository is a source snapshot of a large TypeScript/Bun-based CLI application centered around an interactive REPL/TUI, tool calling, slash commands, background tasks, agent workflows, MCP integration, and several feature-gated runtime modes.

> Status note: this workspace snapshot does not currently include a root `package.json`, lockfile, or top-level test/lint configuration. The documentation below is intentionally limited to behavior that can be verified from the source files present in this checkout.

## What this project is

From the code that is present, this project is the source for a CLI application with these major capabilities:

- interactive terminal UI built with Ink/React-style components
- assistant turn execution with multi-step tool use
- slash commands and skill-driven command extensions
- background task execution for shell, local agent, and remote agent work
- MCP integration and resource/tool loading
- plugin and bundled-skill systems
- worktree, bridge/remote-control, daemon, and background-session flows

## Verified runtime requirements

The following requirements are directly confirmed from source:

- **Node.js 18+ is required** (`setup.ts` exits on lower versions)
- **Bun-aware build/runtime paths are used heavily** (`bun:bundle` feature gates are used throughout the codebase)

Because the root manifest/config files are missing from this snapshot, project-wide build, lint, and test commands are **not documented here as verified commands**.

## Entry points and startup flow

The startup path is split across three main files:

- `entrypoints/cli.tsx`
  - bootstrap entrypoint
  - handles fast paths such as `--version`, bridge/remote-control, daemon, background session commands, and worktree/tmux startup
  - loads the full CLI only when no fast path applies
- `main.tsx`
  - main composition root for the CLI
  - initializes config, telemetry, permissions, plugins, skills, MCP state, session state, migrations, and interactive/non-interactive execution
  - wires command loading, rendering, session restore, and runtime state together
- `setup.ts`
  - per-session setup layer
  - validates runtime requirements, sets cwd/project root, initializes hooks/watchers, handles worktree setup, starts background services, and enforces bypass-permission safety rules

## Core architecture

### 1. Query and assistant execution

- `query.ts`
  - core assistant turn loop
  - handles message normalization, token budgeting, compact/recovery logic, tool execution orchestration, and turn continuation
- `context.ts`
  - builds cached system/user context injected into each conversation
  - includes git snapshot information and discovered `CLAUDE.md` / memory content
- `Tool.ts`
  - defines tool contracts and the `ToolUseContext` shared across tool execution

### 2. Commands

- `commands.ts`
  - central registry for built-in commands
  - merges built-in commands with bundled skills, skill-directory commands, and plugin-provided commands
- `commands/`
  - implementation directory for user-facing and internal command areas
  - includes auth, config, review, plan, resume, MCP, plugin, task, session, and terminal workflows

The command registry shows this CLI exposes a large slash-command surface including areas like `help`, `config`, `mcp`, `plugin`, `resume`, `review`, `tasks`, `status`, `vim`, `plan`, `permissions`, and more.

### 3. Tools

- `tools.ts`
  - source of truth for tool availability in the current environment
  - assembles core tools plus feature-gated tools, planning/task tools, MCP/resource tools, and platform-specific variants
- `tools/`
  - one directory per tool implementation

Key tool categories include:

- file and search tools
- shell execution tools
- orchestration tools such as Agent, Skill, plan/worktree/task tools
- web and MCP/resource tools

Tool availability is dynamic and depends on feature gates, runtime environment, permission mode, and MCP/task state.

### 4. Background tasks

- `tasks.ts`
  - task type registry
- `tasks/`
  - implementations for local shell, local agent, remote agent, and other task types

Background execution is a first-class runtime concept in this codebase.

### 5. Interactive UI

- `main.tsx`, `interactiveHelpers.tsx`, `replLauncher.tsx`
  - interactive startup and REPL lifecycle
- `components/`, `screens/`, `hooks/`, `ink/`
  - terminal UI building blocks, full-screen flows, UI/session hooks, and lower-level Ink terminal plumbing

`main.tsx` is a large integration hub. When debugging behavior, it is usually more effective to start from the feature you care about and follow imports outward than to read the file linearly.

### 6. Skills, plugins, and extensibility

- `skills/`
  - dynamic skill loading and bundled skill registration
- `plugins/` and `services/plugins/`
  - plugin discovery, installation, caching, CLI integration, and hot reload

Skills and plugins are separate but related extension systems. `commands.ts` and `tools.ts` are the best top-level places to see how they become visible to the runtime.

### 7. MCP, remote, and bridge flows

- `services/mcp/`, `commands/mcp/`, `entrypoints/mcp.ts`
  - MCP configuration, clients, command/resource loading, and related command surface
- `bridge/`, `remote/`, `server/`
  - remote-control, transport/session infrastructure, and direct-connect or remote execution flows

`entrypoints/cli.tsx` contains several specialized argv-based fast paths for these modes, so startup behavior changes significantly depending on how the CLI is invoked.

## Repository structure at a glance

This snapshot is organized by subsystem rather than by a single monolithic `src/` directory. Major top-level areas include:

- `commands/` — slash and local command implementations
- `tools/` — tool implementations and tool-specific UI/helpers
- `tasks/` — background task implementations
- `components/`, `screens/`, `hooks/`, `ink/` — terminal UI
- `skills/` — bundled and dynamic skill loading
- `plugins/`, `services/plugins/` — plugin systems
- `services/` — larger runtime services (analytics, MCP, API, policy, etc.)
- `bridge/`, `remote/`, `server/` — remote-control and session infrastructure
- `bootstrap/`, `state/`, `context/` — shared runtime/session state and prompt context
- `migrations/` — startup/settings migrations

## Working with this snapshot

If you need to understand or modify behavior, start from the owning layer:

- startup / argv dispatch: `entrypoints/cli.tsx`, `main.tsx`, `setup.ts`
- command behavior: `commands.ts` and the relevant file in `commands/`
- tool behavior: `tools.ts`, `Tool.ts`, and the relevant file in `tools/`
- assistant turn execution: `query.ts`
- prompt/context injection: `context.ts`
- background execution: `tasks.ts` and `tasks/`
- terminal UI flows: `components/`, `screens/`, `interactiveHelpers.tsx`
- MCP/remote flows: `services/mcp/`, `bridge/`, `remote/`, `server/`

## Documentation in this repository

- English: `README.md`
- 简体中文: `README.zh-CN.md`
- Claude Code repository guidance: `CLAUDE.md`
