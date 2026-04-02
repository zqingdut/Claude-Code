const state = {
  view: 'workspace',
  selectedMessageId: 'm3',
  messages: [
    {
      id: 'm1',
      kind: 'system',
      title: 'Session bootstrapped',
      text: 'Loaded settings, permissions, telemetry, plugins, MCP configs, and prior session memory.',
      meta: ['main.tsx', 'setup.ts', 'context.ts']
    },
    {
      id: 'm2',
      kind: 'assistant',
      title: 'Tool routing plan',
      text: 'Traced the request through command resolution, then prepared BashTool and FileReadTool for execution.',
      meta: ['commands.ts', 'tools.ts', 'Tool.ts']
    },
    {
      id: 'm3',
      kind: 'tool',
      title: 'BashTool in progress',
      text: 'Foreground shell task is streaming output while permission rules and sandbox mode are applied.',
      meta: ['tools/BashTool', 'tasks/LocalShellTask', 'permissions']
    },
    {
      id: 'm4',
      kind: 'permission',
      title: 'Filesystem permission request',
      text: 'Awaiting approval for edits outside the workspace boundary. Request includes exact path and justification.',
      meta: ['components/permissions', 'tools/FileEditTool']
    },
    {
      id: 'm5',
      kind: 'task',
      title: 'Remote agent attached',
      text: 'A background agent is collecting context while the active transcript remains interactive.',
      meta: ['tasks/RemoteAgentTask', 'components/tasks']
    }
  ],
  commands: [
    {
      title: '/review',
      owner: 'commands/review/',
      summary: 'Run pre-landing review against the current diff and surface findings first.',
      tags: ['code review', 'diff', 'risk']
    },
    {
      title: '/plan',
      owner: 'commands/plan/',
      summary: 'Enter plan mode, manage approvals, and write structured execution plans.',
      tags: ['plan mode', 'approvals', 'workflow']
    },
    {
      title: '/mcp',
      owner: 'commands/mcp/',
      summary: 'Inspect MCP servers, connection status, capabilities, and resource exposure.',
      tags: ['server', 'resource', 'tooling']
    },
    {
      title: '/resume',
      owner: 'commands/resume/',
      summary: 'Restore prior sessions, transcript slices, and PR-linked conversation state.',
      tags: ['session', 'history', 'restore']
    }
  ],
  tools: [
    {
      title: 'BashTool',
      owner: 'tools/BashTool/',
      summary: 'Shell execution, sandbox checks, read-only detection, diff-aware edits, and backgrounding.',
      tags: ['shell', 'sandbox', 'permissions']
    },
    {
      title: 'FileEditTool',
      owner: 'tools/FileEditTool/',
      summary: 'Patch application, permission prompts, and diff previews.',
      tags: ['edit', 'patch', 'diff']
    },
    {
      title: 'AgentTool',
      owner: 'tools/AgentTool/',
      summary: 'Spawn, route, and supervise assistant workers with task ownership.',
      tags: ['agents', 'parallelism', 'routing']
    },
    {
      title: 'MCPTool',
      owner: 'tools/MCPTool/',
      summary: 'Expose third-party tools and resources through MCP client connections.',
      tags: ['mcp', 'extensibility', 'connectors']
    }
  ],
  tasks: [
    {
      title: 'Foreground shell',
      owner: 'tasks/LocalShellTask/',
      summary: 'Streaming command output in the active session.',
      tags: ['running', 'foreground', 'shell']
    },
    {
      title: 'Remote agent',
      owner: 'tasks/RemoteAgentTask/',
      summary: 'Long-running research agent with asynchronous result delivery.',
      tags: ['remote', 'agent', 'async']
    },
    {
      title: 'Dream task',
      owner: 'tasks/DreamTask/',
      summary: 'Deferred generation workflow with status tracking and replay support.',
      tags: ['background', 'queue', 'status']
    }
  ],
  mcp: [
    {
      title: 'GitHub connector',
      owner: 'services/mcp/ + components/mcp/',
      summary: 'Connected, tool list hydrated, channel policy allows read-only operations.',
      tags: ['connected', 'channel', 'resource']
    },
    {
      title: 'VS Code SDK MCP',
      owner: 'services/mcp/vscodeSdkMcp.js',
      summary: 'Used for IDE notifications, file updates, and workspace-aware flows.',
      tags: ['ide', 'editor', 'workspace']
    },
    {
      title: 'Plugin marketplace',
      owner: 'plugins/ + services/plugins/',
      summary: 'Built-in, bundled, and installed plugins with hot reload support.',
      tags: ['plugins', 'skills', 'marketplace']
    }
  ],
  settings: [
    {
      title: 'Permission Mode',
      description: 'Switch between default, plan, bypass, and sandboxed execution modes.',
      value: 'default'
    },
    {
      title: 'Thinking',
      description: 'Adaptive reasoning budget and model selection for current session.',
      value: 'adaptive'
    },
    {
      title: 'Transport',
      description: 'Choose local TUI bridge, direct connect session, or remote runtime.',
      value: 'bridge'
    },
    {
      title: 'Session Persistence',
      description: 'Store conversation state for /resume and restore workflows.',
      value: 'enabled'
    }
  ]
};

