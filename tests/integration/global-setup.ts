import { createServer } from 'node:net'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { build, preview } from 'vite'
import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext {
    appUrl: string
    databaseUrl: string
  }
}

const POSTGRES_IMAGE = 'postgres:17-alpine'

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
  const database = await new PostgreSqlContainer(POSTGRES_IMAGE).start()

  await build({ logLevel: 'warn', build: { outDir: 'dist-integration' } })
  const port = await getFreePort()
  const server = await preview({
    logLevel: 'warn',
    build: { outDir: 'dist-integration' },
    preview: { port, strictPort: true, host: '127.0.0.1' },
  })

  project.provide('appUrl', `http://127.0.0.1:${port}`)
  project.provide('databaseUrl', database.getConnectionUri())

  return async () => {
    await server.close()
    await database.stop()
  }
}
