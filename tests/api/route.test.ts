import { describe, it, expect, afterEach, vi } from 'vitest'
import { POST } from '@/app/api/route/route'
import {
  postJson,
  withMapboxToken,
  withoutMapboxToken,
  stubFetch,
  mockFetchResponse,
} from './_helpers'

const URL = 'http://localhost/api/route'
const ORIGIN = { lat: -37.9105, lng: 145.1363 }

function stop(id: string, lat: number, lng: number) {
  return { id, coordinates: { lat, lng } }
}

// A minimal successful Mapbox Directions payload (geometries=polyline).
const MAPBOX_OK = {
  routes: [
    {
      geometry: 'abc_polyline',
      distance: 12000, // metres
      duration: 900, // seconds
      legs: [
        { distance: 6000, duration: 450 },
        { distance: 6000, duration: 450 },
      ],
    },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('POST /api/route', () => {
  it('reports routeSource "mapbox" for a successful Mapbox response', async () => {
    const restore = withMapboxToken()
    stubFetch(async () => mockFetchResponse({ ok: true, json: MAPBOX_OK }))
    try {
      const res = await POST(
        postJson(URL, {
          origin: ORIGIN,
          stops: [stop('a', -37.8, 145.0), stop('b', -37.7, 145.2)],
          orderedStopIds: ['a', 'b'],
        })
      )
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.routeSource).toBe('mapbox')
      expect(json.isFallback).toBe(false)
    } finally {
      restore()
    }
  })

  it('falls back to "haversine-fallback" when Mapbox fails', async () => {
    const restore = withMapboxToken()
    stubFetch(async () => mockFetchResponse({ ok: false, status: 500, json: {} }))
    try {
      const res = await POST(
        postJson(URL, {
          origin: ORIGIN,
          stops: [stop('a', -37.8, 145.0), stop('b', -37.7, 145.2)],
          orderedStopIds: ['a', 'b'],
        })
      )
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.routeSource).toBe('haversine-fallback')
      expect(json.isFallback).toBe(true)
    } finally {
      restore()
    }
  })

  it('keeps isFallback in agreement with routeSource in both directions', async () => {
    // Mapbox path.
    const restore1 = withMapboxToken()
    stubFetch(async () => mockFetchResponse({ ok: true, json: MAPBOX_OK }))
    const okJson = await (
      await POST(postJson(URL, { origin: ORIGIN, stops: [stop('a', 0, 1)], orderedStopIds: ['a'] }))
    ).json()
    expect(okJson.isFallback).toBe(okJson.routeSource === 'haversine-fallback')
    restore1()
    vi.unstubAllGlobals()

    // Fallback path (no token → getMapboxToken throws).
    const restore2 = withoutMapboxToken()
    const fbJson = await (
      await POST(postJson(URL, { origin: ORIGIN, stops: [stop('a', 0, 1)], orderedStopIds: ['a'] }))
    ).json()
    expect(fbJson.routeSource).toBe('haversine-fallback')
    expect(fbJson.isFallback).toBe(true)
    restore2()
  })

  it('accepts a valid coordinate value of zero (fallback path)', async () => {
    const restore = withoutMapboxToken()
    try {
      const res = await POST(
        postJson(URL, {
          origin: { lat: 0, lng: 0 },
          stops: [stop('a', 0, 1)],
          orderedStopIds: ['a'],
        })
      )
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(Number.isFinite(json.totalDistanceKm)).toBe(true)
    } finally {
      restore()
    }
  })

  it('returns 400 for invalid coordinates', async () => {
    const res = await POST(
      postJson(URL, {
        origin: { lat: '0', lng: '0' },
        stops: [stop('a', 0, 1)],
        orderedStopIds: ['a'],
      })
    )
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_ORIGIN')
  })

  it('accepts exactly 15 destinations and rejects more than 15', async () => {
    const restore = withoutMapboxToken()
    try {
      const make = (n: number) => {
        const stops = Array.from({ length: n }, (_, i) => stop(`s${i}`, 0, i / 100))
        return { origin: ORIGIN, stops, orderedStopIds: stops.map((s) => s.id) }
      }
      const ok = await POST(postJson(URL, make(15)))
      expect(ok.status).toBe(200)
      const tooMany = await POST(postJson(URL, make(16)))
      expect(tooMany.status).toBe(400)
      expect((await tooMany.json()).code).toBe('TOO_MANY_DESTINATIONS')
    } finally {
      restore()
    }
  })

  it('keeps duplicate destinations represented in the legs', async () => {
    const restore = withoutMapboxToken()
    try {
      const res = await POST(
        postJson(URL, {
          origin: ORIGIN,
          stops: [stop('a', 0, 1), stop('b', 0, 1), stop('c', 0, 2)],
          orderedStopIds: ['a', 'b', 'c'],
        })
      )
      const json = await res.json()
      const toIds = json.legs.map((l: { toStopId: string }) => l.toStopId)
      expect(toIds).toEqual(['a', 'b', 'c'])
    } finally {
      restore()
    }
  })

  it('keeps fallback numeric values finite', async () => {
    const restore = withoutMapboxToken()
    try {
      const res = await POST(
        postJson(URL, {
          origin: ORIGIN,
          stops: [stop('a', -37.8, 145.0), stop('b', -37.7, 145.2)],
          orderedStopIds: ['a', 'b'],
        })
      )
      const json = await res.json()
      expect(Number.isFinite(json.totalDistanceKm)).toBe(true)
      expect(Number.isFinite(json.totalDurationMinutes)).toBe(true)
      for (const leg of json.legs) {
        expect(Number.isFinite(leg.distanceKm)).toBe(true)
        expect(Number.isFinite(leg.durationMinutes)).toBe(true)
      }
    } finally {
      restore()
    }
  })

  it('does not expose upstream Mapbox URLs or credentials on failure', async () => {
    const secret = 'pk.super-secret-token-DO-NOT-LEAK'
    const restore = withMapboxToken(secret)
    stubFetch(async () => mockFetchResponse({ ok: false, status: 500, json: {} }))
    try {
      const res = await POST(
        postJson(URL, {
          origin: ORIGIN,
          stops: [stop('a', 0, 1)],
          orderedStopIds: ['a'],
        })
      )
      const raw = JSON.stringify(await res.json())
      expect(raw).not.toContain(secret)
      expect(raw).not.toContain('api.mapbox.com')
      expect(raw).not.toContain('access_token')
    } finally {
      restore()
    }
  })
})