const viewTitle = document.getElementById('view-title');
const transcriptList = document.getElementById('transcript-list');
const inspectorTitle = document.getElementById('inspector-title');
const inspectorBody = document.getElementById('inspector-body');
const commandsList = document.getElementById('commands-list');
const toolsList = document.getElementById('tools-list');
const tasksList = document.getElementById('tasks-list');
const mcpList = document.getElementById('mcp-list');
const settingsGrid = document.getElementById('settings-grid');
const paletteGrid = document.getElementById('palette-grid');
const palette = document.getElementById('command-palette');
const composerInput = document.getElementById('composer-input');

function kindTone(kind) {
  return {
    assistant: 'Assistant',
    tool: 'Tool Use',
    system: 'System',
    permission: 'Permission',
    task: 'Task'
  }[kind] || 'Event';
}

function renderTranscript() {
  transcriptList.innerHTML = '';
  state.messages.forEach(message => {
    const node = document.createElement('button');
    node.className = `message ${message.id === state.selectedMessageId ? 'active' : ''}`;
    node.type = 'button';
    node.innerHTML = `
      <div class="message-head">
        <span class="message-title">${message.title}</span>
        <span class="pill">${kindTone(message.kind)}</span>
      </div>
      <p>${message.text}</p>
      <div class="message-meta">${message.meta.map(tag => `<span class="pill">${tag}</span>`).join('')}</div>
    `;
    node.addEventListener('click', () => {
      state.selectedMessageId = message.id;
      renderTranscript();
      renderInspector();
    });
    transcriptList.appendChild(node);
  });

  document.getElementById('message-count').textContent = String(state.messages.length);
}

function renderInspector() {
  const selected = state.messages.find(item => item.id === state.selectedMessageId) || state.messages[0];
  inspectorTitle.textContent = selected.title;
  inspectorBody.innerHTML = `
    <div class="detail-grid">
      <div class="row">
        <span class="meta-label">Surface</span>
        <strong>${kindTone(selected.kind)}</strong>
      </div>
      <div class="row">
        <span class="meta-label">Summary</span>
        <p>${selected.text}</p>
      </div>
      <div class="row">
        <span class="meta-label">Owning modules</span>
        <p>${selected.meta.join(', ')}</p>
      </div>
      <div class="row">
        <span class="meta-label">Browser UI treatment</span>
        <p>Keep the transcript center-stage, show live status chips inline, and move the full payload into a persistent inspector drawer.</p>
      </div>
    </div>
  `;
}

