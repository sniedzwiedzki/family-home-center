import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'

export const FAKE_GEMINI = { apiKey: 'fake-gemini-key', model: 'fake-gemini-model', eventTitle: 'Basen z asystenta', answer: 'Dodałem basen na dziś.' }

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'x-goog-api-key, content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
}

const readBody = (request: IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    let body = ''
    request.on('data', (chunk) => (body += chunk))
    request.on('end', () => resolve(body))
  })

function send(response: ServerResponse, status: number, body?: unknown) {
  response.writeHead(status, { ...CORS, ...(body === undefined ? {} : { 'content-type': 'application/json' }) })
  response.end(body === undefined ? undefined : JSON.stringify(body))
}

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * A stand-in for the Gemini Interactions API. It answers the first request (the recording) with a create_event call for today and
 * the request that carries the tool result with a text answer. Requests are kept so a test can look at what the app sent. Fake key only.
 */
export function startFakeGeminiServer(port: number): Promise<Server> {
  let requests: unknown[] = []
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`)
    if (request.method === 'OPTIONS') return send(response, 204)
    if (url.pathname === '/__reset') {
      requests = []
      return send(response, 204)
    }
    if (url.pathname === '/__requests') return send(response, 200, requests)
    if (url.pathname !== '/v1beta/interactions' || request.method !== 'POST') return send(response, 404, { error: { message: 'not found' } })
    if (request.headers['x-goog-api-key'] !== FAKE_GEMINI.apiKey) return send(response, 400, { error: { message: 'API key not valid.' } })

    const body = JSON.parse(await readBody(request)) as { input: { type: string }[] }
    requests.push(body)
    const hasToolResult = body.input.some((step) => step.type === 'function_result')
    if (hasToolResult) {
      return send(response, 200, { status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: FAKE_GEMINI.answer }] }] })
    }
    return send(response, 200, {
      status: 'requires_action',
      steps: [
        { type: 'thought', signature: 'fake-signature' },
        {
          type: 'function_call',
          id: 'call-1',
          name: 'create_event',
          arguments: { title: FAKE_GEMINI.eventTitle, date: todayKey, startTime: '17:00', tags: ['ola'] },
        },
      ],
    })
  })

  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)))
}
