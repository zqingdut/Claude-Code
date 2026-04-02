/* eslint-disable eslint-plugin-n/no-unsupported-features/node-builtins */

import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { logForDebugging } from '../utils/debug.js'
import { jsonParse, jsonStringify } from '../utils/slowOperations.js'
import type { BrowserRuntimeEvent } from './browserRuntimeEvents.js'

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 43137
const MAX_BUFFERED_EVENTS = 200

type RelayClient = {
  id: string
  sessionId?: string
  response: ServerResponse<IncomingMessage>
}

type RelayState = {
  server: ReturnType<typeof createServer> | null
  started: boolean
  port: number
  host: string
  clients: Map<string, RelayClient>
  recentEvents: BrowserRuntimeEvent[]
  intentHandlers: Map<string, BrowserRuntimeIntentHandler>
}

export type BrowserRuntimeIntent =
  | {
      type: 'prompt.submit'
      sessionId: string
      payload: {
        content: string
      }
    }
  | {
      type: 'permission.respond'
      sessionId: string
      payload: {
        requestId: string
        outcome: 'allow' | 'deny'
        updatedInput?: Record<string, unknown>
        message?: string
      }
    }
  | {
      type: 'session.interrupt'
      sessionId: string
      payload: Record<string, never>
    }

export type BrowserRuntimeIntentHandler = {
  onPromptSubmit?: (content: string) => Promise<boolean> | boolean
  onPermissionResponse?: (params: {
    requestId: string
    outcome: 'allow' | 'deny'
    updatedInput?: Record<string, unknown>
    message?: string
  }) => Promise<boolean> | boolean
  onInterrupt?: () => Promise<boolean> | boolean
}

type IntentResponse = {
  ok: boolean
  error?: string
}

const relayState: RelayState = {
  server: null,
  started: false,
  port: Number(process.env.CLAUDE_CODE_BROWSER_RELAY_PORT || DEFAULT_PORT),
  host: process.env.CLAUDE_CODE_BROWSER_RELAY_HOST || DEFAULT_HOST,
  clients: new Map(),
  recentEvents: [],
  intentHandlers: new Map(),
}

function relayEnabled(): boolean {
  return process.env.CLAUDE_CODE_BROWSER_RELAY === '1'
}

function writeCorsHeaders(
  response: ServerResponse<IncomingMessage>,
  extraHeaders: Record<string, string> = {},
): void {
  response.setHeader('access-control-allow-origin', '*')
  response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
  response.setHeader('access-control-allow-headers', 'content-type')
  Object.entries(extraHeaders).forEach(([key, value]) => {
    response.setHeader(key, value)
  })
}

export function ensureBrowserRuntimeRelay(): void {
  if (!relayEnabled() || relayState.started) {
    return
  }

  const server = createServer((request, response) => {
    const requestUrl = new URL(
      request.url || '/',
      `http://${relayState.host}:${relayState.port}`,
    )

    if (request.method === 'OPTIONS') {
      writeCorsHeaders(response)
      response.writeHead(204)
      response.end()
      return
    }

    if (requestUrl.pathname === '/health') {
      writeCorsHeaders(response, { 'content-type': 'application/json' })
      response.writeHead(200)
      response.end(
        jsonStringify({
          ok: true,
          host: relayState.host,
          port: relayState.port,
          clients: relayState.clients.size,
        }),
      )
      return
    }

    if (requestUrl.pathname === '/intents' && request.method === 'POST') {
      void handleIntentRequest(request, response)
      return
    }

    if (requestUrl.pathname !== '/events') {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('Not found')
      return
    }

    const sessionId = requestUrl.searchParams.get('sessionId') || undefined
    const clientId = crypto.randomUUID()

    writeCorsHeaders(response, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    })
    response.writeHead(200)
    response.write(': connected\n\n')

    const client: RelayClient = {
      id: clientId,
      sessionId,
      response,
    }
    relayState.clients.set(clientId, client)

    for (const event of relayState.recentEvents) {
      if (!sessionId || event.sessionId === sessionId) {
        writeEvent(response, event)
      }
    }

    request.on('close', () => {
      relayState.clients.delete(clientId)
    })
  })

  server.listen(relayState.port, relayState.host, () => {
    logForDebugging(
      `[browser-runtime-relay] listening on http://${relayState.host}:${relayState.port}`,
    )
  })

  relayState.server = server
  relayState.started = true
}

