import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const config = nextCoreWebVitals.map((entry) => {
  if (entry?.name !== 'next') return entry

  return {
    ...entry,
    rules: {
      ...entry.rules,
      // These rules are overly strict for this app’s patterns (localStorage hydration,
      // initial data refreshes, and controlled state sync). Keep rules-of-hooks enabled.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  }
})

export default [
  ...config,
  // Project-specific ignores (in addition to Next defaults). Generated test
  // output (coverage reports, Playwright artifacts) is never linted.
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
]
