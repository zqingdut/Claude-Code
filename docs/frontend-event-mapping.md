# Frontend Event Mapping

This file maps browser UI surfaces to the runtime modules that should feed them once the transport layer is live.

| Browser Surface | Runtime Owners | Event Types |
|---|---|---|
| Transcript list | `query.ts`, `context.ts`, `main.tsx` | `message.created`, `message.updated` |
| Inspector drawer | `tools/`, `components/messages/`, `components/diff/` | `message.updated`, `tool.completed`, `permission.requested` |
| Live activity feed | `tasks/`, `tools/`, `remote/`, `bridge/` | `tool.started`, `tool.progress`, `task.updated`, `transport.status` |
| Permissions lane | `components/permissions/`, `tools/FileEditTool/`, `tools/BashTool/` | `permission.requested`, `permission.resolved` |
| Commands catalog | `commands.ts`, `commands/` | `command.registered` plus bootstrap snapshot |
| Tools catalog | `tools.ts`, `tools/` | bootstrap snapshot, `tool.started`, `tool.completed` |
| Task center | `tasks.ts`, `tasks/`, `components/tasks/` | `task.updated` |
| MCP panel | `services/mcp/`, `components/mcp/`, `plugins/` | `mcp.updated` |
| Settings page | `setup.ts`, `main.tsx`, settings services | `session.meta`, `transport.status` |

## Transport recommendation
- Bootstrap with `session.snapshot` on first connect.
- Stream deltas afterward.
- Keep browser payloads normalized. Do not send rendered TUI fragments.
- Include stable ids for messages, tasks, permissions, tools, and MCP servers so the browser can reconcile updates instead of re-rendering entire lists.

## Browser intents
- `prompt.submit` routes browser prompt input into the active runtime session.
- `permission.respond` allows browser approval or denial of pending permission requests.
- `session.interrupt` is reserved for browser-side cancel/stop controls.
