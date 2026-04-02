import type {
  SDKAssistantMessage,
  SDKMessage,
  SDKResultMessage,
  SDKToolProgressMessage,
} from '../entrypoints/agentSdkTypes.js'
import type { SDKControlPermissionRequest } from '../entrypoints/sdk/controlTypes.js'

export type BrowserRuntimeEventType =
  | 'session.snapshot'
  | 'session.meta'
  | 'message.created'
  | 'message.updated'
  | 'tool.started'
  | 'tool.progress'
  | 'tool.completed'
  | 'permission.requested'
  | 'permission.resolved'
  | 'task.updated'
  | 'mcp.updated'
  | 'command.registered'
  | 'transport.status'

export type BrowserRuntimeEvent = {
  type: BrowserRuntimeEventType
  timestamp: string
  sessionId: string
  payload: Record<string, unknown>
}

export function createTransportStatusEvent(params: {
  sessionId: string
  state: 'connecting' | 'connected' | 'disconnected' | 'error'
  label: string
}): BrowserRuntimeEvent {
  return {
    type: 'transport.status',
    timestamp: new Date().toISOString(),
    sessionId: params.sessionId,
    payload: {
      state: params.state,
      label: params.label,
    },
  }
}

export function createPermissionRequestedEvent(params: {
  sessionId: string
  request: SDKControlPermissionRequest
  requestId: string
}): BrowserRuntimeEvent {
  const { request, requestId, sessionId } = params
  return {
    type: 'permission.requested',
    timestamp: new Date().toISOString(),
    sessionId,
    payload: {
      requestId,
      toolName: request.tool_name,
      toolUseId: request.tool_use_id,
      title: request.title ?? request.display_name ?? request.tool_name,
      description:
        request.description ??
        request.decision_reason ??
        `${request.tool_name} requires permission`,
      blockedPath: request.blocked_path,
      input: request.input,
      suggestions: request.permission_suggestions ?? [],
    },
  }
}

export function createPermissionResolvedEvent(params: {
  sessionId: string
  requestId: string
  outcome: 'allow' | 'deny' | 'cancel'
  message?: string
}): BrowserRuntimeEvent {
  return {
    type: 'permission.resolved',
    timestamp: new Date().toISOString(),
    sessionId: params.sessionId,
    payload: {
      requestId: params.requestId,
      outcome: params.outcome,
      message: params.message,
    },
  }
}

export function createBrowserRuntimeEventFromSdkMessage(
  message: SDKMessage,
): BrowserRuntimeEvent | null {
  switch (message.type) {
    case 'assistant':
      return createAssistantEvent(message)
    case 'result':
      return createResultEvent(message)
    case 'tool_progress':
      return createToolProgressEvent(message)
    case 'system':
      return createSystemEvent(message)
    case 'user':
      return {
        type: 'message.created',
        timestamp: new Date().toISOString(),
        sessionId: message.session_id,
        payload: {
          role: 'user',
          title: summarizeUserTitle(message),
          text: summarizeUserContent(message.message?.content),
          uuid: message.uuid,
          parentToolUseId: message.parent_tool_use_id,
        },
      }
    default:
      return null
  }
}

type BrowserSystemMessage = Extract<SDKMessage, { type: 'system' }>

function createAssistantEvent(
  message: SDKAssistantMessage,
): BrowserRuntimeEvent {
  return {
    type: 'message.created',
    timestamp: new Date().toISOString(),
    sessionId: message.session_id,
    payload: {
      role: 'assistant',
      title: 'Assistant message',
      text: summarizeAssistantContent(message.message?.content),
      uuid: message.uuid,
      error: message.error,
      parentToolUseId: message.parent_tool_use_id,
    },
  }
}

function createResultEvent(message: SDKResultMessage): BrowserRuntimeEvent {
  return {
    type: 'tool.completed',
    timestamp: new Date().toISOString(),
    sessionId: message.session_id,
    payload: {
      title:
        message.subtype === 'success'
          ? 'Turn completed'
          : 'Turn completed with error',
      subtype: message.subtype,
      isError: message.is_error,
      text:
        message.subtype === 'success'
          ? message.result
          : (message.errors ?? []).join(', '),
      uuid: message.uuid,
      stopReason: message.stop_reason,
      totalCostUsd: message.total_cost_usd,
      durationMs: message.duration_ms,
    },
  }
}

