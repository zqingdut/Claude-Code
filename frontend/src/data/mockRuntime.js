export function createMockSnapshot() {
  return {
    app: {
      title: 'Claude Code Control Surface',
      branch: 'main',
      mode: 'interactive',
      transport: 'mock bridge',
      connection: 'healthy',
      repoRoot: '/Users/niko/projects/Claude-Code'
    },
    session: {
      id: 'session_local_browser_01',
      name: 'Main Workspace',
      cwd: '/Users/niko/projects/Claude-Code',
      model: 'gpt-5',
      thinking: 'adaptive',
      permissionMode: 'default',
      sessionPersistence: true
    },
    metrics: {
      messages: 21,
      tasks: 4,
      mcpServers: 3,
      permissions: 2
    },
    messages: [
      {
        id: 'm-boot',
        kind: 'system',
        title: 'Session bootstrapped',
        text: 'Loaded config, permissions, plugins, MCP state, history, and startup migrations.',
        meta: ['main.tsx', 'setup.ts', 'context.ts'],
        owner: 'runtime bootstrap',
        status: 'complete',
        timestamp: '09:41:03'
      },
      {
        id: 'm-plan',
        kind: 'assistant',
        title: 'Execution plan prepared',
        text: 'Command routing resolved, tool availability checked, and transcript context compacted for the next turn.',
        meta: ['commands.ts', 'tools.ts', 'query.ts'],
        owner: 'main loop',
        status: 'complete',
        timestamp: '09:41:14'
      },
      {
        id: 'm-bash',
        kind: 'tool',
        title: 'BashTool streaming output',
        text: 'Foreground shell task is active under sandbox policy. Live output, diff summaries, and permission prompts are attached.',
        meta: ['tools/BashTool', 'tasks/LocalShellTask', 'components/shell'],
        owner: 'tool execution',
        status: 'running',
        timestamp: '09:41:27'
      },
      {
        id: 'm-perm',
        kind: 'permission',
        title: 'Filesystem permission requested',
        text: 'Edit request targets a path outside the workspace boundary and needs user approval before patch application.',
        meta: ['components/permissions', 'tools/FileEditTool'],
        owner: 'permission broker',
        status: 'blocked',
        timestamp: '09:41:29'
      },
      {
        id: 'm-agent',
        kind: 'task',
        title: 'Remote agent attached',
        text: 'A parallel agent is collecting non-blocking context while the active transcript remains interactive.',
        meta: ['tasks/RemoteAgentTask', 'components/tasks', 'remote/'],
        owner: 'task orchestration',
        status: 'running',
        timestamp: '09:41:31'
      }
    ],
    activity: [
      {
        id: 'a-1',
        label: 'tool.started',
        summary: 'BashTool opened a foreground shell task',
        tone: 'accent'
      },
      {
        id: 'a-2',
        label: 'permission.requested',
        summary: 'FileEditTool asked for workspace boundary escalation',
        tone: 'warning'
      },
      {
        id: 'a-3',
        label: 'task.updated',
        summary: 'Remote agent streamed a status checkpoint',
        tone: 'info'
      }
    ],
    commands: [
      {
        id: 'cmd-review',
        title: '/review',
        owner: 'commands/review/',
        summary: 'Run diff review and surface findings before any summary.',
        tags: ['review', 'diff', 'safety']
      },
      {
        id: 'cmd-plan',
        title: '/plan',
        owner: 'commands/plan/',
        summary: 'Enter plan mode, manage approvals, and control plan lifecycle.',
        tags: ['plan mode', 'approval', 'workflow']
      },
      {
        id: 'cmd-mcp',
        title: '/mcp',
        owner: 'commands/mcp/',
        summary: 'Inspect server connections, capabilities, and command exposure.',
        tags: ['mcp', 'servers', 'resources']
      },
      {
        id: 'cmd-resume',
        title: '/resume',
        owner: 'commands/resume/',
        summary: 'Restore sessions, transcript slices, and PR-linked history.',
        tags: ['session', 'resume', 'history']
      }
    ],
    tools: [
      {
        id: 'tool-bash',
        title: 'BashTool',
        owner: 'tools/BashTool/',
        summary: 'Shell execution, sandboxing, read-only detection, backgrounding, and permission escalation.',
        tags: ['shell', 'sandbox', 'permissions'],
        health: 'hot'
      },
      {
        id: 'tool-edit',
        title: 'FileEditTool',
        owner: 'tools/FileEditTool/',
        summary: 'Patch application, diff previews, and edit permission requests.',
        tags: ['edit', 'patch', 'diff'],
        health: 'warm'
      },
      {
        id: 'tool-agent',
        title: 'AgentTool',
        owner: 'tools/AgentTool/',
        summary: 'Spawn and route sub-agents with scoped ownership and asynchronous updates.',
        tags: ['agents', 'parallel', 'tasks'],
        health: 'hot'
      },
      {
        id: 'tool-mcp',
        title: 'MCPTool',
        owner: 'tools/MCPTool/',
        summary: 'Expose external tools and resources through connected MCP servers.',
        tags: ['mcp', 'extensibility', 'transport'],
        health: 'warm'
      }
    ],
    tasks: [
      {
        id: 'task-fg',
        title: 'Foreground shell task',
        owner: 'tasks/LocalShellTask/',
        summary: 'Streams command output into the active transcript.',
        status: 'running',
        tags: ['foreground', 'shell']
      },
      {
        id: 'task-agent',
        title: 'Remote agent task',
        owner: 'tasks/RemoteAgentTask/',
        summary: 'Collects context in parallel and posts back into the session.',
        status: 'running',
        tags: ['remote', 'agent']
      },
      {
        id: 'task-dream',
        title: 'Dream task',
        owner: 'tasks/DreamTask/',
        summary: 'Deferred workflow with replayable output and queue status.',
        status: 'queued',
        tags: ['background', 'queue']
      }
    ],
    mcpServers: [
      {
        id: 'mcp-github',
        title: 'GitHub connector',
        owner: 'services/mcp/ + components/mcp/',
        summary: 'Connected, capabilities hydrated, read-only policy active.',
        status: 'connected',
        tags: ['connector', 'resource', 'policy']
      },
      {
        id: 'mcp-vscode',
        title: 'VS Code SDK MCP',
        owner: 'services/mcp/vscodeSdkMcp.js',
        summary: 'Sends IDE notifications and file update hooks into the editor.',
        status: 'connected',
        tags: ['ide', 'workspace']
      },
      {
        id: 'mcp-plugin',
        title: 'Plugin marketplace',
        owner: 'plugins/ + services/plugins/',
        summary: 'Built-in, bundled, and installed plugins with hot reload semantics.',
        status: 'ready',
        tags: ['plugins', 'marketplace', 'skills']
      }
    ],
    settings: [
      {
        id: 'setting-permission',
        title: 'Permission Mode',
        description: 'Control sandbox and approval strategy for tool execution.',
        value: 'default'
      },
      {
        id: 'setting-thinking',
        title: 'Thinking',
        description: 'Adaptive reasoning budget for the active model.',
        value: 'adaptive'
      },
      {
        id: 'setting-transport',
        title: 'Transport',
        description: 'Bridge, direct connect, or remote session backend.',
        value: 'mock bridge'
      },
      {
        id: 'setting-persistence',
        title: 'Session Persistence',
        description: 'Persist transcript and metadata for /resume workflows.',
        value: 'enabled'
      }
    ]
  };
}

export function createMockEventStream() {
  return [
    {
      type: 'tool.progress',
      timestamp: new Date().toISOString(),
      sessionId: 'session_local_browser_01',
      payload: {
        title: 'Shell task checkpoint',
        text: 'Command output grew by 12 lines, summary updated in transcript.',
        meta: ['BashTool', 'TaskOutput'],
        kind: 'tool'
      }
    },
    {
      type: 'permission.resolved',
      timestamp: new Date().toISOString(),
      sessionId: 'session_local_browser_01',
      payload: {
        title: 'Permission approved',
        text: 'Escalation resolved, edit pipeline resumed without leaving the active workspace.',
        meta: ['PermissionDialog', 'FileEditTool'],
        kind: 'permission'
      }
    },
    {
      type: 'task.updated',
      timestamp: new Date().toISOString(),
      sessionId: 'session_local_browser_01',
      payload: {
        title: 'Agent task checkpoint',
        text: 'Remote agent returned a scoped findings summary.',
        meta: ['RemoteAgentTask', 'AgentTool'],
        kind: 'task'
      }
    }
  ];
}
