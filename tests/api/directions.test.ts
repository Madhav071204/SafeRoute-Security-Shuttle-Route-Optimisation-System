import { describe, it, expect, afterEach, vi } from 'vitest'
import { POST } from '@/app/api/directions/route'
import {
  postJson,
  withMapboxToken,
  stubFetch,
  mockFetchResponse,
} from './_helpers'

const URL = 'http://localhost/api/directions'
const ORIGIN = { lat: -37.9105, lng: 145.1363 }
const DEST = { lat: -37.8136, lng: 144.9631 }

const MAPBOX_OK = {
  code: 'Ok',
  routes: [
    {
      geometry: { type: 'LineString', coordinates: [[145.1363, -37.9105], [144.9631, -37.8136]] },
      distance: 15000,
      duration: 1200,
      legs: [{ distance: 15000, duration: 1200, steps: [] }],
    },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('POST /api/directions', () => {
  it('returns a parsed route for valid coordinates', async () => {
    const restore = withMapboxToken()
    stubFetch(async () => mockFetchResponse({ ok: true, json: MAPBOX_OK }))
    try {
      const res = await POST(postJson(URL, { origin: ORIGIN, destination: DEST }))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.route.distance).toBe(15000)
    } finally {
      restore()
    }
  })

  it('accepts coordinate value zero', async () => {
    const restore = withMapboxToken()
    stubFetch(async () => mockFetchResponse({ ok: true, json: MAPBOX_OK }))
    try {
      const res = await POST(
        postJson(URL, { origin: { lat: 0, lng: 0 }, destination: { lat: 0, lng: 1 } })
      )
      expect(res.status).toBe(200)
      expect((await res.json()).success).toBe(true)
    } finally {
      restore()
    }
  })

  it('rejects numeric-string coordinates with 400', async () => {
    const res = await POST(
      postJson(URL, { origin: { lat: '0', lng: '0' }, destination: DEST })
    )
    expect(res.status).toBe(400)
    expect((await res.json()).success).toBe(false)
  })

  it('rejects a null coordinate with 400', async () => {
    const res = await POST(postJson(URL, { origin: null, destination: DEST }))
    expect(res.status).toBe(400)
  })

  it('rejects out-of-range values with 400', async () => {
    const res = await POST(
      postJson(URL, { origin: { lat: 95, lng: 0 }, destination: DEST })
    )
    expect(res.status).toBe(400)
  })

  it('returns a safe error shape and intended status on upstream failure', async () => {
    const secret = 'pk.secret-directions-token'
    const restore = withMapboxToken(secret)
    stubFetch(async () => mockFetchResponse({ ok: false, status: 500, json: {} }))
    try {
      const res = await POST(postJson(URL, { origin: ORIGIN, destination: DEST }))
      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.success).toBe(false)
      expect(typeof json.error).toBe('string')
      const raw = JSON.stringify(json)
      expect(raw).not.toContain(secret)
      expect(raw).not.toContain('access_token')
    } finally {
      restore()
    }
  })
})