function createToolProgressEvent(
  message: SDKToolProgressMessage,
): BrowserRuntimeEvent {
  return {
    type: 'tool.progress',
    timestamp: new Date().toISOString(),
    sessionId: message.session_id,
    payload: {
      title: `${message.tool_name} running`,
      toolName: message.tool_name,
      toolUseId: message.tool_use_id,
      elapsedTimeSeconds: message.elapsed_time_seconds,
      uuid: message.uuid,
    },
  }
}

function createSystemEvent(
  message: BrowserSystemMessage,
): BrowserRuntimeEvent | null {
  switch (message.subtype) {
    case 'init':
      return {
        type: 'session.snapshot',
        timestamp: new Date().toISOString(),
        sessionId: message.session_id,
        payload: {
          session: {
            cwd: message.cwd,
            model: message.model,
            permissionMode: message.permissionMode,
            outputStyle: message.output_style,
          },
          commands: message.slash_commands,
          tools: message.tools,
          mcpServers: message.mcp_servers,
          skills: message.skills,
          plugins: message.plugins,
          agents: message.agents ?? [],
        },
      }
    case 'status':
      return {
        type: 'session.meta',
        timestamp: new Date().toISOString(),
        sessionId: message.session_id,
        payload: {
          status: message.status,
          permissionMode: message.permissionMode,
          uuid: message.uuid,
        },
      }
    case 'post_turn_summary':
      return {
        type: 'message.updated',
        timestamp: new Date().toISOString(),
        sessionId: message.session_id,
        payload: {
          title: message.title,
          description: message.description,
          statusCategory: message.status_category,
          statusDetail: message.status_detail,
          needsAction: message.needs_action,
          recentAction: message.recent_action,
          summarizesUuid: message.summarizes_uuid,
          artifactUrls: message.artifact_urls,
          uuid: message.uuid,
        },
      }
    case 'task_started':
    case 'task_notification':
    case 'task_progress':
      return {
        type: 'task.updated',
        timestamp: new Date().toISOString(),
        sessionId: message.session_id,
        payload: {
          subtype: message.subtype,
          title: 'Remote task update',
          taskId: 'task_id' in message ? message.task_id : undefined,
          status:
            message.subtype === 'task_started'
              ? 'running'
              : message.subtype === 'task_notification'
                ? 'completed'
                : 'progress',
          uuid: message.uuid,
        },
      }
    case 'local_command_output':
      return {
        type: 'message.created',
        timestamp: new Date().toISOString(),
        sessionId: message.session_id,
        payload: {
          role: 'system',
          title: 'Local command output',
          text: message.content,
          uuid: message.uuid,
        },
      }
    case 'compact_boundary':
      return {
        type: 'message.updated',
        timestamp: new Date().toISOString(),
        sessionId: message.session_id,
        payload: {
          title: 'Conversation compacted',
          trigger: message.compact_metadata.trigger,
          preTokens: message.compact_metadata.pre_tokens,
          uuid: message.uuid,
        },
      }
    default:
      return null
  }
}

function summarizeAssistantContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }
  if (!Array.isArray(content)) {
    return 'Assistant response received'
  }
  return content
    .map(block => {
      if (typeof block !== 'object' || block === null || !('type' in block)) {
        return ''
      }
      if (block.type === 'text' && 'text' in block) {
        return String(block.text)
      }
      if (block.type === 'thinking' && 'thinking' in block) {
        return `[thinking] ${String(block.thinking)}`
      }
      if (block.type === 'tool_use' && 'name' in block) {
        return `[tool] ${String(block.name)}`
      }
      return `[${String(block.type)}]`
    })
    .filter(Boolean)
    .join('\n')
}

function summarizeUserContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }
  if (!Array.isArray(content)) {
    return 'User message received'
  }
  return content
    .map(block => {
      if (typeof block !== 'object' || block === null || !('type' in block)) {
        return ''
      }
      if (block.type === 'text' && 'text' in block) {
        return String(block.text)
      }
      if (block.type === 'tool_result' && 'tool_use_id' in block) {
        return `[tool_result] ${String(block.tool_use_id)}`
      }
      return `[${String(block.type)}]`
    })
    .filter(Boolean)
    .join('\n')
}

function summarizeUserTitle(message: {
  content?: unknown
}): string {
  const content = message?.content
  if (Array.isArray(content)) {
    const hasToolResult = content.some(
      block =>
        typeof block === 'object' &&
        block !== null &&
        'type' in block &&
        block.type === 'tool_result',
    )
    return hasToolResult ? 'Tool result received' : 'User message'
  }
  return 'User message'
}
