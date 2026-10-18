import { createServer } from 'node:net'
import { build, preview } from 'vite'
import { startFakeGoogleServer } from './fake-google.ts'
import { startFakeWeatherServer } from './fake-weather.ts'
import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext {
    appUrl: string
    googleUrl: string
  }
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, () => {
      const address = server.address()
      server.close(() => {
        if (address && typeof address === 'object') resolve(address.port)
        else reject(new Error('Could not determine a free port'))
      })
    })
  })
}

export default async function setup(project: TestProject) {
  const weatherPort = await getFreePort()
  const weatherServer = await startFakeWeatherServer(weatherPort)
  process.env.WEATHER_BASE_URL = `http://127.0.0.1:${weatherPort}/v1/forecast`
  process.env.GEOCODING_BASE_URL = `http://127.0.0.1:${weatherPort}/v1/search`
  const googlePort = await getFreePort()
  const googleServer = await startFakeGoogleServer(googlePort)
  process.env.GOOGLE_TOKEN_URL = `http://127.0.0.1:${googlePort}/token`
  process.env.GOOGLE_CALENDAR_URL = `http://127.0.0.1:${googlePort}/calendar/v3`
  await build({ logLevel: 'warn', build: { outDir: 'dist-integration' } })
  const port = await getFreePort()
  const server = await preview({
    logLevel: 'warn',
    build: { outDir: 'dist-integration' },
    preview: { port, strictPort: true, host: '127.0.0.1' },
  })

  project.provide('appUrl', `http://127.0.0.1:${port}`)
  project.provide('googleUrl', `http://127.0.0.1:${googlePort}`)

  return async () => {
    await server.close()
    await new Promise((resolve) => weatherServer.close(resolve))
    await new Promise((resolve) => googleServer.close(resolve))
  }
}
