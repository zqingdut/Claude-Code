/* eslint-disable eslint-plugin-n/no-unsupported-features/node-builtins */

import type { SDKMessage } from '../entrypoints/agentSdkTypes.js'
import type {
  SDKControlPermissionRequest,
  StdoutMessage,
} from '../entrypoints/sdk/controlTypes.js'
import type { RemotePermissionResponse } from '../remote/RemoteSessionManager.js'
import {
  createBrowserRuntimeEventFromSdkMessage,
  createPermissionRequestedEvent,
  createPermissionResolvedEvent,
  createTransportStatusEvent,
  type BrowserRuntimeEvent,
} from './browserRuntimeEvents.js'
import {
  ensureBrowserRuntimeRelay,
  publishBrowserRuntimeEvent,
  registerBrowserRuntimeIntentHandler,
} from './browserRuntimeRelay.js'
import { logForDebugging } from '../utils/debug.js'
import { jsonParse, jsonStringify } from '../utils/slowOperations.js'
import type { RemoteMessageContent } from '../utils/teleport/api.js'

export type DirectConnectConfig = {
  serverUrl: string
  sessionId: string
  wsUrl: string
  authToken?: string
}

export type DirectConnectCallbacks = {
  onMessage: (message: SDKMessage) => void
  onPermissionRequest: (
    request: SDKControlPermissionRequest,
    requestId: string,
  ) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
  onBrowserEvent?: (event: BrowserRuntimeEvent) => void
}

function isStdoutMessage(value: unknown): value is StdoutMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof value.type === 'string'
  )
}

export class DirectConnectSessionManager {
  private ws: WebSocket | null = null
  private config: DirectConnectConfig
  private callbacks: DirectConnectCallbacks
  private unregisterIntentHandler: (() => void) | null = null

  constructor(config: DirectConnectConfig, callbacks: DirectConnectCallbacks) {
    this.config = config
    this.callbacks = callbacks
  }

  private emitBrowserEvent(event: BrowserRuntimeEvent): void {
    this.callbacks.onBrowserEvent?.(event)
    publishBrowserRuntimeEvent(event)
  }

