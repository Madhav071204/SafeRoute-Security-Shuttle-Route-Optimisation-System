'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { Trip, Stop, Route, ExecutionState, Coordinates, DriverLocation, TrackingMode, ActiveNavigationState, DirectionRoute, RouteOrigin, OriginSource } from '@/types'
import { MONASH_FALLBACK_ORIGIN } from '@/lib/constants'
import { generateStopId } from '@/data/demo'
import { resolveRouteOrigin } from '@/lib/origin'

interface TripContextType {
  trip: Trip
  routes: { fifo: Route | null; optimized: Route | null }
  selectedRouteType: 'fifo' | 'optimized'
  executionState: ExecutionState
  isGeocoding: boolean
  isOptimizing: boolean
  isDriverMode: boolean
  navigationState: ActiveNavigationState
  originSource: OriginSource
  
  // Trip actions
  addStop: () => void
  removeStop: (id: string) => void
  updateStop: (id: string, updates: Partial<Stop>) => void
  clearTrip: () => void
  loadDemoData: (stops: Stop[]) => void
  
  // Origin management
  setTripOrigin: (origin: RouteOrigin) => void
  
  // Geocoding
  setGeocodeResults: (results: { id: string; coordinates: Coordinates | null; error?: string }[]) => void
  setIsGeocoding: (value: boolean) => void
  
  // Optimization
  setRoutes: (fifo: Route | null, optimized: Route | null) => void
  setSelectedRouteType: (type: 'fifo' | 'optimized') => void
  setIsOptimizing: (value: boolean) => void
  
  // Execution
  startExecution: (liveOrigin?: Coordinates) => void
  markStopComplete: () => void
  endExecution: () => void
  
  // Driver location
  setDriverLocation: (location: DriverLocation | null) => void
  setTrackingMode: (mode: TrackingMode) => void
  setLocationPermission: (granted: boolean | null) => void
  
  // Navigation
  setNavigationState: (state: Partial<ActiveNavigationState>) => void
  setNavigationRoute: (route: DirectionRoute | null) => void
  updateNavigationStep: (stepIndex: number, distanceToManeuver: number | null) => void
  setIsRecalculating: (value: boolean) => void
  setIsOffRoute: (value: boolean) => void
}

const TripContext = createContext<TripContextType | undefined>(undefined)

function createEmptyTrip(): Trip {
  return {
    id: `trip_${Date.now()}`,
    origin: {
      address: MONASH_FALLBACK_ORIGIN.label,
      coordinates: MONASH_FALLBACK_ORIGIN.coordinates,
    },
    stops: [],
    status: 'input',
  }
}

function createEmptyExecutionState(): ExecutionState {
  return {
    currentStopIndex: 0,
    completedStopIds: [],
    startedAt: null,
    driverLocation: null,
    trackingMode: 'follow',
    hasLocationPermission: null,
  }
}

