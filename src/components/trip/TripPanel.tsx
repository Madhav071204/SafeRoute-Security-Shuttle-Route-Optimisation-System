'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTrip } from '@/context/TripContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { StopList } from './StopList'
import { createDemoStops } from '@/data/demo'
import { MAX_STOPS, MIN_STOPS_FOR_OPTIMIZATION, LOCATION_TIMEOUT_MS } from '@/lib/constants'
import { getCurrentLocation, resolveRouteOrigin, getOriginStatusMessage } from '@/lib/origin'
import { Coordinates, RouteOrigin } from '@/types'

export function TripPanel() {
  const {
    trip,
    routes,
    isGeocoding,
    isOptimizing,
    originSource,
    addStop,
    clearTrip,
    loadDemoData,
    setTripOrigin,
    setIsGeocoding,
    setGeocodeResults,
    setIsOptimizing,
    setRoutes,
    startExecution,
  } = useTrip()

  const [isAcquiringLocation, setIsAcquiringLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [originStatus, setOriginStatus] = useState<{ message: string; type: 'success' | 'warning' } | null>(null)

  const canAddStop = trip.stops.length < MAX_STOPS
  const hasRoutes = routes.fifo && routes.optimized
  const isExecuting = trip.status === 'executing'
  const isDisabled = isGeocoding || isOptimizing || isExecuting

  const stopsWithCoordinates = trip.stops.filter((s) => s.coordinates !== null)
  const stopsWithAddressButNoCoords = trip.stops.filter((s) => s.address.trim() !== '' && s.coordinates === null)
  
  const allStopsHaveCoordinates = trip.stops.length > 0 && stopsWithCoordinates.length === trip.stops.length
  const canOptimize = stopsWithCoordinates.length >= MIN_STOPS_FOR_OPTIMIZATION
  const canGeocode = stopsWithAddressButNoCoords.length > 0
  const hasGeocodingErrors = trip.stops.some((s) => s.geocodeStatus === 'failed')
  
  const showGeocodeButton = canGeocode && !allStopsHaveCoordinates

  const handleLoadDemo = () => {
    loadDemoData(createDemoStops())
  }

  const acquireLocation = useCallback(async (): Promise<Coordinates | null> => {
    setIsAcquiringLocation(true)
    setLocationError(null)

    const location = await getCurrentLocation(LOCATION_TIMEOUT_MS)
    
    setIsAcquiringLocation(false)
    
    if (!location) {
      setLocationError('Location unavailable — using Monash University as starting point')
    }
    
    return location
  }, [])

  const handleStartTrip = useCallback(async () => {
    setShowLocationPrompt(false)
    
    const location = await acquireLocation()
    
    if (location) {
      // Start execution with the live location as origin
      startExecution(location)
    } else {
      // Show error but allow retry
      setShowLocationPrompt(true)
    }
  }, [acquireLocation, startExecution])

  const handleStartWithoutLocation = useCallback(() => {
    setShowLocationPrompt(false)
    setLocationError(null)
    // Start with the default/preset origin
    startExecution()
  }, [startExecution])

  const handleShowLocationPrompt = useCallback(() => {
    setShowLocationPrompt(true)
    setLocationError(null)
  }, [])

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
    setOriginStatus(null)

    try {
      // Step 1: Try to get the user's current location
      const liveLocation = await getCurrentLocation(LOCATION_TIMEOUT_MS)
      
      // Step 2: Resolve the route origin (live location or Monash fallback)
      const resolvedOrigin = resolveRouteOrigin(liveLocation)
      
      // Step 3: Update the trip origin
      setTripOrigin(resolvedOrigin)
      
      // Step 4: Show origin status
      const status = getOriginStatusMessage(resolvedOrigin)
      setOriginStatus(status)
      
      // Step 5: Run optimization with the resolved origin
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: resolvedOrigin.coordinates,
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
      
      // Step 6: Get route details for both FIFO and optimized using the same origin
      const [fifoRouteRes, optimizedRouteRes] = await Promise.all([
        fetch('/api/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: resolvedOrigin.coordinates,
            stops: geocodedStops.map((s) => ({ id: s.id, coordinates: s.coordinates })),
            orderedStopIds: fifoOrder,
          }),
        }),
        fetch('/api/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: resolvedOrigin.coordinates,
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
          source: fifoRoute.routeSource,
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
          source: optimizedRoute.routeSource,
        }
      )
    } catch (error) {
      console.error('Optimization error:', error)
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <Card variant="glass" className="self-start xl:sticky xl:top-24">
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
            variant="ghost"
            size="sm"
            onClick={handleLoadDemo}
            disabled={isDisabled || trip.stops.length > 0}
            className="flex-1 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            }
          >
            Load Demo Data
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
            {showGeocodeButton && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Button
                  variant="secondary"
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
                  {isGeocoding ? 'Locating...' : `Locate ${stopsWithAddressButNoCoords.length} Address${stopsWithAddressButNoCoords.length > 1 ? 'es' : ''}`}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {canOptimize && !hasRoutes && (
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
                  {isOptimizing ? 'Getting location & optimizing...' : 'Optimize Route'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Origin status indicator */}
          <AnimatePresence>
            {originStatus && hasRoutes && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`rounded-lg px-3 py-2 flex items-center gap-2 ${
                  originStatus.type === 'success'
                    ? 'bg-success-50 dark:bg-success-900/20 border border-success-200/50 dark:border-success-800/50'
                    : 'bg-warning-50 dark:bg-warning-900/20 border border-warning-200/50 dark:border-warning-800/50'
                }`}
              >
                <svg
                  className={`w-4 h-4 flex-shrink-0 ${
                    originStatus.type === 'success'
                      ? 'text-success-600 dark:text-success-400'
                      : 'text-warning-600 dark:text-warning-400'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {originStatus.type === 'success' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  )}
                </svg>
                <span
                  className={`text-xs font-medium ${
                    originStatus.type === 'success'
                      ? 'text-success-700 dark:text-success-300'
                      : 'text-warning-700 dark:text-warning-300'
                  }`}
                >
                  {originStatus.message}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {hasRoutes && !showLocationPrompt && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Button
                  variant="success"
                  onClick={handleShowLocationPrompt}
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

          {/* Location acquisition prompt */}
          <AnimatePresence mode="wait">
            {hasRoutes && showLocationPrompt && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200/50 dark:border-primary-800/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-800/50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                        Use your current location?
                      </h4>
                      <p className="text-xs text-primary-700 dark:text-primary-300 mt-1">
                        The route will start from your van&apos;s current position for accurate navigation.
                      </p>
                    </div>
                  </div>

                  {/* Location error */}
                  {locationError && (
                    <div className="mt-3 bg-warning-100 dark:bg-warning-900/30 rounded-lg px-3 py-2">
                      <p className="text-xs text-warning-700 dark:text-warning-300 flex items-center gap-1.5">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {locationError}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleStartTrip}
                      disabled={isAcquiringLocation}
                      isLoading={isAcquiringLocation}
                      leftIcon={
                        !isAcquiringLocation && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )
                      }
                    >
                      {isAcquiringLocation ? 'Getting...' : 'Use Location'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartWithoutLocation}
                      disabled={isAcquiringLocation}
                    >
                      Skip
                    </Button>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLocationPrompt(false)}
                  fullWidth
                >
                  Cancel
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
