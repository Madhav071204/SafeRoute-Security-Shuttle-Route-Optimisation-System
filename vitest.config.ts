import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Resolve the "@/*" alias the same way tsconfig.json does, so tests import
// application modules through the exact same specifiers as production code.
const srcDir = path.resolve(process.cwd(), 'src')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  test: {
    globals: true,
    // Pure-logic and API-handler tests run in Node. Individual component tests
    // opt into jsdom with a `// @vitest-environment jsdom` file docblock.
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    // Playwright drives its own runner; keep its specs out of Vitest.
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Measure meaningful application logic: shared validation, the routing
      // algorithms, the API route handlers and the route-comparison result view.
      // Presentational/map/driver UI is exercised through Playwright, not unit
      // coverage (documented in docs/testing-strategy.md).
      include: [
        'src/lib/**/*.ts',
        'src/app/api/**/*.ts',
        'src/components/results/**/*.tsx',
      ],
      exclude: [
        '**/*.d.ts',
        'src/types/**',
        '**/*.config.*',
        '.next/**',
        'node_modules/**',
      ],
    },
  },
})
