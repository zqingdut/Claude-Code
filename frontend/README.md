# Frontend Control Surface

This directory now contains a browser-facing control surface for the repository, organized as a real application foundation instead of a single mock page.

## Structure
- `index.html`: shell markup
- `styles.css`: responsive visual system
- `src/main.js`: app bootstrap
- `src/core/`: store, router, transport abstractions, and runtime event reducers
- `src/data/`: mock runtime snapshot and event stream
- `src/ui/`: renderers and HTML template helpers
- `src/contracts/runtime-events.json`: browser runtime event contract

## Run locally
Use any static file server from the repo root, for example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/frontend/`.

## Transport modes
- Default: uses mock runtime data so the UI is fully interactive without backend wiring
- WebSocket mode: `http://localhost:8000/frontend/?ws=ws://localhost:PORT`
- SSE mode: `http://localhost:8000/frontend/?sse=http://127.0.0.1:43137/events`

## Local runtime relay
There is now a lightweight SSE relay in `server/browserRuntimeRelay.ts`.

Enable it in the app process with:

```bash
export CLAUDE_CODE_BROWSER_RELAY=1
export CLAUDE_CODE_BROWSER_RELAY_PORT=43137
```

Then point the frontend at:

```text
http://localhost:8000/frontend/?sse=http://127.0.0.1:43137/events
```

The relay publishes browser-safe runtime events from direct-connect and remote-session managers.

## Browser intents
When the SSE relay is active, the browser UI can also send runtime intents through `POST /intents`.

Current intents:
- `prompt.submit`
- `permission.respond`
- `session.interrupt`

The current UI wires prompt submit and permission allow/deny through this path.
