# Claude Code Source Snapshot

Language: **English** | [简体中文](./README.zh-CN.md)

This repository is a source snapshot of a large TypeScript/Bun-based CLI application with an interactive REPL/TUI, tool calling, slash commands, MCP integration, background tasks, remote/bridge flows, and a new browser control surface.

> Status note: this checkout does not include a root `package.json`, lockfile, or top-level build/test config. The commands and usage below are limited to behavior verified from the files present here.

## What Is Included

The code in this snapshot clearly supports:

- Ink/React-style terminal UI
- assistant turn execution with multi-step tool orchestration
- slash commands, skills, plugins, and MCP servers
- local shell, local agent, and remote agent background tasks
- bridge, direct-connect, and remote session workflows
- a browser-facing control surface in `frontend/`

## Verified Runtime Requirements

- **Node.js 18+** is required, see `setup.ts`
- **Bun-aware build/runtime paths** are used heavily, especially `bun:bundle`

Because the root manifests are missing, project-wide `build`, `lint`, and `test` commands are not documented here as verified commands.

## Repository Layout

The snapshot is organized by subsystem:

- `entrypoints/`, `main.tsx`, `setup.ts`: startup and composition root
- `commands/`, `commands.ts`: slash/local commands
- `tools/`, `tools.ts`, `Tool.ts`: tool registration and execution
- `tasks/`, `tasks.ts`: background task types and implementations
- `components/`, `screens/`, `hooks/`, `ink/`: terminal UI
- `services/mcp/`, `commands/mcp/`: MCP configuration and UI
- `bridge/`, `remote/`, `server/`: transport, direct-connect, remote sessions
- `frontend/`: browser control surface
- `docs/`: frontend architecture and event mapping notes

## Browser Control Surface

The repository now includes a browser UI under `frontend/`. It can consume:

- mock runtime data
- runtime events over SSE
- runtime events over WebSocket

When the local browser relay is enabled, the UI can also send real intents back to the runtime:

- `prompt.submit`
- `permission.respond`
- `session.interrupt`

Current UI entry points include prompt submission, permission allow/deny, interrupt, command-card run actions, and task-card interrupt actions.

## How To Use

### 1. Serve the frontend

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/frontend/
```

This uses mock data and is useful for UI development.

### 2. Enable the local runtime relay

In the process that runs Claude Code, enable the SSE relay:

```bash
export CLAUDE_CODE_BROWSER_RELAY=1
export CLAUDE_CODE_BROWSER_RELAY_PORT=43137
```

The relay lives in `server/browserRuntimeRelay.ts` and publishes browser-safe runtime events from direct-connect and remote-session managers.

### 3. Open the frontend against real runtime events

Once the relay is enabled and a real session is active, open:

```text
http://localhost:8000/frontend/?sse=http://127.0.0.1:43137/events
```

If you want the UI scoped to a specific session, append:

```text
&sessionId=<your-session-id>
```

### 4. Use the connected UI

With SSE mode active, the browser UI can:

- display transcript, activity feed, tasks, MCP servers, tools, and commands from runtime events
- submit prompts through the browser
- approve or deny pending permission requests
- interrupt the current session from the header or a running task card

## Architecture Pointers

If you need to modify behavior, start from the owning layer:

- startup and argv dispatch: `entrypoints/cli.tsx`, `main.tsx`, `setup.ts`
- assistant turn loop: `query.ts`, `context.ts`
- commands: `commands.ts`, `commands/`
- tools: `tools.ts`, `tools/`
- tasks: `tasks.ts`, `tasks/`
- remote/direct-connect/browser relay: `remote/`, `server/`, `bridge/`
- browser UI: `frontend/src/`

## Additional Documentation

- English: `README.md`
- 简体中文: `README.zh-CN.md`
- repository guidance: `CLAUDE.md`
- frontend architecture: `docs/frontend-architecture.md`
- frontend event mapping: `docs/frontend-event-mapping.md`
