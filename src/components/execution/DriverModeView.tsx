'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTrip } from '@/context/TripContext'
import { useDriverLocation } from '@/hooks/useDriverLocation'
import { DriverMapView } from '@/components/map/DriverMapView'
import { NavigationInstructionCard } from '@/components/map/NavigationInstructionCard'
import { CurrentStopCard } from './CurrentStopCard'
import { UpcomingStopsDrawer } from './UpcomingStopsDrawer'
import { Button } from '@/components/ui/Button'
import { fetchDirections, calculateDistanceToPoint, findCurrentStepIndex, isOffRoute, getRemainingDistance, getRemainingDuration, getDistanceToRoute, calculateOffRouteThreshold } from '@/lib/directions'
import { Coordinates } from '@/types'
import clsx from 'clsx'

// Constants for off-route detection
const RECALCULATION_COOLDOWN_MS = 15000 // 15 seconds between recalculations
const CONSECUTIVE_OFF_ROUTE_REQUIRED = 3 // Need 3 consecutive off-route readings
const POST_ROUTE_UPDATE_GRACE_PERIOD_MS = 10000 // 10 seconds grace after route update

export type DriverStopAction = 'arrived' | 'picked_up' | 'no_show'

export interface DriverModeViewProps {
  onStopAction?: (stopId: string, action: DriverStopAction) => void | Promise<void>
}

