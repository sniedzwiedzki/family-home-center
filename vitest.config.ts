import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'jsdom',
            include: ['src/**/*.test.{ts,tsx}'],
            setupFiles: ['tests/unit-setup.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: 'integration',
            environment: 'node',
            include: ['tests/integration/**/*.int.test.ts'],
            globalSetup: ['tests/integration/global-setup.ts'],
            testTimeout: 60_000,
            hookTimeout: 120_000,
          },
        },
      ],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}'],
        reporter: ['text', 'lcov'],
        thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
      },
    },
  }),
)
