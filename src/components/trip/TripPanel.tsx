'use client'

import { useTrip } from '@/context/TripContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { StopList } from './StopList'
import { createDemoStops } from '@/data/demo'
import { MAX_STOPS, MIN_STOPS_FOR_OPTIMIZATION } from '@/lib/constants'

export function TripPanel() {
  const {
    trip,
    routes,
    isGeocoding,
    isOptimizing,
    addStop,
    clearTrip,
    loadDemoData,
    setIsGeocoding,
    setGeocodeResults,
    setIsOptimizing,
    setRoutes,
    startExecution,
  } = useTrip()

  const canAddStop = trip.stops.length < MAX_STOPS
  const canGeocode = trip.stops.length > 0 && trip.stops.some((s) => s.address.trim() !== '')
  const canOptimize =
    trip.stops.length >= MIN_STOPS_FOR_OPTIMIZATION &&
    trip.stops.every((s) => s.geocodeStatus === 'success')
  const hasRoutes = routes.fifo && routes.optimized
  const isExecuting = trip.status === 'executing'
  const isDisabled = isGeocoding || isOptimizing || isExecuting

  const handleLoadDemo = () => {
    loadDemoData(createDemoStops())
  }

  const handleGeocode = async () => {
    const stopsToGeocode = trip.stops.filter((s) => s.address.trim() !== '')
    if (stopsToGeocode.length === 0) return

    setIsGeocoding(true)

    try {
      const response = await fetch('/api/geocode-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addresses: stopsToGeocode.map((s) => ({ id: s.id, address: s.address })),
        }),
      })

      if (!response.ok) {
        throw new Error('Geocoding failed')
      }

      const data = await response.json()
      setGeocodeResults(
        data.results.map((r: { id: string; success: boolean; coordinates?: { lat: number; lng: number }; error?: string }) => ({
          id: r.id,
          coordinates: r.success ? r.coordinates : null,
          error: r.error,
        }))
      )
    } catch (error) {
      console.error('Geocoding error:', error)
      setGeocodeResults(
        stopsToGeocode.map((s) => ({
          id: s.id,
          coordinates: null,
          error: 'Network error. Please try again.',
        }))
      )
    } finally {
      setIsGeocoding(false)
    }
  }

  const handleOptimize = async () => {
    const geocodedStops = trip.stops.filter((s) => s.coordinates)
    if (geocodedStops.length < MIN_STOPS_FOR_OPTIMIZATION) return

    setIsOptimizing(true)

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: trip.origin.coordinates,
          stops: geocodedStops.map((s) => ({
            id: s.id,
            coordinates: s.coordinates,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Optimization failed')
      }

      const optimizeData = await response.json()

      // Get route details for both FIFO and optimized
      const fifoOrder = geocodedStops.map((s) => s.id)
      
      const [fifoRouteRes, optimizedRouteRes] = await Promise.all([
        fetch('/api/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: trip.origin.coordinates,
            stops: geocodedStops.map((s) => ({ id: s.id, coordinates: s.coordinates })),
            orderedStopIds: fifoOrder,
          }),
        }),
        fetch('/api/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: trip.origin.coordinates,
            stops: geocodedStops.map((s) => ({ id: s.id, coordinates: s.coordinates })),
            orderedStopIds: optimizeData.orderedStopIds,
          }),
        }),
      ])

      const [fifoRoute, optimizedRoute] = await Promise.all([
        fifoRouteRes.json(),
        optimizedRouteRes.json(),
      ])

      setRoutes(
        {
          type: 'fifo',
          orderedStopIds: fifoOrder,
          polyline: fifoRoute.polyline || '',
          legs: fifoRoute.legs || [],
          metrics: {
            totalDistanceKm: fifoRoute.totalDistanceKm || 0,
            totalDurationMinutes: fifoRoute.totalDurationMinutes || 0,
            estimatedFuelCostAud: 0, // Will be calculated by component
          },
        },
        {
          type: 'optimized',
          orderedStopIds: optimizeData.orderedStopIds,
          polyline: optimizedRoute.polyline || '',
          legs: optimizedRoute.legs || [],
          metrics: {
            totalDistanceKm: optimizedRoute.totalDistanceKm || 0,
            totalDurationMinutes: optimizedRoute.totalDurationMinutes || 0,
            estimatedFuelCostAud: 0,
          },
        }
      )
    } catch (error) {
      console.error('Optimization error:', error)
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trip Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick actions */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLoadDemo}
            disabled={isDisabled || trip.stops.length > 0}
            className="flex-1"
          >
            Load Demo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTrip}
            disabled={isDisabled || trip.stops.length === 0}
            className="flex-1"
          >
            Clear All
          </Button>
        </div>

        {/* Stop list */}
        <StopList disabled={isDisabled} />

        {/* Action buttons */}
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={addStop}
            disabled={!canAddStop || isDisabled}
            className="w-full"
          >
            + Add Stop
          </Button>

          <Button
            variant="primary"
            onClick={handleGeocode}
            disabled={!canGeocode || isDisabled}
            isLoading={isGeocoding}
            className="w-full"
          >
            {isGeocoding ? 'Locating...' : 'Locate All Addresses'}
          </Button>

          <Button
            variant="primary"
            onClick={handleOptimize}
            disabled={!canOptimize || isDisabled}
            isLoading={isOptimizing}
            className="w-full"
          >
            {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
          </Button>

          {hasRoutes && (
            <Button
              variant="primary"
              onClick={startExecution}
              disabled={isDisabled}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Start Trip
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