export function publishBrowserRuntimeEvent(event: BrowserRuntimeEvent): void {
  if (!relayEnabled()) {
    return
  }

  ensureBrowserRuntimeRelay()

  relayState.recentEvents.push(event)
  if (relayState.recentEvents.length > MAX_BUFFERED_EVENTS) {
    relayState.recentEvents.splice(
      0,
      relayState.recentEvents.length - MAX_BUFFERED_EVENTS,
    )
  }

  for (const client of relayState.clients.values()) {
    if (client.sessionId && client.sessionId !== event.sessionId) {
      continue
    }
    writeEvent(client.response, event)
  }
}

export function getBrowserRuntimeRelayUrl(sessionId?: string): string | null {
  if (!relayEnabled()) {
    return null
  }
  const url = new URL(`http://${relayState.host}:${relayState.port}/events`)
  if (sessionId) {
    url.searchParams.set('sessionId', sessionId)
  }
  return url.toString()
}

export function registerBrowserRuntimeIntentHandler(
  sessionId: string,
  handler: BrowserRuntimeIntentHandler,
): () => void {
  if (!relayEnabled()) {
    return () => {}
  }
  ensureBrowserRuntimeRelay()
  relayState.intentHandlers.set(sessionId, handler)
  return () => {
    relayState.intentHandlers.delete(sessionId)
  }
}

function writeEvent(
  response: ServerResponse<IncomingMessage>,
  event: BrowserRuntimeEvent,
): void {
  response.write(`event: ${event.type}\n`)
  response.write(`data: ${jsonStringify(event)}\n\n`)
}

async function handleIntentRequest(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  try {
    const body = await readBody(request)
    const intent = jsonParse(body) as BrowserRuntimeIntent

    if (
      !intent ||
      typeof intent !== 'object' ||
      !('type' in intent) ||
      !('sessionId' in intent) ||
      typeof intent.sessionId !== 'string'
    ) {
      throw new Error('Intent payload must include type and sessionId')
    }

    const handler = relayState.intentHandlers.get(intent.sessionId)

    if (!handler) {
      writeCorsHeaders(response, { 'content-type': 'application/json' })
      response.writeHead(404)
      response.end(
        jsonStringify({
          ok: false,
          error: `No intent handler registered for session ${intent.sessionId}`,
        }),
      )
      return
    }

    const result: IntentResponse = {
      ok: false,
    }
    if (intent.type === 'prompt.submit') {
      result.ok = Boolean(await handler.onPromptSubmit?.(intent.payload.content))
    } else if (intent.type === 'permission.respond') {
      result.ok = Boolean(await handler.onPermissionResponse?.(intent.payload))
    } else if (intent.type === 'session.interrupt') {
      result.ok = Boolean(await handler.onInterrupt?.())
    } else {
      result.error = `Unsupported intent type: ${String(intent.type)}`
    }

    writeCorsHeaders(response, { 'content-type': 'application/json' })
    response.writeHead(result.ok ? 200 : 400)
    response.end(
      jsonStringify(
        result.ok
          ? result
          : {
              ...result,
              error: result.error || `Intent ${intent.type} was not accepted`,
            },
      ),
    )
  } catch (error) {
    writeCorsHeaders(response, { 'content-type': 'application/json' })
    response.writeHead(400)
    response.end(
      jsonStringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Invalid intent request',
      }),
    )
  }
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    request.on('data', chunk => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    request.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    request.on('error', reject)
  })
}
