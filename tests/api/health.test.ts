import { describe, expect, it } from 'vitest'
import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  it('returns HTTP 200 with a minimal healthy payload', async () => {
    const response = await GET()
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body).toEqual({ status: 'ok' })
  })

  it('does not expose environment, paths, or dependency details', async () => {
    const response = await GET()
    const body = await response.json()
    const serialized = JSON.stringify(body)

    expect(serialized).not.toMatch(/MAPBOX|TOKEN|path|node_modules|version|env/i)
    expect(Object.keys(body)).toEqual(['status'])
  })
})