export function DriverModeView({ onStopAction }: DriverModeViewProps) {
  const {
    trip,
    routes,
    selectedRouteType,
    executionState,
    navigationState,
    markStopComplete,
    endExecution,
    setDriverLocation,
    setTrackingMode,
    setLocationPermission,
    setNavigationState,
    setNavigationRoute,
    setIsRecalculating,
    setIsOffRoute,
  } = useTrip()

  const {
    location,
    error: locationError,
    hasPermission,
    requestPermission,
    stopTracking,
  } = useDriverLocation()

  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false)
  const [navigationError, setNavigationError] = useState<string | null>(null)
  const [isInitialFetch, setIsInitialFetch] = useState(true)
  const [stopActionBusy, setStopActionBusy] = useState<DriverStopAction | null>(null)
  const [stopActionError, setStopActionError] = useState<string | null>(null)
  
  // Off-route tracking refs (using refs to avoid causing re-renders)
  const consecutiveOffRouteCountRef = useRef(0)
  const lastRecalculationTimeRef = useRef(0)
  const routeUpdatedAtRef = useRef(0)
  const isFetchingRef = useRef(false)

  const selectedRoute = selectedRouteType === 'fifo' ? routes.fifo : routes.optimized
  const orderedStopIds = selectedRoute?.orderedStopIds ?? []
  const legs = selectedRoute?.legs ?? []
  const { currentStopIndex, completedStopIds, trackingMode, driverLocation } = executionState
  const totalStops = orderedStopIds.length
  const completedCount = completedStopIds.length

  const currentStopId = orderedStopIds[currentStopIndex]
  const currentStop = trip.stops.find((s) => s.id === currentStopId)
  const currentLeg = legs[currentStopIndex]

  const handleStopAction = useCallback(async (action: DriverStopAction) => {
    if (!currentStopId) return
    if (!onStopAction) return
    if (stopActionBusy) return

    setStopActionBusy(action)
    setStopActionError(null)
    try {
      await onStopAction(currentStopId, action)
      if (action === 'picked_up' || action === 'no_show') {
        markStopComplete()
      }
    } catch (e) {
      setStopActionError(e instanceof Error ? e.message : 'Failed to update stop')
    } finally {
      setStopActionBusy(null)
    }
  }, [currentStopId, onStopAction, stopActionBusy, markStopComplete])

  // Get current destination coordinates
  const destinationCoordinates = useMemo((): Coordinates | null => {
    if (!currentStop?.coordinates) return null
    return currentStop.coordinates
  }, [currentStop])

  // Fetch navigation route
  const fetchNavigationRoute = useCallback(async (isRecalculation: boolean = false) => {
    if (!driverLocation || !destinationCoordinates) {
      console.log('[Navigation] Cannot fetch: missing driver location or destination')
      return
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('[Navigation] Fetch already in progress, skipping')
      return
    }

    const now = Date.now()
    
    // Check cooldown for recalculations (not for initial fetch)
    if (isRecalculation) {
      const timeSinceLastRecalc = now - lastRecalculationTimeRef.current
      if (timeSinceLastRecalc < RECALCULATION_COOLDOWN_MS) {
        console.log('[Navigation] Recalculation cooldown active:', {
          timeSinceLastRecalc,
          cooldown: RECALCULATION_COOLDOWN_MS,
          remainingMs: RECALCULATION_COOLDOWN_MS - timeSinceLastRecalc,
        })
        return
      }
    }

    isFetchingRef.current = true
    setIsRecalculating(true)
    setNavigationError(null)

    console.log('[Navigation] Fetching route...', { isRecalculation })

    try {
      const response = await fetchDirections(
        driverLocation.coordinates,
        destinationCoordinates
      )

      if (response.success && response.route) {
        const updateTime = Date.now()
        lastRecalculationTimeRef.current = updateTime
        routeUpdatedAtRef.current = updateTime
        consecutiveOffRouteCountRef.current = 0 // Reset off-route count
        
        setNavigationRoute(response.route)
        setNavigationState({
          destinationStopId: currentStopId,
          distanceToDestination: response.route.distance,
          etaToDestination: response.route.duration,
          isOffRoute: false,
        })
        setIsOffRoute(false)
        setIsInitialFetch(false)
        
        console.log('[Navigation] Route updated successfully:', {
          distance: response.route.distance,
          duration: response.route.duration,
          pointCount: response.route.geometry.coordinates.length,
        })
      } else {
        setNavigationError(response.error || 'Failed to fetch route')
        console.log('[Navigation] Route fetch failed:', response.error)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error'
      setNavigationError(errorMsg)
      console.log('[Navigation] Route fetch error:', errorMsg)
    } finally {
      isFetchingRef.current = false
      setIsRecalculating(false)
    }
  }, [
    driverLocation,
    destinationCoordinates,
    currentStopId,
    setIsRecalculating,
    setNavigationRoute,
    setNavigationState,
    setIsOffRoute,
  ])

  // Update driver location in context
  useEffect(() => {
    if (location) {
      setDriverLocation(location)
    }
  }, [location, setDriverLocation])

  // Sync permission state
  useEffect(() => {
    if (hasPermission !== null) {
      setLocationPermission(hasPermission)
    }
  }, [hasPermission, setLocationPermission])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking()
      setDriverLocation(null)
    }
  }, [stopTracking, setDriverLocation])

  // Fetch initial route when we have driver location and destination
  useEffect(() => {
    if (isInitialFetch && driverLocation && destinationCoordinates && !navigationState.route) {
      fetchNavigationRoute(false) // Not a recalculation
    }
  }, [isInitialFetch, driverLocation, destinationCoordinates, navigationState.route, fetchNavigationRoute])

  // Update navigation state based on driver movement
  useEffect(() => {
    // Skip if no route, no location, or currently recalculating
    if (!navigationState.route || !driverLocation || navigationState.isRecalculating) {
      return
    }
    
    // Skip if a fetch is in progress
    if (isFetchingRef.current) {
      return
    }

    const currentPos = driverLocation.coordinates
    const gpsAccuracy = driverLocation.accuracy
    const now = Date.now()
    
    // Check if we're in the grace period after a route update
    const timeSinceRouteUpdate = now - routeUpdatedAtRef.current
    const inGracePeriod = timeSinceRouteUpdate < POST_ROUTE_UPDATE_GRACE_PERIOD_MS
    
    // Get distance to route for both instruction progression and off-route detection
    const distanceToRoute = getDistanceToRoute(currentPos, navigationState.route.geometry)
    const offRouteThreshold = calculateOffRouteThreshold(gpsAccuracy)
    const currentlyOffRoute = distanceToRoute > offRouteThreshold

    // Off-route detection logic (separate from instruction progression)
    if (!inGracePeriod) {
      if (currentlyOffRoute) {
        consecutiveOffRouteCountRef.current += 1
        
        console.log('[Navigation] Off-route detected:', {
          consecutiveCount: consecutiveOffRouteCountRef.current,
          requiredCount: CONSECUTIVE_OFF_ROUTE_REQUIRED,
          distanceToRoute: Math.round(distanceToRoute),
          threshold: Math.round(offRouteThreshold),
          gpsAccuracy: gpsAccuracy ?? 'unknown',
        })
        
        // Only trigger recalculation after consecutive off-route readings
        if (consecutiveOffRouteCountRef.current >= CONSECUTIVE_OFF_ROUTE_REQUIRED) {
          const timeSinceLastRecalc = now - lastRecalculationTimeRef.current
          
          if (timeSinceLastRecalc >= RECALCULATION_COOLDOWN_MS) {
            console.log('[Navigation] Triggering recalculation after persistent off-route')
            setIsOffRoute(true)
            fetchNavigationRoute(true) // This is a recalculation
          } else {
            console.log('[Navigation] Off-route but cooldown active:', {
              remainingCooldown: RECALCULATION_COOLDOWN_MS - timeSinceLastRecalc,
            })
            // Still show off-route warning but don't recalculate yet
            setIsOffRoute(true)
          }
        }
      } else {
        // Driver is on route - reset consecutive count
        if (consecutiveOffRouteCountRef.current > 0) {
          console.log('[Navigation] Back on route, resetting consecutive count')
          consecutiveOffRouteCountRef.current = 0
        }
        setIsOffRoute(false)
      }
    } else {
      // In grace period - don't check off-route
      if (navigationState.isOffRoute) {
        setIsOffRoute(false)
      }
      consecutiveOffRouteCountRef.current = 0
    }

    // Instruction progression (always update, independent of off-route status)
    const { stepIndex, distanceToManeuver } = findCurrentStepIndex(
      currentPos,
      navigationState.route.steps,
      navigationState.currentStepIndex
    )

    // Calculate remaining metrics
    const remainingDistance = getRemainingDistance(navigationState.route, stepIndex)
    const remainingDuration = getRemainingDuration(navigationState.route, stepIndex)

    // Update navigation state (instruction progression)
    setNavigationState({
      currentStepIndex: stepIndex,
      distanceToNextManeuver: distanceToManeuver,
      distanceToDestination: remainingDistance,
      etaToDestination: remainingDuration,
    })

    // Check if arrived at destination
    if (destinationCoordinates) {
      const distanceToDestination = calculateDistanceToPoint(currentPos, destinationCoordinates)
      if (distanceToDestination < 30) {
        // Within 30m of destination
        console.log('[Navigation] Near destination:', { distanceToDestination })
      }
    }
  }, [
    driverLocation,
    navigationState.route,
    navigationState.currentStepIndex,
    navigationState.isRecalculating,
    navigationState.isOffRoute,
    destinationCoordinates,
    setNavigationState,
    setIsOffRoute,
    fetchNavigationRoute,
  ])

  // Refetch route when current stop changes
  useEffect(() => {
    if (navigationState.destinationStopId !== currentStopId && driverLocation && destinationCoordinates) {
      console.log('[Navigation] Stop changed, resetting for new route')
      setIsInitialFetch(true)
      setNavigationRoute(null)
      consecutiveOffRouteCountRef.current = 0
      lastRecalculationTimeRef.current = 0 // Allow immediate fetch for new stop
      routeUpdatedAtRef.current = 0
    }
  }, [currentStopId, navigationState.destinationStopId, driverLocation, destinationCoordinates, setNavigationRoute])

  const handleRequestLocation = () => {
    requestPermission()
  }

  const handleTrackingModeChange = (mode: 'follow' | 'overview') => {
    setTrackingMode(mode)
  }

  const toggleBottomSheet = () => {
    setIsBottomSheetExpanded(!isBottomSheetExpanded)
  }

  const handleRefetchRoute = () => {
    console.log('[Navigation] Manual refetch requested')
    setIsInitialFetch(true)
    lastRecalculationTimeRef.current = 0 // Allow immediate fetch
    consecutiveOffRouteCountRef.current = 0
    fetchNavigationRoute(false)
  }

  if (!selectedRoute) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-100 dark:bg-surface-900">
        <div className="max-w-md w-full mx-4 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-800/70 backdrop-blur-xl p-6">
          <p className="text-sm font-semibold text-surface-900 dark:text-white">No active route loaded</p>
          <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
            Return to the dispatcher to optimize and activate a trip, then open driver mode again.
          </p>
          <div className="mt-4">
            <Button variant="danger" onClick={endExecution} fullWidth>
              Exit driver mode
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-100 dark:bg-surface-900 overflow-hidden">
      {/* Premium Top Bar */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="flex-shrink-0 z-20"
      >
        <div className="bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl border-b border-surface-200/80 dark:border-surface-800/80">
          <div className="flex items-center justify-between px-4 py-2.5 sm:py-3">
            {/* Left: Logo and status */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-bold text-surface-900 dark:text-white">
                    Driver Mode
                  </span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500" />
                  </span>
                </div>
                <span className="text-2xs sm:text-xs text-surface-500 dark:text-surface-400 font-medium">
                  {selectedRouteType === 'optimized' ? 'Optimized' : 'FIFO'} · {completedCount}/{totalStops} completed
                </span>
              </div>
            </div>

            {/* Right: End Trip */}
            <Button
              variant="danger"
              size="sm"
              onClick={endExecution}
              className="!px-3 !py-1.5 sm:!px-4 sm:!py-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden sm:inline ml-1.5">End Trip</span>
            </Button>
          </div>

          {/* Location permission banner */}
          <AnimatePresence>
            {hasPermission === null && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-primary-50 dark:bg-primary-900/20 border-t border-primary-200/50 dark:border-primary-800/50 px-4 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-800/50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-primary-900 dark:text-primary-100">
                          Enable live location tracking
                        </p>
                        <p className="text-2xs text-primary-600 dark:text-primary-400 hidden sm:block">
                          See your position on the map in real-time
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleRequestLocation}
                      className="!px-3 !py-1.5 flex-shrink-0"
                    >
                      Enable
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Location error banner */}
          <AnimatePresence>
            {locationError && hasPermission === false && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-warning-50 dark:bg-warning-900/20 border-t border-warning-200/50 dark:border-warning-800/50 px-4 py-2">
                  <p className="text-2xs sm:text-xs text-warning-700 dark:text-warning-300 flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {locationError}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* Map Area - Takes remaining space */}
      <div className="flex-1 relative min-h-0 driver-mode-map">
        <DriverMapView
          driverLocation={executionState.driverLocation}
          trackingMode={trackingMode}
          onTrackingModeChange={handleTrackingModeChange}
          currentStopIndex={currentStopIndex}
          completedStopIds={completedStopIds}
          navigationRoute={navigationState.route}
          currentDestination={destinationCoordinates}
        />
      </div>

      {/* Bottom Sheet */}
      <motion.div
        initial={{ y: 200 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={clsx(
          'flex-shrink-0 bottom-sheet rounded-t-2xl sm:rounded-t-3xl',
          'transition-all duration-300 ease-out',
          isBottomSheetExpanded 
            ? 'max-h-[70vh] sm:max-h-[55vh]' 
            : 'max-h-[45vh] sm:max-h-[35vh]'
        )}
      >
        {/* Drag Handle */}
        <button
          onClick={toggleBottomSheet}
          className="w-full pt-2.5 pb-1 flex justify-center cursor-pointer group"
          aria-label={isBottomSheetExpanded ? 'Collapse panel' : 'Expand panel'}
        >
          <div className="drag-handle group-hover:w-12" />
        </button>

        {/* Scrollable Content */}
        <div className={clsx(
          'overflow-y-auto overscroll-contain driver-scrollbar',
          'transition-all duration-300',
          isBottomSheetExpanded ? 'max-h-[calc(70vh-40px)] sm:max-h-[calc(55vh-40px)]' : 'max-h-[calc(45vh-40px)] sm:max-h-[calc(35vh-40px)]'
        )}>
          {/* Navigation Instructions */}
          {navigationState.route && navigationState.isNavigating && (
            <NavigationInstructionCard
              navigation={navigationState}
              currentStop={currentStop || null}
              stopNumber={currentStopIndex + 1}
              totalStops={totalStops}
              isExpanded={isBottomSheetExpanded}
            />
          )}

          {/* Navigation Error */}
          <AnimatePresence>
            {navigationError && !navigationState.isRecalculating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 sm:px-5 pb-3"
              >
                <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200/50 dark:border-warning-800/50 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-warning-600 dark:text-warning-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-xs text-warning-700 dark:text-warning-300 truncate">
                      {navigationError}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefetchRoute}
                    className="!px-2 !py-1 flex-shrink-0"
                  >
                    Retry
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Navigation */}
          <AnimatePresence>
            {!navigationState.route && !navigationError && driverLocation && destinationCoordinates && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 sm:px-5 pb-3"
              >
                <div className="bg-surface-100 dark:bg-surface-800 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-surface-600 dark:text-surface-300">
                    Loading navigation...
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current Stop Card - shown when no navigation or as fallback */}
          {currentStop && (!navigationState.route || !navigationState.isNavigating) && (
            <CurrentStopCard
              stop={currentStop}
              stopNumber={currentStopIndex + 1}
              totalStops={totalStops}
              driverLocation={executionState.driverLocation}
              leg={currentLeg}
              onMarkComplete={markStopComplete}
              onStopAction={onStopAction ? (action) => handleStopAction(action) : undefined}
              stopActionBusy={stopActionBusy}
              stopActionError={stopActionError}
              isExpanded={isBottomSheetExpanded}
            />
          )}

          {/* Action Buttons when navigation is active */}
          {navigationState.route && navigationState.isNavigating && currentStop && (
            <div className="px-4 sm:px-5 pb-4 space-y-2.5">
              {/* Navigation buttons */}
              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (currentStop.coordinates) {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${currentStop.coordinates.lat},${currentStop.coordinates.lng}`
                      window.open(url, '_blank')
                    }
                  }}
                  className="nav-button google"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span>Google Maps</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (currentStop.coordinates) {
                      const url = `http://maps.apple.com/?daddr=${currentStop.coordinates.lat},${currentStop.coordinates.lng}`
                      window.open(url, '_blank')
                    }
                  }}
                  className="nav-button apple"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <span>Apple Maps</span>
                </motion.button>
              </div>

              {onStopAction ? (
                <div className="space-y-2">
                  {stopActionError && (
                    <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200/50 dark:border-danger-800/50 rounded-xl px-3 py-2">
                      <p className="text-xs text-danger-700 dark:text-danger-300">{stopActionError}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStopAction('arrived')}
                      disabled={!!stopActionBusy}
                      isLoading={stopActionBusy === 'arrived'}
                    >
                      Arrived
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleStopAction('picked_up')}
                      disabled={!!stopActionBusy}
                      isLoading={stopActionBusy === 'picked_up'}
                    >
                      Picked Up
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleStopAction('no_show')}
                      disabled={!!stopActionBusy}
                      isLoading={stopActionBusy === 'no_show'}
                    >
                      No Show
                    </Button>
                  </div>
                </div>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={markStopComplete}
                  className="complete-button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Mark Arrived & Continue</span>
                </motion.button>
              )}
            </div>
          )}

          <UpcomingStopsDrawer
            stops={trip.stops}
            orderedStopIds={orderedStopIds}
            completedStopIds={completedStopIds}
            currentStopIndex={currentStopIndex}
            isExpanded={isBottomSheetExpanded}
          />
        </div>

        {/* Privacy Note - Only visible when expanded */}
        <AnimatePresence>
          {isBottomSheetExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-2 border-t border-surface-200/50 dark:border-surface-700/50">
                <p className="text-2xs text-surface-400 dark:text-surface-500 text-center flex items-center justify-center gap-1.5">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Driver location may be saved as part of dispatch data for this trip
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