function createEmptyNavigationState(): ActiveNavigationState {
  return {
    isNavigating: false,
    currentStepIndex: 0,
    currentLegIndex: 0,
    route: null,
    destinationStopId: null,
    distanceToNextManeuver: null,
    distanceToDestination: null,
    etaToDestination: null,
    isRecalculating: false,
    isOffRoute: false,
    lastRecalculatedAt: null,
  }
}

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [trip, setTrip] = useState<Trip>(createEmptyTrip)
  const [routes, setRoutesState] = useState<{ fifo: Route | null; optimized: Route | null }>({
    fifo: null,
    optimized: null,
  })
  const [selectedRouteType, setSelectedRouteType] = useState<'fifo' | 'optimized'>('optimized')
  const [executionState, setExecutionState] = useState<ExecutionState>(createEmptyExecutionState)
  const [navigationState, setNavigationStateInternal] = useState<ActiveNavigationState>(createEmptyNavigationState)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [originSource, setOriginSource] = useState<OriginSource>('fallback_monash')

  const addStop = useCallback(() => {
    setTrip((prev) => ({
      ...prev,
      stops: [
        ...prev.stops,
        {
          id: generateStopId(),
          passengerName: '',
          address: '',
          coordinates: null,
          geocodeStatus: 'pending',
        },
      ],
      status: 'input',
    }))
  }, [])

  const removeStop = useCallback((id: string) => {
    setTrip((prev) => ({
      ...prev,
      stops: prev.stops.filter((s) => s.id !== id),
      status: 'input',
    }))
  }, [])

  const updateStop = useCallback((id: string, updates: Partial<Stop>) => {
    setTrip((prev) => ({
      ...prev,
      stops: prev.stops.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      status: 'input',
    }))
  }, [])

  const clearTrip = useCallback(() => {
    setTrip(createEmptyTrip())
    setRoutesState({ fifo: null, optimized: null })
    setExecutionState(createEmptyExecutionState())
    setNavigationStateInternal(createEmptyNavigationState())
    setOriginSource('fallback_monash')
  }, [])

  const loadDemoData = useCallback((stops: Stop[]) => {
    setTrip((prev) => ({
      ...prev,
      stops,
      status: 'input',
    }))
    setRoutesState({ fifo: null, optimized: null })
  }, [])

  const setTripOrigin = useCallback((origin: RouteOrigin) => {
    setTrip((prev) => ({
      ...prev,
      origin: {
        address: origin.label,
        coordinates: origin.coordinates,
      },
    }))
    setOriginSource(origin.source)
    // Reset routes when origin changes
    setRoutesState({ fifo: null, optimized: null })
  }, [])

  const setGeocodeResults = useCallback(
    (results: { id: string; coordinates: Coordinates | null; error?: string }[]) => {
      setTrip((prev) => {
        const updatedStops = prev.stops.map((stop) => {
          const result = results.find((r) => r.id === stop.id)
          if (result) {
            return {
              ...stop,
              coordinates: result.coordinates,
              geocodeStatus: result.coordinates ? 'success' : 'failed',
              geocodeError: result.error,
            } as Stop
          }
          return stop
        })

        const allGeocoded = updatedStops.every(
          (s) => s.geocodeStatus === 'success' || s.geocodeStatus === 'failed'
        )
        const allSuccess = updatedStops.every((s) => s.geocodeStatus === 'success')

        return {
          ...prev,
          stops: updatedStops,
          status: allSuccess ? 'geocoded' : allGeocoded ? 'input' : prev.status,
        }
      })
    },
    []
  )

  const setRoutes = useCallback((fifo: Route | null, optimized: Route | null) => {
    setRoutesState({ fifo, optimized })
    if (fifo && optimized) {
      setTrip((prev) => ({ ...prev, status: 'optimized' }))
    }
  }, [])

  const startExecution = useCallback((liveOrigin?: Coordinates) => {
    const selectedRoute = selectedRouteType === 'fifo' ? routes.fifo : routes.optimized
    if (!selectedRoute) return

    // If live origin provided, update the trip origin to use the driver's current location
    if (liveOrigin) {
      setTrip((prev) => ({
        ...prev,
        status: 'executing',
        origin: {
          address: 'Current Location',
          coordinates: liveOrigin,
        },
      }))
    } else {
      setTrip((prev) => ({ ...prev, status: 'executing' }))
    }
    
    setExecutionState({
      currentStopIndex: 0,
      completedStopIds: [],
      startedAt: new Date(),
      driverLocation: null,
      trackingMode: 'follow',
      hasLocationPermission: null,
    })
    
    // Reset navigation state for new execution
    setNavigationStateInternal(createEmptyNavigationState())
  }, [routes, selectedRouteType])

  const markStopComplete = useCallback(() => {
    const selectedRoute = selectedRouteType === 'fifo' ? routes.fifo : routes.optimized
    if (!selectedRoute) return

    setExecutionState((prev) => {
      const currentStopId = selectedRoute.orderedStopIds[prev.currentStopIndex]
      const newCompletedIds = [...prev.completedStopIds, currentStopId]
      const newIndex = prev.currentStopIndex + 1
      const isComplete = newIndex >= selectedRoute.orderedStopIds.length

      if (isComplete) {
        setTrip((t) => ({ ...t, status: 'completed' }))
        // Clear navigation when trip is complete
        setNavigationStateInternal(createEmptyNavigationState())
      } else {
        // Reset navigation for the next stop - route will be fetched by the hook
        setNavigationStateInternal((navState) => ({
          ...navState,
          isNavigating: false,
          route: null,
          currentStepIndex: 0,
          destinationStopId: null,
        }))
      }

      return {
        ...prev,
        completedStopIds: newCompletedIds,
        currentStopIndex: isComplete ? prev.currentStopIndex : newIndex,
      }
    })
  }, [routes, selectedRouteType])

  const endExecution = useCallback(() => {
    clearTrip()
  }, [clearTrip])

  const setDriverLocation = useCallback((location: DriverLocation | null) => {
    setExecutionState((prev) => ({
      ...prev,
      driverLocation: location,
    }))
  }, [])

  const setTrackingMode = useCallback((mode: TrackingMode) => {
    setExecutionState((prev) => ({
      ...prev,
      trackingMode: mode,
    }))
  }, [])

  const setLocationPermission = useCallback((granted: boolean | null) => {
    setExecutionState((prev) => ({
      ...prev,
      hasLocationPermission: granted,
    }))
  }, [])

  // Navigation state management
  const setNavigationState = useCallback((state: Partial<ActiveNavigationState>) => {
    setNavigationStateInternal((prev) => ({ ...prev, ...state }))
  }, [])

  const setNavigationRoute = useCallback((route: DirectionRoute | null) => {
    setNavigationStateInternal((prev) => ({
      ...prev,
      route,
      isNavigating: route !== null,
      currentStepIndex: 0,
      lastRecalculatedAt: route ? Date.now() : prev.lastRecalculatedAt,
    }))
  }, [])

  const updateNavigationStep = useCallback((stepIndex: number, distanceToManeuver: number | null) => {
    setNavigationStateInternal((prev) => ({
      ...prev,
      currentStepIndex: stepIndex,
      distanceToNextManeuver: distanceToManeuver,
    }))
  }, [])

  const setIsRecalculating = useCallback((value: boolean) => {
    setNavigationStateInternal((prev) => ({
      ...prev,
      isRecalculating: value,
    }))
  }, [])

  const setIsOffRoute = useCallback((value: boolean) => {
    setNavigationStateInternal((prev) => ({
      ...prev,
      isOffRoute: value,
    }))
  }, [])

  const isDriverMode = trip.status === 'executing'

  return (
    <TripContext.Provider
      value={{
        trip,
        routes,
        selectedRouteType,
        executionState,
        isGeocoding,
        isOptimizing,
        isDriverMode,
        navigationState,
        originSource,
        addStop,
        removeStop,
        updateStop,
        clearTrip,
        loadDemoData,
        setTripOrigin,
        setGeocodeResults,
        setIsGeocoding,
        setRoutes,
        setSelectedRouteType,
        setIsOptimizing,
        startExecution,
        markStopComplete,
        endExecution,
        setDriverLocation,
        setTrackingMode,
        setLocationPermission,
        setNavigationState,
        setNavigationRoute,
        updateNavigationStep,
        setIsRecalculating,
        setIsOffRoute,
      }}
    >
      {children}
    </TripContext.Provider>
  )
}

export function useTrip() {
  const context = useContext(TripContext)
  if (context === undefined) {
    throw new Error('useTrip must be used within a TripProvider')
  }
  return context
}