  connect(): void {
    ensureBrowserRuntimeRelay()
    this.unregisterIntentHandler = registerBrowserRuntimeIntentHandler(
      this.config.sessionId,
      {
        onPromptSubmit: content => this.sendMessage(content),
        onPermissionResponse: params => {
          this.respondToPermissionRequest(params.requestId, params.outcome === 'allow'
            ? { behavior: 'allow', updatedInput: params.updatedInput ?? {} }
            : { behavior: 'deny', message: params.message ?? 'Denied from browser UI' })
          return true
        },
        onInterrupt: () => {
          this.sendInterrupt()
          return true
        },
      },
    )
    this.emitBrowserEvent(
      createTransportStatusEvent({
        sessionId: this.config.sessionId,
        state: 'connecting',
        label: 'Opening direct connect session',
      }),
    )
    const headers: Record<string, string> = {}
    if (this.config.authToken) {
      headers['authorization'] = `Bearer ${this.config.authToken}`
    }
    // Bun's WebSocket supports headers option but the DOM typings don't
    this.ws = new WebSocket(this.config.wsUrl, {
      headers,
    } as unknown as string[])

    this.ws.addEventListener('open', () => {
      this.emitBrowserEvent(
        createTransportStatusEvent({
          sessionId: this.config.sessionId,
          state: 'connected',
          label: 'Direct connect session opened',
        }),
      )
      this.callbacks.onConnected?.()
    })

    this.ws.addEventListener('message', event => {
      const data = typeof event.data === 'string' ? event.data : ''
      const lines = data.split('\n').filter((l: string) => l.trim())

      for (const line of lines) {
        let raw: unknown
        try {
          raw = jsonParse(line)
        } catch {
          continue
        }

        if (!isStdoutMessage(raw)) {
          continue
        }
        const parsed = raw

        // Handle control requests (permission requests)
        if (parsed.type === 'control_request') {
          if (parsed.request.subtype === 'can_use_tool') {
            this.emitBrowserEvent(
              createPermissionRequestedEvent({
                sessionId: this.config.sessionId,
                request: parsed.request,
                requestId: parsed.request_id,
              }),
            )
            this.callbacks.onPermissionRequest(
              parsed.request,
              parsed.request_id,
            )
          } else {
            // Send an error response for unrecognized subtypes so the
            // server doesn't hang waiting for a reply that never comes.
            logForDebugging(
              `[DirectConnect] Unsupported control request subtype: ${parsed.request.subtype}`,
            )
            this.sendErrorResponse(
              parsed.request_id,
              `Unsupported control request subtype: ${parsed.request.subtype}`,
            )
          }
          continue
        }

        // Forward browser-safe runtime events for SDK messages, including
        // post_turn_summary which the local REPL intentionally ignores.
        if (
          parsed.type !== 'control_response' &&
          parsed.type !== 'keep_alive' &&
          parsed.type !== 'control_cancel_request' &&
          parsed.type !== 'streamlined_text' &&
          parsed.type !== 'streamlined_tool_use_summary'
        ) {
          const browserEvent = createBrowserRuntimeEventFromSdkMessage(parsed)
          if (browserEvent) {
            this.emitBrowserEvent(browserEvent)
          }
        }

        // Forward SDK messages (assistant, result, system, etc.) to the REPL.
        if (
          parsed.type !== 'control_response' &&
          parsed.type !== 'keep_alive' &&
          parsed.type !== 'control_cancel_request' &&
          parsed.type !== 'streamlined_text' &&
          parsed.type !== 'streamlined_tool_use_summary' &&
          !(parsed.type === 'system' && parsed.subtype === 'post_turn_summary')
        ) {
          this.callbacks.onMessage(parsed)
        }
      }
    })

    this.ws.addEventListener('close', () => {
      this.emitBrowserEvent(
        createTransportStatusEvent({
          sessionId: this.config.sessionId,
          state: 'disconnected',
          label: 'Direct connect session closed',
        }),
      )
      this.callbacks.onDisconnected?.()
    })

    this.ws.addEventListener('error', () => {
      this.emitBrowserEvent(
        createTransportStatusEvent({
          sessionId: this.config.sessionId,
          state: 'error',
          label: 'Direct connect WebSocket error',
        }),
      )
      this.callbacks.onError?.(new Error('WebSocket connection error'))
    })
  }

  sendMessage(content: RemoteMessageContent): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false
    }

    // Must match SDKUserMessage format expected by `--input-format stream-json`
    const message = jsonStringify({
      type: 'user',
      message: {
        role: 'user',
        content: content,
      },
      parent_tool_use_id: null,
      session_id: '',
    })
    this.ws.send(message)
    return true
  }

  respondToPermissionRequest(
    requestId: string,
    result: RemotePermissionResponse,
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    // Must match SDKControlResponse format expected by StructuredIO
    const response = jsonStringify({
      type: 'control_response',
      response: {
        subtype: 'success',
        request_id: requestId,
        response: {
          behavior: result.behavior,
          ...(result.behavior === 'allow'
            ? { updatedInput: result.updatedInput }
            : { message: result.message }),
        },
      },
    })
    this.ws.send(response)
    this.emitBrowserEvent(
      createPermissionResolvedEvent({
        sessionId: this.config.sessionId,
        requestId,
        outcome: result.behavior,
      }),
    )
  }

  /**
   * Send an interrupt signal to cancel the current request
   */
  sendInterrupt(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    // Must match SDKControlRequest format expected by StructuredIO
    const request = jsonStringify({
      type: 'control_request',
      request_id: crypto.randomUUID(),
      request: {
        subtype: 'interrupt',
      },
    })
    this.ws.send(request)
  }

  private sendErrorResponse(requestId: string, error: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }
    const response = jsonStringify({
      type: 'control_response',
      response: {
        subtype: 'error',
        request_id: requestId,
        error,
      },
    })
    this.ws.send(response)
  }

  disconnect(): void {
    this.unregisterIntentHandler?.()
    this.unregisterIntentHandler = null
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
