/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a minimal self-contained server in .next/standalone for Docker
  // images (the production deployment target).
  //
  // `next start` is not compatible with `output: 'standalone'` (it emits a
  // warning and expects `node .next/standalone/server.js`). The Playwright
  // E2E suite starts the app with `next start`, so a dedicated, warning-free
  // test build sets NEXT_DISABLE_STANDALONE=1 to omit the standalone output.
  // This does NOT change the production/Docker build, which never sets that
  // variable and keeps emitting the standalone server.
  output: process.env.NEXT_DISABLE_STANDALONE === '1' ? undefined : 'standalone',
}

module.exports = nextConfig
