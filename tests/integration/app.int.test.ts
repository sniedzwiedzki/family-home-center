import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { afterAll, describe, expect, inject, it } from 'vitest'

const run = promisify(execFile)
const SESSION = `fhc-integration-${process.pid}`

async function agentBrowser(...args: string[]): Promise<string> {
  const { stdout } = await run('npx', ['agent-browser', '--session', SESSION, ...args])
  return stdout
}

describe('temporary app instance driven by agent-browser', () => {
  afterAll(async () => {
    await agentBrowser('close')
  })

  it('renders the page', async () => {
    await agentBrowser('open', inject('appUrl'))
    const heading = await agentBrowser('get', 'text', 'h1')
    expect(heading).toContain('Your React app is ready.')
  })
})
