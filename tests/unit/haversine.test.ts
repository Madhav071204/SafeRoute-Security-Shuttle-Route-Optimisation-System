import { describe, it, expect } from 'vitest'
import { haversineDistance, calculateRouteDistance } from '@/lib/algorithms/haversine'
import { Coordinates } from '@/types'

describe('haversineDistance', () => {
  it('returns zero for identical coordinates', () => {
    const p: Coordinates = { lat: -37.9105, lng: 145.1363 }
    expect(haversineDistance(p, p)).toBe(0)
  })

  it('matches a known public coordinate pair within tolerance (London -> Paris)', () => {
    const london: Coordinates = { lat: 51.5074, lng: -0.1278 }
    const paris: Coordinates = { lat: 48.8566, lng: 2.3522 }
    // Great-circle London->Paris is ~343 km. Allow a generous ±5 km tolerance.
    expect(haversineDistance(london, paris)).toBeCloseTo(343, -1)
    expect(haversineDistance(london, paris)).toBeGreaterThan(338)
    expect(haversineDistance(london, paris)).toBeLessThan(348)
  })

  it('is symmetric: distance A->B equals B->A', () => {
    const a: Coordinates = { lat: -37.9105, lng: 145.1363 }
    const b: Coordinates = { lat: -37.8136, lng: 144.9631 }
    expect(haversineDistance(a, b)).toBeCloseTo(haversineDistance(b, a), 10)
  })

  it('handles northern and southern hemisphere coordinates', () => {
    const north: Coordinates = { lat: 55.7558, lng: 37.6173 }
    const south: Coordinates = { lat: -33.8688, lng: 151.2093 }
    const d = haversineDistance(north, south)
    expect(Number.isFinite(d)).toBe(true)
    expect(d).toBeGreaterThan(0)
  })

  it('accepts coordinate value zero without treating it as missing', () => {
    const origin: Coordinates = { lat: 0, lng: 0 }
    const other: Coordinates = { lat: 0, lng: 1 }
    const d = haversineDistance(origin, other)
    // 1 degree of longitude at the equator is ~111 km.
    expect(d).toBeGreaterThan(100)
    expect(d).toBeLessThan(120)
  })

  it('returns a small positive distance for a very short separation', () => {
    const a: Coordinates = { lat: -37.9105, lng: 145.1363 }
    const b: Coordinates = { lat: -37.9105, lng: 145.1364 }
    const d = haversineDistance(a, b)
    expect(d).toBeGreaterThan(0)
    expect(d).toBeLessThan(0.05)
  })

  it('always returns a finite, non-negative number', () => {
    const samples: [Coordinates, Coordinates][] = [
      [{ lat: 0, lng: 0 }, { lat: 0, lng: 0 }],
      [{ lat: 90, lng: 180 }, { lat: -90, lng: -180 }],
      [{ lat: -37.9105, lng: 145.1363 }, { lat: 51.5074, lng: -0.1278 }],
    ]
    for (const [a, b] of samples) {
      const d = haversineDistance(a, b)
      expect(Number.isFinite(d)).toBe(true)
      expect(d).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('calculateRouteDistance', () => {
  it('returns zero for fewer than two points', () => {
    expect(calculateRouteDistance([])).toBe(0)
    expect(calculateRouteDistance([{ lat: 0, lng: 0 }])).toBe(0)
  })

  it('sums leg distances along an ordered path', () => {
    const path: Coordinates[] = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 0, lng: 2 },
    ]
    const total = calculateRouteDistance(path)
    const leg = haversineDistance(path[0], path[1])
    expect(total).toBeCloseTo(leg * 2, 6)
    expect(Number.isFinite(total)).toBe(true)
  })
})
