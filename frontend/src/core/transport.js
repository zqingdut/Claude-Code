export class MockTransport {
  constructor(events) {
    this.events = events;
    this.intervalId = null;
  }

  connect({ onStatus, onEvent }) {
    onStatus({
      state: 'connected',
      label: 'Mock transport online'
    });

    let cursor = 0;
    this.intervalId = window.setInterval(() => {
      const event = this.events[cursor % this.events.length];
      cursor += 1;
      onEvent(event);
    }, 6000);
  }

  disconnect() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async sendIntent() {
    return { ok: true };
  }
}

export class BrowserRuntimeSseTransport {
  constructor(url) {
    this.url = url;
    this.source = null;
  }

  connect({ onStatus, onEvent }) {
    try {
      this.source = new EventSource(this.url);
      const eventTypes = [
        'session.snapshot',
        'session.meta',
        'message.created',
        'message.updated',
        'tool.started',
        'tool.progress',
        'tool.completed',
        'permission.requested',
        'permission.resolved',
        'task.updated',
        'mcp.updated',
        'command.registered',
        'transport.status'
      ];
      this.source.addEventListener('open', () => {
        onStatus({
          state: 'connected',
          label: `Connected to ${this.url}`
        });
      });
      eventTypes.forEach(type => {
        this.source.addEventListener(type, message => {
          try {
            onEvent(JSON.parse(message.data));
          } catch {
            onStatus({
              state: 'error',
              label: `Received invalid SSE payload for ${type}`
            });
          }
        });
      });
      this.source.onerror = () => {
        onStatus({
          state: 'error',
          label: 'SSE transport error'
        });
      };
    } catch {
      onStatus({
        state: 'error',
        label: 'Failed to initialize SSE transport'
      });
    }
  }

  disconnect() {
    this.source?.close();
  }

  async sendIntent(intent) {
    try {
      const url = new URL(this.url);
      url.pathname = '/intents';
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(intent)
      });
      if (!response.ok) {
        const payload = await safeJson(response);
        return {
          ok: false,
          error: payload?.error || `HTTP ${response.status}`
        };
      }
      const payload = await response.json();
      return {
        ok: Boolean(payload.ok),
        error: payload?.error
      };
    } catch {
      return {
        ok: false,
        error: 'Failed to reach runtime relay'
      };
    }
  }
}

export class BrowserRuntimeTransport {
  constructor(url) {
    this.url = url;
    this.socket = null;
  }

  connect({ onStatus, onEvent }) {
    try {
      this.socket = new WebSocket(this.url);
      this.socket.addEventListener('open', () => {
        onStatus({
          state: 'connected',
          label: `Connected to ${this.url}`
        });
      });
      this.socket.addEventListener('message', message => {
        try {
          const event = JSON.parse(message.data);
          onEvent(event);
        } catch {
          onStatus({
            state: 'error',
            label: 'Received invalid runtime event payload'
          });
        }
      });
      this.socket.addEventListener('close', () => {
        onStatus({
          state: 'disconnected',
          label: 'Runtime transport closed'
        });
      });
      this.socket.addEventListener('error', () => {
        onStatus({
          state: 'error',
          label: 'WebSocket transport error'
        });
      });
    } catch {
      onStatus({
        state: 'error',
        label: 'Failed to initialize runtime transport'
      });
    }
  }

  disconnect() {
    this.socket?.close();
  }

  async sendIntent() {
    return {
      ok: false,
      error: 'WebSocket transport does not support browser intents yet'
    };
  }
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
