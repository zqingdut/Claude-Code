import { createRouter } from './core/router.js';
import { reduceRuntimeEvent } from './core/runtimeState.js';
import { createStore } from './core/store.js';
import { BrowserRuntimeSseTransport, BrowserRuntimeTransport, MockTransport } from './core/transport.js';
import { createMockEventStream, createMockSnapshot } from './data/mockRuntime.js';
import { renderApp } from './ui/render.js';

const runtimeSnapshot = createMockSnapshot();
const store = createStore({
  ...runtimeSnapshot,
  view: window.location.hash.replace('#', '') || 'workspace',
  selectedMessageId: runtimeSnapshot.messages[2].id,
  filters: {
    query: '',
    status: 'all'
  },
  transportStatus: {
    state: 'connecting',
    label: 'Connecting to mock bridge'
  }
});

const router = createRouter(view => {
  store.setState(current => ({
    ...current,
    view
  }));
});

const transport = shouldUseSocket()
  ? new BrowserRuntimeTransport(getSocketUrl())
  : shouldUseSse()
    ? new BrowserRuntimeSseTransport(getSseUrl())
  : new MockTransport(createMockEventStream());

function shouldUseSocket() {
  const params = new URLSearchParams(window.location.search);
  return params.has('ws');
}

function getSocketUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ws');
}

function shouldUseSse() {
  const params = new URLSearchParams(window.location.search);
  return params.has('sse');
}

function getSseUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('sse');
}

function bindDom() {
  document.querySelectorAll('[data-view]').forEach(button => {
    button.addEventListener('click', () => router.navigate(button.dataset.view));
  });

  const searchInput = document.querySelector('[data-global-search]');
  searchInput.addEventListener('input', event => {
    store.setState(current => ({
      ...current,
      filters: {
        ...current.filters,
        query: event.target.value
      }
    }));
  });

  document.querySelectorAll('[data-status-filter]').forEach(button => {
    button.addEventListener('click', () => {
      const status = button.dataset.statusFilter;
      store.setState(current => ({
        ...current,
        filters: {
          ...current.filters,
          status
        }
      }));
    });
  });

  document.addEventListener('click', event => {
    const messageButton = event.target.closest('[data-message-id]');
    if (messageButton) {
      const selectedMessageId = messageButton.dataset.messageId;
      store.setState(current => ({
        ...current,
        selectedMessageId
      }));
      return;
    }

    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) {
      return;
    }

    const action = actionButton.dataset.action;
    if (action === 'new-session') {
      injectMessage('system', 'New browser session forked', 'Session fork created with the same model and permission profile, but a fresh task slate.', ['history.ts', 'resume', 'session'], 'complete');
    } else if (action === 'toggle-command-palette') {
      document.querySelector('[data-command-palette]').showModal();
    } else if (action === 'close-command-palette') {
      document.querySelector('[data-command-palette]').close();
    } else if (action === 'append-event') {
      injectMessage('permission', 'Permission queue advanced', 'A queued approval changed state and the transcript refreshed inline.', ['permissions', 'FileEditTool'], 'running');
    } else if (action === 'simulate-turn') {
      injectMessage('tool', 'Tool batch completed', 'Read, grep, and task output merged into a single browser-safe event stream.', ['FileReadTool', 'GrepTool', 'TaskOutput'], 'complete');
    } else if (action === 'insert-command') {
      document.querySelector('[data-composer-input]').value = '/review --diff main';
    } else if (action === 'send-composer') {
      const value = document.querySelector('[data-composer-input]').value.trim();
      void submitPrompt(value);
    } else if (action === 'session-interrupt') {
      void sendIntent({
        type: 'session.interrupt',
        sessionId: store.getState().session.id,
        payload: {}
      }, 'Interrupt sent from browser UI');
    }
  });

  document.addEventListener('click', event => {
    const intentButton = event.target.closest('[data-intent-action]');
    if (!intentButton) {
      return;
    }
    const action = intentButton.dataset.intentAction;
    const requestId = intentButton.dataset.requestId;
    if (action === 'permission-allow' && requestId) {
      void sendIntent({
        type: 'permission.respond',
        sessionId: store.getState().session.id,
        payload: {
          requestId,
          outcome: 'allow',
          updatedInput: {}
        }
      }, 'Permission approved from browser UI');
    } else if (action === 'permission-deny' && requestId) {
      void sendIntent({
        type: 'permission.respond',
        sessionId: store.getState().session.id,
        payload: {
          requestId,
          outcome: 'deny',
          message: 'Denied from browser UI'
        }
      }, 'Permission denied from browser UI');
    }
  });

  document.addEventListener('click', event => {
    const cardButton = event.target.closest('[data-card-action]');
    if (cardButton) {
      const action = cardButton.dataset.cardAction;
      const intentType = cardButton.dataset.cardIntentType;
      const prompt = cardButton.dataset.cardPrompt || '';
      if (action === 'submit-prompt') {
        void submitPrompt(prompt);
      } else if (action === 'send-intent' && intentType === 'session.interrupt') {
        void sendIntent({
          type: 'session.interrupt',
          sessionId: store.getState().session.id,
          payload: {}
        }, 'Interrupt sent from task card');
      } else if (action === 'prefill-prompt') {
        document.querySelector('[data-composer-input]').value = prompt;
      }
      return;
    }

    const paletteItem = event.target.closest('[data-palette-title]');
    if (!paletteItem) {
      return;
    }
    document.querySelector('[data-composer-input]').value = `Open ${paletteItem.dataset.paletteTitle} and route into ${paletteItem.dataset.paletteOwner}`;
    document.querySelector('[data-command-palette]').close();
  });

  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      document.querySelector('[data-command-palette]').showModal();
    }
    if (event.key === 'Escape' && document.querySelector('[data-command-palette]').open) {
      document.querySelector('[data-command-palette]').close();
    }
  });
}

