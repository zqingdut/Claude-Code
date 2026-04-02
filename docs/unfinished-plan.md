# Unfinished Plan

## Current Status

The repository now includes:

- a browser control surface under `frontend/`
- a browser-safe runtime event adapter in `server/browserRuntimeEvents.ts`
- an SSE relay in `server/browserRuntimeRelay.ts`
- partial browser-to-runtime intents:
  - `prompt.submit`
  - `permission.respond`
  - `session.interrupt`

This is enough for a working control surface, but not enough to claim that every CLI capability is fully productized in the browser.

## Remaining Work

### 1. Replace Prompt-Wrapped Actions With First-Class Intents

These areas still rely on prompt submission instead of dedicated runtime actions:

- command execution from command cards
- MCP inspection and control actions
- tool-specific operations
- task inspection flows that are still prompt-driven

Recommended next intents:

- `command.run`
- `task.inspect`
- `task.stop`
- `mcp.inspect`
- `mcp.reconnect`
- `mcp.toggle`

### 2. Expand Runtime Integration Beyond Direct Connect and Remote Session

The current browser relay is wired into:

- `server/directConnectManager.ts`
- `remote/RemoteSessionManager.ts`

It is not yet wired as a universal event source for every application path. The main CLI composition flow still needs a broader browser-facing integration strategy.

### 3. Add Better Validation and Error Contracts

The relay currently validates basic intent shape and returns error strings, but it should be strengthened with:

- stricter runtime validation per intent type
- structured error codes
- browser-visible retry guidance
- permission response error details when request ids are stale

### 4. Add Dedicated UI Controls For More Runtime Surfaces

The browser UI still needs product-grade controls for:

- MCP server status, reconnect, and enable/disable
- task lifecycle management
- settings updates
- model and permission mode changes
- session switching and scoped session selection

### 5. End-to-End Verification

The current work has file-level and syntax-level verification, but it still needs:

- a documented full local run path
- end-to-end validation with a live session
- confirmation that browser intents work across the intended entry paths
- UX verification for failure states

## Suggested Order

1. Add dedicated intents for task and MCP operations.
2. Strengthen relay validation and error payloads.
3. Wire browser controls into more runtime entry paths.
4. Run end-to-end validation and update docs with verified usage.
