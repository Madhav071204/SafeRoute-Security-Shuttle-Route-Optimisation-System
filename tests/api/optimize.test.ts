import { describe, it, expect } from 'vitest'
import { POST } from '@/app/api/optimize/route'
import { postJson } from './_helpers'

const URL = 'http://localhost/api/optimize'
const ORIGIN = { lat: -37.9105, lng: 145.1363 }

function stop(id: string, lat: number, lng: number) {
  return { id, coordinates: { lat, lng } }
}

describe('POST /api/optimize', () => {
  it('optimizes a valid origin with multiple stops', async () => {
    const res = await POST(
      postJson(URL, {
        origin: ORIGIN,
        stops: [stop('a', -37.8, 145.0), stop('b', -37.7, 145.2), stop('c', -37.9, 145.3)],
      })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.orderedStopIds.slice().sort()).toEqual(['a', 'b', 'c'])
    expect(Number.isFinite(json.totalDistanceKm)).toBe(true)
    expect(json.totalDistanceKm).toBeGreaterThanOrEqual(0)
  })

  it('accepts an origin with zero coordinates', async () => {
    const res = await POST(
      postJson(URL, { origin: { lat: 0, lng: 0 }, stops: [stop('a', 0, 1), stop('b', 0, 2)] })
    )
    expect(res.status).toBe(200)
  })

  it('accepts a stop with zero coordinates', async () => {
    const res = await POST(
      postJson(URL, { origin: ORIGIN, stops: [stop('a', 0, 0), stop('b', 0, 1)] })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.orderedStopIds).toContain('a')
  })

  it('rejects a missing origin', async () => {
    const res = await POST(postJson(URL, { stops: [stop('a', 0, 1)] }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_ORIGIN')
  })

  it('rejects missing stops (not an array)', async () => {
    const res = await POST(postJson(URL, { origin: ORIGIN }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_STOPS')
  })

  it('treats empty stops as a valid empty result', async () => {
    const res = await POST(postJson(URL, { origin: ORIGIN, stops: [] }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.orderedStopIds).toEqual([])
    expect(json.totalDistanceKm).toBe(0)
  })

  it('rejects numeric-string coordinates', async () => {
    const res = await POST(
      postJson(URL, { origin: ORIGIN, stops: [{ id: 'a', coordinates: { lat: '0', lng: '1' } }] })
    )
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_COORDINATES')
  })

  it('rejects a null coordinate', async () => {
    const res = await POST(
      postJson(URL, { origin: ORIGIN, stops: [{ id: 'a', coordinates: null }] })
    )
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_COORDINATES')
  })

  it('rejects an out-of-range latitude', async () => {
    const res = await POST(
      postJson(URL, { origin: ORIGIN, stops: [stop('a', 91, 0)] })
    )
    expect(res.status).toBe(400)
  })

  it('rejects an out-of-range longitude', async () => {
    const res = await POST(
      postJson(URL, { origin: ORIGIN, stops: [stop('a', 0, 181)] })
    )
    expect(res.status).toBe(400)
  })

  it('rejects a batch mixing valid and invalid stops (reports the index)', async () => {
    const res = await POST(
      postJson(URL, { origin: ORIGIN, stops: [stop('a', 0, 1), stop('b', 999, 0)] })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.details.stopIndex).toBe(1)
  })

  it('keeps duplicate destinations represented in the output', async () => {
    const res = await POST(
      postJson(URL, {
        origin: ORIGIN,
        stops: [stop('a', 0, 1), stop('b', 0, 1), stop('c', 0, 2)],
      })
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.orderedStopIds.slice().sort()).toEqual(['a', 'b', 'c'])
  })

  it('accepts exactly 15 destinations', async () => {
    const stops = Array.from({ length: 15 }, (_, i) => stop(`s${i}`, 0, i / 100))
    const res = await POST(postJson(URL, { origin: ORIGIN, stops }))
    expect(res.status).toBe(200)
    expect((await res.json()).orderedStopIds).toHaveLength(15)
  })

  it('rejects more than 15 destinations', async () => {
    const stops = Array.from({ length: 16 }, (_, i) => stop(`s${i}`, 0, i / 100))
    const res = await POST(postJson(URL, { origin: ORIGIN, stops }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('TOO_MANY_DESTINATIONS')
  })

  it('never returns invalid numeric values in a success response', async () => {
    const res = await POST(
      postJson(URL, { origin: { lat: 0, lng: 0 }, stops: [stop('a', 0, 0), stop('b', 0, 1)] })
    )
    const json = await res.json()
    expect(Number.isFinite(json.totalDistanceKm)).toBe(true)
    expect(json.orderedStopIds.every((id: unknown) => typeof id === 'string')).toBe(true)
  })
})
