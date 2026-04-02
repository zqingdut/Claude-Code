# Browser Frontend Architecture

## Goal
Add a browser UI that can drive the existing Claude Code runtime without replacing the current CLI/TUI core.

## What the new frontend covers
- Transcript-first workspace for messages, tool use, tool results, and approvals.
- Dedicated surfaces for commands, tools, tasks, MCP servers, plugins, agents, and settings.
- A persistent inspector panel for large payloads like diffs, file edits, task logs, permission details, and MCP capability metadata.

## Runtime mapping
- Session bootstrap: `entrypoints/cli.tsx`, `main.tsx`, `setup.ts`
- Conversation loop: `query.ts`, `context.ts`
- Commands: `commands.ts`, `commands/`
- Tools: `tools.ts`, `tools/`
- Background execution: `tasks.ts`, `tasks/`
- Remote transport: `bridge/`, `remote/`, `server/`
- Existing UI semantics to preserve: `components/`, `screens/`, `components/permissions/`, `components/tasks/`, `components/mcp/`

## Recommended integration path
1. Add a transport adapter that exposes session events to the browser.
   The best candidates are `server/createDirectConnectSession.ts`, `server/directConnectManager.ts`, `bridge/replBridge.ts`, and `remote/SessionsWebSocket.ts`.
2. Normalize runtime events into a browser-safe schema.
   Messages, tool progress, permission requests, task updates, MCP status, and session metadata should stream as typed events instead of raw TUI fragments.
3. Keep command and tool ownership in the current runtime.
   The browser should submit intents, not reimplement business logic already encoded in `commands/` or `tools/`.
4. Reuse interaction models from the TUI.
   Permission dialogs, task detail views, and MCP server panels already exist conceptually in `components/`; the web UI should mirror those states.

## Included prototype
`frontend/` is a static control-surface prototype. It is intentionally build-free so it can live inside this snapshot now. The next implementation step is to replace its mock state with a transport client wired into the runtime layers above.
