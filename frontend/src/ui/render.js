import { activityItem, card, messageItem, pill, settingCard } from './templates.js';

function kindLabel(kind) {
  return {
    assistant: 'Assistant',
    tool: 'Tool',
    system: 'System',
    permission: 'Permission',
    task: 'Task'
  }[kind] || 'Event';
}

export function renderApp(state) {
  document.querySelector('[data-app-title]').textContent = state.app.title;
  document.querySelector('[data-view-title]').textContent = titleForView(state.view);
  document.querySelector('[data-branch]').textContent = state.app.branch;
  document.querySelector('[data-mode]').textContent = state.app.mode;
  document.querySelector('[data-transport]').textContent = state.transportStatus.label;
  document.querySelector('[data-message-count]').textContent = String(state.metrics.messages);
  document.querySelector('[data-task-count]').textContent = String(state.metrics.tasks);
  document.querySelector('[data-mcp-count]').textContent = String(state.metrics.mcpServers);
  document.querySelector('[data-permission-count]').textContent = String(state.metrics.permissions);
  document.querySelector('[data-session-name]').textContent = state.session.name;
  document.querySelector('[data-session-mode]').textContent = `${state.app.branch} / ${state.app.mode} / ${state.transportStatus.state}`;
  const searchInput = document.querySelector('[data-global-search]');
  if (searchInput !== document.activeElement) {
    searchInput.value = state.filters.query;
  }

  renderNav(state.view);
  renderStatusFilters(state.filters.status);
  renderTranscript(state);
  renderInspector(state);
  renderCards('[data-commands-list]', state.commands, 'command', state.filters.query);
  renderCards('[data-tools-list]', state.tools, 'tool', state.filters.query);
  renderCards('[data-tasks-list]', state.tasks, 'task', state.filters.query);
  renderCards('[data-mcp-list]', state.mcpServers, 'mcp', state.filters.query);
  renderSettings(state.settings);
  renderActivity(state.activity);
  renderPalette(state);
  toggleViewPanels(state.view);
}

function renderNav(view) {
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === view);
  });
}

function renderTranscript(state) {
  const root = document.querySelector('[data-transcript-list]');
  root.innerHTML = '';
  visibleMessages(state).forEach(message => {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = `message ${message.id === state.selectedMessageId ? 'active' : ''}`;
    node.dataset.messageId = message.id;
    node.innerHTML = messageItem(message, message.id === state.selectedMessageId, kindLabel(message.kind));
    root.appendChild(node);
  });
}

function renderInspector(state) {
  const selected = visibleMessages(state).find(message => message.id === state.selectedMessageId) || visibleMessages(state)[0] || state.messages[0];
  document.querySelector('[data-inspector-title]').textContent = selected.title;
  document.querySelector('[data-inspector-body]').innerHTML = `
    <div class="detail-grid">
      <div class="row">
        <span class="meta-label">Surface</span>
        <strong>${kindLabel(selected.kind)}</strong>
      </div>
      <div class="row">
        <span class="meta-label">Status</span>
        <p>${selected.status}</p>
      </div>
      <div class="row">
        <span class="meta-label">Summary</span>
        <p>${selected.text}</p>
      </div>
      <div class="row">
        <span class="meta-label">Owning modules</span>
        <p>${selected.meta.join(', ')}</p>
      </div>
      ${renderInspectorActions(selected)}
      <div class="row">
        <span class="meta-label">Product UI treatment</span>
        <p>Keep the transcript in the center, pin fast decisions inline, and move verbose payloads like diffs, shell output, and MCP metadata into inspector tabs.</p>
      </div>
    </div>
  `;
}

function renderInspectorActions(selected) {
  if (selected.kind === 'permission' && selected.rawPayload?.requestId) {
    return `
      <div class="row">
        <span class="meta-label">Actions</span>
        <div class="inspector-actions">
          <button class="ghost" type="button" data-intent-action="permission-allow" data-request-id="${selected.rawPayload.requestId}">Allow</button>
          <button class="ghost" type="button" data-intent-action="permission-deny" data-request-id="${selected.rawPayload.requestId}">Deny</button>
        </div>
      </div>
    `;
  }
  return '';
}

function renderCards(selector, items, label, query) {
  const root = document.querySelector(selector);
  const filtered = visibleCards(items, query);
  root.innerHTML = filtered.length > 0
    ? filtered.map(item => card(item, label, cardAction(label, item))).join('')
    : `<article class="empty-state"><p>No ${label} items match the current search.</p></article>`;
}

function renderSettings(settings) {
  document.querySelector('[data-settings-grid]').innerHTML = settings.map(setting => settingCard(setting)).join('');
}

function renderActivity(activity) {
  document.querySelector('[data-activity-feed]').innerHTML = activity.map(item => activityItem(item)).join('');
}

function renderPalette(state) {
  const allItems = visibleCards([...state.commands, ...state.tools], state.filters.query);
  document.querySelector('[data-palette-grid]').innerHTML = allItems.map(item => `
    <button class="card palette-card" type="button" data-palette-title="${item.title}" data-palette-owner="${item.owner}">
      <div class="card-head">
        <span class="card-title">${item.title}</span>
        ${pill('jump', 'neutral')}
      </div>
      <p>${item.summary}</p>
      <div class="card-meta">${pill(item.owner, 'info')}</div>
    </button>
  `).join('');
}

function toggleViewPanels(view) {
  document.querySelectorAll('[data-panel]').forEach(panel => {
    panel.classList.toggle('hidden', panel.dataset.panel !== view && !(view === 'workspace' && panel.dataset.panel === 'workspace'));
  });
}

function titleForView(view) {
  return {
    workspace: 'Workspace',
    commands: 'Commands',
    tools: 'Tools',
    tasks: 'Tasks',
    mcp: 'MCP',
    settings: 'Settings'
  }[view] || 'Workspace';
}

function renderStatusFilters(activeStatus) {
  document.querySelectorAll('[data-status-filter]').forEach(button => {
    button.classList.toggle('active', button.dataset.statusFilter === activeStatus);
  });
}

function visibleMessages(state) {
  return state.messages.filter(message => {
    if (state.filters.status !== 'all' && message.status !== state.filters.status) {
      return false;
    }
    return matchesQuery(state.filters.query, [
      message.title,
      message.text,
      message.owner,
      ...(message.meta || [])
    ]);
  });
}

function visibleCards(items, query) {
  if (!query) {
    return items;
  }
  return items.filter(item => matchesQuery(query, [item.title, item.summary, item.owner, ...(item.tags || [])]));
}

function matchesQuery(query, fields) {
  const normalized = (query || '').trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return fields.some(field => String(field || '').toLowerCase().includes(normalized));
}

function cardAction(label, item) {
  if (label === 'command') {
    return {
      type: 'submit-prompt',
      label: 'Run',
      prompt: item.title
    };
  }
  if (label === 'tool') {
    return {
      type: 'prefill-prompt',
      label: 'Use',
      prompt: `Use ${item.title} for the current task`
    };
  }
  if (label === 'task') {
    if (item.status === 'running') {
      return {
        type: 'send-intent',
        intentType: 'session.interrupt',
        label: 'Interrupt'
      };
    }
    return {
      type: 'prefill-prompt',
      label: 'Inspect',
      prompt: `Inspect task ${item.title} and report current status`
    };
  }
  if (label === 'mcp') {
    return {
      type: 'submit-prompt',
      label: 'Inspect',
      prompt: `/mcp ${item.title}`
    };
  }
  return null;
}
