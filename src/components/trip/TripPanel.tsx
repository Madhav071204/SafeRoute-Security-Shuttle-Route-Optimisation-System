'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTrip } from '@/context/TripContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
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

  const allGeocoded = trip.stops.length > 0 && trip.stops.every((s) => s.geocodeStatus === 'success')
  const hasGeocodingErrors = trip.stops.some((s) => s.geocodeStatus === 'failed')
  const pendingGeocoding = trip.stops.some((s) => s.address.trim() !== '' && s.geocodeStatus === 'pending')

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
            estimatedFuelCostAud: 0,
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
    <Card variant="glass" className="sticky top-24">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              Trip Planner
            </CardTitle>
            <CardDescription>
              Add up to {MAX_STOPS} passenger destinations
            </CardDescription>
          </div>
          <div className="text-sm font-medium text-surface-500 dark:text-surface-400">
            {trip.stops.length}/{MAX_STOPS}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLoadDemo}
            disabled={isDisabled || trip.stops.length > 0}
            className="flex-1"
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            }
          >
            Load Demo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTrip}
            disabled={isDisabled || trip.stops.length === 0}
            className="flex-1"
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          >
            Clear All
          </Button>
        </div>

        <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
          <StopList disabled={isDisabled} />
        </div>

        <div className="space-y-3 pt-2 border-t border-surface-200 dark:border-surface-700">
          <Button
            variant="outline"
            onClick={addStop}
            disabled={!canAddStop || isDisabled}
            fullWidth
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add Stop
          </Button>

          <AnimatePresence mode="wait">
            {pendingGeocoding && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Button
                  variant="primary"
                  onClick={handleGeocode}
                  disabled={!canGeocode || isDisabled}
                  isLoading={isGeocoding}
                  fullWidth
                  leftIcon={
                    !isGeocoding && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )
                  }
                >
                  {isGeocoding ? 'Locating Addresses...' : 'Locate All Addresses'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {allGeocoded && !hasRoutes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Button
                  variant="primary"
                  onClick={handleOptimize}
                  disabled={!canOptimize || isDisabled}
                  isLoading={isOptimizing}
                  fullWidth
                  leftIcon={
                    !isOptimizing && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )
                  }
                >
                  {isOptimizing ? 'Optimizing Route...' : 'Optimize Route'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {hasRoutes && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Button
                  variant="success"
                  onClick={startExecution}
                  disabled={isDisabled}
                  fullWidth
                  size="lg"
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                >
                  Start Trip
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {hasGeocodingErrors && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-danger-600 dark:text-danger-400 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Some addresses could not be found. Please check and retry.
            </motion.p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