function renderCards(target, items, label) {
  target.innerHTML = '';
  items.forEach(item => {
    const node = document.createElement('article');
    node.className = 'card';
    node.innerHTML = `
      <div class="card-head">
        <span class="card-title">${item.title}</span>
        <span class="pill">${label}</span>
      </div>
      <p>${item.summary}</p>
      <div class="card-meta"><span class="pill">${item.owner}</span></div>
      <div class="pills">${item.tags.map(tag => `<span class="pill">${tag}</span>`).join('')}</div>
    `;
    target.appendChild(node);
  });
}

function renderSettings() {
  settingsGrid.innerHTML = '';
  state.settings.forEach(setting => {
    const node = document.createElement('article');
    node.className = 'setting-card';
    node.innerHTML = `
      <span class="meta-label">${setting.title}</span>
      <p>${setting.description}</p>
      <div class="toggle-row">
        <span class="pill">${setting.value}</span>
        <button class="toggle active" type="button">Connected to runtime contract</button>
      </div>
    `;
    settingsGrid.appendChild(node);
  });
}

function renderPalette() {
  paletteGrid.innerHTML = '';
  [...state.commands, ...state.tools].forEach(item => {
    const node = document.createElement('button');
    node.className = 'card';
    node.type = 'button';
    node.innerHTML = `
      <div class="card-head">
        <span class="card-title">${item.title}</span>
        <span class="pill">jump</span>
      </div>
      <p>${item.summary}</p>
      <div class="card-meta"><span class="pill">${item.owner}</span></div>
    `;
    node.addEventListener('click', () => {
      composerInput.value = `Open ${item.title} and route to ${item.owner}`;
      palette.close();
    });
    paletteGrid.appendChild(node);
  });
}

function setView(view) {
  state.view = view;
  viewTitle.textContent = document.querySelector(`[data-view="${view}"]`).textContent;
  document.querySelectorAll('.nav-item').forEach(button => {
    button.classList.toggle('active', button.dataset.view === view);
  });
  document.querySelectorAll('[data-panel]').forEach(panel => {
    panel.classList.toggle('hidden', panel.dataset.panel !== view && !(view === 'workspace' && panel.dataset.panel === 'workspace'));
  });
}

function appendSystemEvent(title, text, meta, kind = 'system') {
  state.messages.unshift({
    id: `m${Date.now()}`,
    kind,
    title,
    text,
    meta
  });
  state.selectedMessageId = state.messages[0].id;
  renderTranscript();
  renderInspector();
}

document.querySelectorAll('.nav-item').forEach(button => {
  button.addEventListener('click', () => setView(button.dataset.view));
});

document.querySelectorAll('.action').forEach(button => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'toggle-command-palette') {
      palette.showModal();
    } else if (action === 'close-command-palette') {
      palette.close();
    } else if (action === 'append-message') {
      appendSystemEvent(
        'Permission approved',
        'Approval queue resolved and the foreground task resumed without leaving the transcript view.',
        ['components/permissions', 'tasks', 'resume'],
        'permission'
      );
    } else if (action === 'send-composer') {
      appendSystemEvent(
        'User prompt queued',
        composerInput.value.trim() || 'Empty prompt',
        ['PromptInput', 'query.ts', 'context.ts'],
        'assistant'
      );
    } else if (action === 'inject-command') {
      composerInput.value = '/review --diff main';
    } else if (action === 'simulate-turn') {
      appendSystemEvent(
        'Tool batch completed',
        'Read, grep, and task updates finished. Inspector payload now reflects the merged result stream.',
        ['FileReadTool', 'GrepTool', 'TaskOutput'],
        'tool'
      );
    } else if (action === 'new-session') {
      appendSystemEvent(
        'New session forked',
        'Forked from active transcript, preserved model and permissions, cleared foreground task state.',
        ['resume', 'session', 'history.ts'],
        'system'
      );
    }
  });
});

renderTranscript();
renderInspector();
renderCards(commandsList, state.commands, 'command');
renderCards(toolsList, state.tools, 'tool');
renderCards(tasksList, state.tasks, 'task');
renderCards(mcpList, state.mcp, 'mcp');
renderSettings();
renderPalette();
setView('workspace');
