import { describe, it, expect } from 'vitest'
import {
  nearestNeighborRoute,
  fifoRoute,
  calculateTotalDistance,
} from '@/lib/algorithms/nearestNeighbor'
import { Coordinates } from '@/types'

interface Stop {
  id: string
  coordinates: Coordinates
}

const ORIGIN: Coordinates = { lat: 0, lng: 0 }

describe('nearestNeighborRoute', () => {
  it('returns an empty array for an empty stop list (function contract)', () => {
    expect(nearestNeighborRoute(ORIGIN, [])).toEqual([])
  })

  it('returns the single id for a one-stop list', () => {
    const stops: Stop[] = [{ id: 'a', coordinates: { lat: 0, lng: 1 } }]
    expect(nearestNeighborRoute(ORIGIN, stops)).toEqual(['a'])
  })

  it('orders multiple stops greedily by proximity (predictable ordering)', () => {
    // Provided out of order; nearest-neighbour from the equatorial origin must
    // visit the closest longitude first.
    const stops: Stop[] = [
      { id: 'c', coordinates: { lat: 0, lng: 3 } },
      { id: 'b', coordinates: { lat: 0, lng: 2 } },
      { id: 'a', coordinates: { lat: 0, lng: 1 } },
    ]
    expect(nearestNeighborRoute(ORIGIN, stops)).toEqual(['a', 'b', 'c'])
  })

  it('treats coordinate value zero as a real location', () => {
    const stops: Stop[] = [
      { id: 'far', coordinates: { lat: 0, lng: 5 } },
      { id: 'origin-point', coordinates: { lat: 0, lng: 0 } },
    ]
    // The stop that sits exactly on {0,0} is the nearest to the origin.
    expect(nearestNeighborRoute(ORIGIN, stops)[0]).toBe('origin-point')
  })

  it('keeps duplicate-coordinate stops present in the output', () => {
    const stops: Stop[] = [
      { id: 'a', coordinates: { lat: 0, lng: 1 } },
      { id: 'b', coordinates: { lat: 0, lng: 1 } },
      { id: 'c', coordinates: { lat: 0, lng: 2 } },
    ]
    const result = nearestNeighborRoute(ORIGIN, stops)
    expect(result).toHaveLength(3)
    expect(result).toContain('a')
    expect(result).toContain('b')
    expect(result).toContain('c')
  })

  it('outputs every input stop exactly once', () => {
    const stops: Stop[] = [
      { id: 'a', coordinates: { lat: 0, lng: 1 } },
      { id: 'b', coordinates: { lat: 0, lng: 2 } },
      { id: 'c', coordinates: { lat: 0, lng: 3 } },
      { id: 'd', coordinates: { lat: 1, lng: 1 } },
    ]
    const result = nearestNeighborRoute(ORIGIN, stops)
    expect(result.slice().sort()).toEqual(['a', 'b', 'c', 'd'])
    expect(new Set(result).size).toBe(result.length)
  })

  it('does not mutate the input array', () => {
    const stops: Stop[] = [
      { id: 'c', coordinates: { lat: 0, lng: 3 } },
      { id: 'b', coordinates: { lat: 0, lng: 2 } },
      { id: 'a', coordinates: { lat: 0, lng: 1 } },
    ]
    const snapshot = stops.map((s) => s.id)
    nearestNeighborRoute(ORIGIN, stops)
    expect(stops.map((s) => s.id)).toEqual(snapshot)
  })

  it('is deterministic for equidistant ties (stable, repeatable order)', () => {
    // {0,1} and {1,0} are exactly equidistant from {0,0}.
    const stops: Stop[] = [
      { id: 'first', coordinates: { lat: 0, lng: 1 } },
      { id: 'second', coordinates: { lat: 1, lng: 0 } },
    ]
    const run1 = nearestNeighborRoute(ORIGIN, stops)
    const run2 = nearestNeighborRoute(ORIGIN, stops)
    expect(run1).toEqual(run2)
    // The first-listed equidistant stop wins the tie (strict "<" comparison).
    expect(run1[0]).toBe('first')
  })

  it('never emits the origin as one of the ordered stops', () => {
    const stops: Stop[] = [
      { id: 'a', coordinates: { lat: 0, lng: 1 } },
      { id: 'b', coordinates: { lat: 0, lng: 2 } },
    ]
    const result = nearestNeighborRoute(ORIGIN, stops)
    expect(result).not.toContain('origin')
    expect(result).toHaveLength(stops.length)
  })
})

describe('fifoRoute', () => {
  it('preserves the provided order including duplicates', () => {
    const stops: Stop[] = [
      { id: 'a', coordinates: { lat: 0, lng: 1 } },
      { id: 'b', coordinates: { lat: 0, lng: 1 } },
      { id: 'c', coordinates: { lat: 0, lng: 2 } },
    ]
    expect(fifoRoute(stops)).toEqual(['a', 'b', 'c'])
  })
})

describe('calculateTotalDistance', () => {
  it('returns a finite total for an ordered route', () => {
    const stops: Stop[] = [
      { id: 'a', coordinates: { lat: 0, lng: 1 } },
      { id: 'b', coordinates: { lat: 0, lng: 2 } },
      { id: 'c', coordinates: { lat: 0, lng: 3 } },
    ]
    const order = nearestNeighborRoute(ORIGIN, stops)
    const total = calculateTotalDistance(ORIGIN, stops, order)
    expect(Number.isFinite(total)).toBe(true)
    expect(total).toBeGreaterThan(0)
  })

  it('returns zero for an empty order', () => {
    expect(calculateTotalDistance(ORIGIN, [], [])).toBe(0)
  })

  it('handles a zero-coordinate origin without producing NaN', () => {
    const stops: Stop[] = [{ id: 'a', coordinates: { lat: 0, lng: 1 } }]
    const total = calculateTotalDistance({ lat: 0, lng: 0 }, stops, ['a'])
    expect(Number.isFinite(total)).toBe(true)
    expect(total).toBeGreaterThan(0)
  })
})
