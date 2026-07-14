// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Route, RouteSource } from '@/types'

// Configurable context value read by the mocked useTrip hook.
type MockTrip = {
  routes: { fifo: Route | null; optimized: Route | null }
  selectedRouteType: 'fifo' | 'optimized'
  setSelectedRouteType: () => void
  trip: { origin: { address: string } }
  originSource: 'live_location' | 'fallback_monash'
}

let mockTripValue: MockTrip

vi.mock('@/context/TripContext', () => ({
  useTrip: () => mockTripValue,
}))

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({ calculateFuelCost: (km: number) => km * 0.2 }),
}))

// Import after mocks are registered.
import { RouteComparison } from '@/components/results/RouteComparison'

function makeRoute(type: 'fifo' | 'optimized', distanceKm: number, durationMin: number, source: RouteSource): Route {
  return {
    type,
    orderedStopIds: ['a', 'b'],
    polyline: source === 'mapbox' ? 'poly' : '',
    legs: [],
    metrics: {
      totalDistanceKm: distanceKm,
      totalDurationMinutes: durationMin,
      estimatedFuelCostAud: 0,
    },
    source,
  }
}

function setRoutes(source: RouteSource) {
  mockTripValue = {
    routes: {
      fifo: makeRoute('fifo', 12.5, 30, source),
      optimized: makeRoute('optimized', 10.0, 24, source),
    },
    selectedRouteType: 'optimized',
    setSelectedRouteType: () => {},
    trip: { origin: { address: 'Monash University' } },
    originSource: 'fallback_monash',
  }
}

beforeEach(() => {
  setRoutes('mapbox')
})

describe('RouteComparison fallback presentation', () => {
  it('does not show the fallback notice for a Mapbox result', () => {
    setRoutes('mapbox')
    render(<RouteComparison />)
    expect(screen.queryByText(/straight-line estimate/i)).toBeNull()
  })

  it('shows an explicit estimate notice for a Haversine fallback result', () => {
    setRoutes('haversine-fallback')
    render(<RouteComparison />)
    expect(screen.getByText(/straight-line estimate/i)).toBeInTheDocument()
  })

  it('describes fallback values as approximate estimates, not road-network results', () => {
    setRoutes('haversine-fallback')
    render(<RouteComparison />)
    const notice = screen.getByText(/straight-line estimate/i)
    const text = notice.textContent ?? ''
    expect(text).toMatch(/approximate/i)
    expect(text).toMatch(/unavailable/i)
    // It must not claim the estimate is real live/road-network routing.
    expect(text).not.toMatch(/live road-network route/i)
  })

  it('keeps distance and duration information visible', () => {
    setRoutes('mapbox')
    render(<RouteComparison />)
    expect(screen.getByText(/12\.5 km/)).toBeInTheDocument()
    expect(screen.getByText(/10\.0 km/)).toBeInTheDocument()
    expect(screen.getByText(/30 min/)).toBeInTheDocument()
    expect(screen.getByText(/24 min/)).toBeInTheDocument()
  })

  it('renders an empty state when routes are not yet calculated', () => {
    mockTripValue = {
      routes: { fifo: null, optimized: null },
      selectedRouteType: 'optimized',
      setSelectedRouteType: () => {},
      trip: { origin: { address: 'Monash University' } },
      originSource: 'fallback_monash',
    }
    render(<RouteComparison />)
    expect(screen.getByText(/no routes calculated yet/i)).toBeInTheDocument()
  })
})
