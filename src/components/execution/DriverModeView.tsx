'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTrip } from '@/context/TripContext'
import { useDriverLocation } from '@/hooks/useDriverLocation'
import { DriverMapView } from '@/components/map/DriverMapView'
import { CurrentStopCard } from './CurrentStopCard'
import { UpcomingStopsDrawer } from './UpcomingStopsDrawer'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'

export function DriverModeView() {
  const {
    trip,
    routes,
    selectedRouteType,
    executionState,
    markStopComplete,
    endExecution,
    setDriverLocation,
    setTrackingMode,
    setLocationPermission,
  } = useTrip()

  const {
    location,
    error: locationError,
    hasPermission,
    requestPermission,
    stopTracking,
  } = useDriverLocation()

  const selectedRoute = selectedRouteType === 'fifo' ? routes.fifo : routes.optimized
  if (!selectedRoute) return null

  const { orderedStopIds, legs } = selectedRoute
  const { currentStopIndex, completedStopIds, trackingMode } = executionState
  const totalStops = orderedStopIds.length
  const completedCount = completedStopIds.length

  const currentStopId = orderedStopIds[currentStopIndex]
  const currentStop = trip.stops.find((s) => s.id === currentStopId)
  const currentLeg = legs[currentStopIndex]

  useEffect(() => {
    if (location) {
      setDriverLocation(location)
    }
  }, [location, setDriverLocation])

  useEffect(() => {
    if (hasPermission !== null) {
      setLocationPermission(hasPermission)
    }
  }, [hasPermission, setLocationPermission])

  useEffect(() => {
    return () => {
      stopTracking()
      setDriverLocation(null)
    }
  }, [stopTracking, setDriverLocation])

  const handleRequestLocation = () => {
    requestPermission()
  }

  const handleTrackingModeChange = (mode: 'follow' | 'overview') => {
    setTrackingMode(mode)
  }

  return (
    <div className="h-screen flex flex-col bg-surface-100 dark:bg-surface-900 overflow-hidden">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="driver-overlay top-0 left-0 right-0 rounded-none border-b border-surface-200 dark:border-surface-800"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-surface-900 dark:text-white">SafeRoute</h1>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500" />
                </span>
                <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
                  {selectedRouteType === 'optimized' ? 'Optimized Route' : 'FIFO Route'} Active
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-surface-100 dark:bg-surface-800 rounded-lg">
              <span className="text-sm font-semibold text-surface-900 dark:text-white">
                {completedCount}/{totalStops}
              </span>
              <span className="text-xs text-surface-500 dark:text-surface-400">stops</span>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={endExecution}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              }
            >
              End Trip
            </Button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {hasPermission === null && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-primary-50 dark:bg-primary-900/30 border-b border-primary-200 dark:border-primary-800 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary-900 dark:text-primary-100">Enable Live Location</p>
                    <p className="text-xs text-primary-600 dark:text-primary-400">See your position on the map</p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRequestLocation}
                >
                  Enable
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {locationError && hasPermission === false && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-warning-50 dark:bg-warning-900/30 border-b border-warning-200 dark:border-warning-800 px-4 py-2">
              <p className="text-xs text-warning-700 dark:text-warning-300 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {locationError}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map container - takes remaining space */}
      <div className="flex-1 relative min-h-0">
        <DriverMapView
          driverLocation={executionState.driverLocation}
          trackingMode={trackingMode}
          onTrackingModeChange={handleTrackingModeChange}
          currentStopIndex={currentStopIndex}
          completedStopIds={completedStopIds}
        />

        {/* Progress indicator overlay on map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bottom-4 left-4 z-10"
        >
          <div className="glass-card rounded-xl px-4 py-2">
            <div className="w-32">
              <ProgressBar
                value={completedCount}
                max={totalStops}
                size="sm"
                variant="gradient"
                showPercentage={false}
              />
              <p className="text-xs font-medium text-surface-600 dark:text-surface-400 mt-1 text-center">
                {completedCount} of {totalStops} completed
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom sheet container - fixed at bottom with max height */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="flex-shrink-0 flex flex-col max-h-[55vh] sm:max-h-[45vh] overflow-hidden"
      >
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {currentStop && (
            <CurrentStopCard
              stop={currentStop}
              stopNumber={currentStopIndex + 1}
              totalStops={totalStops}
              driverLocation={executionState.driverLocation}
              leg={currentLeg}
              onMarkComplete={markStopComplete}
            />
          )}

          <UpcomingStopsDrawer
            stops={trip.stops}
            orderedStopIds={orderedStopIds}
            completedStopIds={completedStopIds}
            currentStopIndex={currentStopIndex}
          />
        </div>

        {/* Privacy disclaimer - subtle, fixed at bottom of sheet */}
        <div className="flex-shrink-0 bg-surface-100/95 dark:bg-surface-900/95 backdrop-blur-sm px-4 py-1.5 border-t border-surface-200/50 dark:border-surface-700/50">
          <p className="text-2xs text-surface-400 dark:text-surface-500 text-center flex items-center justify-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Location used only during trip</span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
