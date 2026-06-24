'use client'

import { useEffect } from 'react'
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
    isTracking,
    hasPermission,
    requestPermission,
    startTracking,
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
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-700">
            {selectedRouteType === 'optimized' ? 'Optimized Route' : 'FIFO Route'}
          </span>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={endExecution}
        >
          End Trip
        </Button>
      </div>

      {/* Location permission prompt */}
      {hasPermission === null && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm text-blue-800">Enable location for navigation</span>
          </div>
          <button
            onClick={handleRequestLocation}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Enable
          </button>
        </div>
      )}

      {/* Location error */}
      {locationError && hasPermission === false && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex-shrink-0">
          <p className="text-xs text-amber-700">{locationError}</p>
        </div>
      )}

      {/* Map - main content area */}
      <div className="flex-1 relative min-h-0">
        <DriverMapView
          driverLocation={executionState.driverLocation}
          trackingMode={trackingMode}
          onTrackingModeChange={handleTrackingModeChange}
          currentStopIndex={currentStopIndex}
          completedStopIds={completedStopIds}
        />
      </div>

      {/* Bottom panel */}
      <div className="flex-shrink-0">
        {/* Progress bar */}
        <div className="bg-white border-t border-gray-200 px-4 py-2">
          <ProgressBar
            value={completedCount}
            max={totalStops}
            label={`${completedCount} of ${totalStops} stops completed`}
            size="sm"
          />
        </div>

        {/* Current stop card */}
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

        {/* Upcoming stops drawer */}
        <UpcomingStopsDrawer
          stops={trip.stops}
          orderedStopIds={orderedStopIds}
          completedStopIds={completedStopIds}
          currentStopIndex={currentStopIndex}
        />

        {/* Privacy notice */}
        <div className="bg-gray-100 px-4 py-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Your location is only used during this trip and is not stored.
          </p>
        </div>
      </div>
    </div>
  )
}
