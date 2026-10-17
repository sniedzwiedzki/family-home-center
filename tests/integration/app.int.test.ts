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

  it('renders the kiosk shell in Polish', async () => {
    await agentBrowser('open', inject('appUrl'))
    const otherColumn = await agentBrowser('get', 'text', '[data-column="other"]')
    expect(otherColumn).toContain('Inne')
    const snapshot = await agentBrowser('snapshot', '-i')
    expect(snapshot).toContain('Ustawienia')
  })
})
