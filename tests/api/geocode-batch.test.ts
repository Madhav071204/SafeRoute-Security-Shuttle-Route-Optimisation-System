import { describe, it, expect, afterEach, vi } from 'vitest'
import { POST } from '@/app/api/geocode-batch/route'
import {
  postJson,
  withMapboxToken,
  stubFetch,
  mockFetchResponse,
} from './_helpers'
import { MAX_ADDRESS_LENGTH } from '@/lib/constants'

const URL = 'http://localhost/api/geocode-batch'

// Mapbox geocoding payload: features[].center = [lng, lat].
const geocodeHit = { features: [{ center: [145.1363, -37.9105] }] }
const geocodeMiss = { features: [] }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('POST /api/geocode-batch', () => {
  it('geocodes a valid small request', async () => {
    const restore = withMapboxToken()
    stubFetch(async () => mockFetchResponse({ ok: true, json: geocodeHit }))
    try {
      const res = await POST(postJson(URL, { addresses: [{ id: '1', address: '42 Clayton Road' }] }))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.results).toHaveLength(1)
      expect(json.results[0].success).toBe(true)
      expect(json.results[0].coordinates).toEqual({ lat: -37.9105, lng: 145.1363 })
    } finally {
      restore()
    }
  })

  it('rejects an empty array', async () => {
    const res = await POST(postJson(URL, { addresses: [] }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('EMPTY_BATCH')
  })

  it('rejects a missing addresses field', async () => {
    const res = await POST(postJson(URL, {}))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_ADDRESSES')
  })

  it('rejects non-array input', async () => {
    const res = await POST(postJson(URL, { addresses: 'not-an-array' }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_ADDRESSES')
  })

  it('rejects an empty address string', async () => {
    const res = await POST(postJson(URL, { addresses: [{ id: '1', address: '' }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('EMPTY_ADDRESS')
  })

  it('rejects a whitespace-only address', async () => {
    const res = await POST(postJson(URL, { addresses: [{ id: '1', address: '   ' }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('EMPTY_ADDRESS')
  })

  it('rejects a non-string address', async () => {
    const res = await POST(postJson(URL, { addresses: [{ id: '1', address: 123 }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_ADDRESS')
  })

  it('rejects an address over the maximum length', async () => {
    const res = await POST(
      postJson(URL, { addresses: [{ id: '1', address: 'x'.repeat(MAX_ADDRESS_LENGTH + 1) }] })
    )
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('ADDRESS_TOO_LONG')
  })

  it('preserves order and produces one entry per duplicate address', async () => {
    const restore = withMapboxToken()
    stubFetch(async () => mockFetchResponse({ ok: true, json: geocodeHit }))
    try {
      const res = await POST(
        postJson(URL, {
          addresses: [
            { id: 'first', address: '42 Clayton Road' },
            { id: 'second', address: '42 Clayton Road' },
          ],
        })
      )
      const json = await res.json()
      expect(json.results.map((r: { id: string }) => r.id)).toEqual(['first', 'second'])
    } finally {
      restore()
    }
  })

  it('accepts exactly 15 addresses and rejects more than 15', async () => {
    const restore = withMapboxToken()
    stubFetch(async () => mockFetchResponse({ ok: true, json: geocodeHit }))
    try {
      const make = (n: number) =>
        Array.from({ length: n }, (_, i) => ({ id: `${i}`, address: `Addr ${i}` }))
      const ok = await POST(postJson(URL, { addresses: make(15) }))
      expect(ok.status).toBe(200)
      const tooMany = await POST(postJson(URL, { addresses: make(16) }))
      expect(tooMany.status).toBe(400)
      expect((await tooMany.json()).code).toBe('TOO_MANY_ADDRESSES')
    } finally {
      restore()
    }
  })

  it('does not call Mapbox for structurally invalid requests', async () => {
    const restore = withMapboxToken()
    const fetchMock = stubFetch(async () => mockFetchResponse({ ok: true, json: geocodeHit }))
    try {
      await POST(postJson(URL, { addresses: 'nope' }))
      await POST(postJson(URL, { addresses: [{ id: '1', address: '' }] }))
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      restore()
    }
  })

  it('represents structurally valid but unresolved addresses as a failure entry', async () => {
    const restore = withMapboxToken()
    stubFetch(async () => mockFetchResponse({ ok: true, json: geocodeMiss }))
    try {
      const res = await POST(postJson(URL, { addresses: [{ id: '1', address: 'nowhere at all' }] }))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.results[0].success).toBe(false)
      expect(typeof json.results[0].error).toBe('string')
      expect(json.results[0].coordinates).toBeUndefined()
    } finally {
      restore()
    }
  })
})
