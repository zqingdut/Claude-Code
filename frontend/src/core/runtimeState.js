function nowLabel(timestamp) {
  if (!timestamp) {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return String(timestamp);
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toCommandItem(command) {
  return {
    id: `cmd-${command}`,
    title: command,
    owner: 'runtime session snapshot',
    summary: `Registered command ${command}`,
    tags: ['snapshot', 'command']
  };
}

function toToolItem(tool) {
  return {
    id: `tool-${tool}`,
    title: tool,
    owner: 'runtime session snapshot',
    summary: `Available tool ${tool}`,
    tags: ['snapshot', 'tool'],
    health: 'warm'
  };
}

function toMcpItem(server) {
  return {
    id: `mcp-${server.name}`,
    title: server.name,
    owner: 'runtime session snapshot',
    summary: `Server status: ${server.status}`,
    status: server.status,
    tags: ['snapshot', 'mcp']
  };
}

function upsertById(items, nextItem) {
  const index = items.findIndex(item => item.id === nextItem.id);
  if (index === -1) {
    return [nextItem, ...items];
  }
  return items.map(item => (item.id === nextItem.id ? { ...item, ...nextItem } : item));
}

function eventTone(eventType, status) {
  if (eventType.includes('permission') || status === 'blocked') {
    return 'warning';
  }
  if (eventType.includes('task') || status === 'running') {
    return 'info';
  }
  return 'accent';
}

function eventKind(eventType, payload) {
  if (payload.role === 'assistant') {
    return 'assistant';
  }
  if (eventType.startsWith('permission')) {
    return 'permission';
  }
  if (eventType.startsWith('task')) {
    return 'task';
  }
  if (eventType.startsWith('tool')) {
    return 'tool';
  }
  return 'system';
}

function eventStatus(eventType, payload) {
  if (eventType === 'permission.requested') {
    return 'blocked';
  }
  if (eventType === 'tool.progress' || eventType === 'task.updated') {
    return 'running';
  }
  if (eventType === 'transport.status' && payload.state === 'error') {
    return 'blocked';
  }
  return 'complete';
}

function eventTitle(eventType, payload) {
  return payload.title || payload.label || payload.toolName || payload.status || eventType;
}

function eventText(eventType, payload) {
  if (payload.text) {
    return payload.text;
  }
  if (payload.description) {
    return payload.description;
  }
  if (payload.message) {
    return payload.message;
  }
  if (eventType === 'session.snapshot') {
    return 'Session snapshot synchronized into browser state.';
  }
  return 'Runtime event received';
}

function eventMeta(eventType, payload) {
  const meta = [];
  if (payload.uuid) {
    meta.push(payload.uuid);
  }
  if (payload.toolName) {
    meta.push(payload.toolName);
  }
  if (payload.requestId) {
    meta.push(payload.requestId);
  }
  if (payload.statusCategory) {
    meta.push(payload.statusCategory);
  }
  if (payload.permissionMode) {
    meta.push(payload.permissionMode);
  }
  if (payload.meta) {
    meta.push(...payload.meta);
  }
  meta.push(eventType);
  return meta;
}

function createMessageFromEvent(event) {
  const payload = event.payload || {};
  return {
    id: payload.uuid || payload.requestId || `${event.type}-${Date.now()}`,
    kind: eventKind(event.type, payload),
    title: eventTitle(event.type, payload),
    text: eventText(event.type, payload),
    meta: eventMeta(event.type, payload),
    owner: 'runtime event stream',
    status: eventStatus(event.type, payload),
    timestamp: nowLabel(event.timestamp),
    rawPayload: payload,
    sourceEventType: event.type
  };
}

function createActivityFromEvent(event) {
  const payload = event.payload || {};
  return {
    id: `${event.type}-${payload.uuid || payload.requestId || Date.now()}`,
    label: event.type,
    summary: eventTitle(event.type, payload),
    tone: eventTone(event.type, eventStatus(event.type, payload))
  };
}

function mergeSnapshot(current, payload, event) {
  const nextCommands = asArray(payload.commands).map(toCommandItem);
  const nextTools = asArray(payload.tools).map(toToolItem);
  const nextMcpServers = asArray(payload.mcpServers).map(toMcpItem);
  const session = payload.session || {};

  return {
    ...current,
    app: {
      ...current.app,
      transport: 'runtime relay'
    },
    session: {
      ...current.session,
      id: event.sessionId || current.session.id,
      cwd: session.cwd || current.session.cwd,
      model: session.model || current.session.model,
      permissionMode: session.permissionMode || current.session.permissionMode
    },
    commands: nextCommands.length > 0 ? nextCommands : current.commands,
    tools: nextTools.length > 0 ? nextTools : current.tools,
    mcpServers: nextMcpServers.length > 0 ? nextMcpServers : current.mcpServers,
    settings: current.settings.map(setting => {
      if (setting.id === 'setting-permission') {
        return { ...setting, value: session.permissionMode || current.session.permissionMode };
      }
      if (setting.id === 'setting-transport') {
        return { ...setting, value: 'runtime relay' };
      }
      return setting;
    })
  };
}

function mergeSessionMeta(current, payload) {
  const permissionMode = payload.permissionMode || current.session.permissionMode;
  return {
    ...current,
    session: {
      ...current.session,
      permissionMode
    },
    settings: current.settings.map(setting =>
      setting.id === 'setting-permission'
        ? { ...setting, value: permissionMode }
        : setting
    )
  };
}

function mergeTaskUpdate(current, payload) {
  const taskId = payload.taskId || `task-${payload.uuid || Date.now()}`;
  const nextTask = {
    id: taskId,
    title: payload.title || 'Runtime task',
    owner: 'runtime task stream',
    summary: payload.description || payload.status || 'Task update received',
    status: payload.status || 'running',
    tags: [payload.subtype || 'task']
  };
  return {
    ...current,
    tasks: upsertById(current.tasks, nextTask)
  };
}

function mergePermissionMetrics(current, eventType) {
  if (eventType === 'permission.requested') {
    return {
      ...current.metrics,
      permissions: current.metrics.permissions + 1
    };
  }
  if (eventType === 'permission.resolved') {
    return {
      ...current.metrics,
      permissions: Math.max(0, current.metrics.permissions - 1)
    };
  }
  return current.metrics;
}

export function reduceRuntimeEvent(current, event) {
  let nextState = current;
  const payload = event.payload || {};

  if (event.type === 'session.snapshot') {
    nextState = mergeSnapshot(nextState, payload, event);
  } else if (event.type === 'session.meta') {
    nextState = mergeSessionMeta(nextState, payload);
  } else if (event.type === 'task.updated') {
    nextState = mergeTaskUpdate(nextState, payload);
  } else if (event.type === 'transport.status') {
    nextState = {
      ...nextState,
      transportStatus: {
        state: payload.state || nextState.transportStatus.state,
        label: payload.label || nextState.transportStatus.label
      }
    };
  }

  const nextMessage = createMessageFromEvent(event);
  const nextActivity = createActivityFromEvent(event);

  nextState = {
    ...nextState,
    selectedMessageId: nextMessage.id,
    metrics: {
      ...mergePermissionMetrics(nextState, event.type),
      messages: nextState.metrics.messages + 1,
      tasks: nextState.tasks.length,
      mcpServers: nextState.mcpServers.length
    },
    activity: [nextActivity, ...nextState.activity].slice(0, 8),
    messages: upsertById(nextState.messages, nextMessage)
  };

  return nextState;
}
