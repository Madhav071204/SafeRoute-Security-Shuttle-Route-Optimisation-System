/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a minimal self-contained server in .next/standalone for Docker images.
  output: 'standalone',
}

module.exports = nextConfig