function injectMessage(kind, title, text, meta, status) {
  store.setState(current => {
    const nextMessage = {
      id: `msg-${Date.now()}`,
      kind,
      title,
      text,
      meta,
      owner: 'browser control surface',
      status,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    return {
      ...current,
      selectedMessageId: nextMessage.id,
      metrics: {
        ...current.metrics,
        messages: current.metrics.messages + 1
      },
      activity: [
        {
          id: `act-${Date.now()}`,
          label: `${kind}.created`,
          summary: title,
          tone: kind === 'permission' ? 'warning' : 'accent'
        },
        ...current.activity
      ].slice(0, 6),
      messages: [nextMessage, ...current.messages]
    };
  });
}

function applyRuntimeEvent(event) {
  store.setState(current => reduceRuntimeEvent(current, event));
}

async function submitPrompt(value) {
  const content = value || '';
  const ok = await sendIntent({
    type: 'prompt.submit',
    sessionId: store.getState().session.id,
    payload: {
      content
    }
  }, 'Prompt submitted from browser UI');

  if (!ok) {
    injectMessage('assistant', 'Prompt queued from browser', content || 'Empty prompt', ['PromptInput', 'query.ts'], 'running');
  }
}

async function sendIntent(intent, successSummary) {
  const result = await transport.sendIntent(intent);
  if (result.ok) {
    injectMessage('system', successSummary, `Intent ${intent.type} accepted by runtime relay.`, ['browser intent', intent.type], 'complete');
    return true;
  }
  injectMessage(
    'system',
    'Browser intent failed',
    result.error || `Intent ${intent.type} was not accepted by the runtime relay.`,
    ['browser intent', intent.type],
    'blocked'
  );
  return false;
}

function bindTransport() {
  transport.connect({
    onStatus(status) {
      store.setState(current => ({
        ...current,
        transportStatus: status
      }));
    },
    onEvent(event) {
      applyRuntimeEvent(event);
    }
  });
}

store.subscribe(renderApp);
bindDom();
renderApp(store.getState());
bindTransport();
