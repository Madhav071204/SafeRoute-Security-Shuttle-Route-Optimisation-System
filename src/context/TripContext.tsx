'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { Trip, Stop, Route, ExecutionState, Coordinates } from '@/types'
import { DEFAULT_ORIGIN_ADDRESS, DEFAULT_ORIGIN_COORDINATES } from '@/lib/constants'
import { generateStopId } from '@/data/demo'

interface TripContextType {
  trip: Trip
  routes: { fifo: Route | null; optimized: Route | null }
  selectedRouteType: 'fifo' | 'optimized'
  executionState: ExecutionState
  isGeocoding: boolean
  isOptimizing: boolean
  
  // Trip actions
  addStop: () => void
  removeStop: (id: string) => void
  updateStop: (id: string, updates: Partial<Stop>) => void
  clearTrip: () => void
  loadDemoData: (stops: Stop[]) => void
  
  // Geocoding
  setGeocodeResults: (results: { id: string; coordinates: Coordinates | null; error?: string }[]) => void
  setIsGeocoding: (value: boolean) => void
  
  // Optimization
  setRoutes: (fifo: Route | null, optimized: Route | null) => void
  setSelectedRouteType: (type: 'fifo' | 'optimized') => void
  setIsOptimizing: (value: boolean) => void
  
  // Execution
  startExecution: () => void
  markStopComplete: () => void
  endExecution: () => void
}

const TripContext = createContext<TripContextType | undefined>(undefined)

function createEmptyTrip(): Trip {
  return {
    id: `trip_${Date.now()}`,
    origin: {
      address: DEFAULT_ORIGIN_ADDRESS,
      coordinates: DEFAULT_ORIGIN_COORDINATES,
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
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)

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
  }, [])

  const loadDemoData = useCallback((stops: Stop[]) => {
    setTrip((prev) => ({
      ...prev,
      stops,
      status: 'input',
    }))
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

  const startExecution = useCallback(() => {
    const selectedRoute = selectedRouteType === 'fifo' ? routes.fifo : routes.optimized
    if (!selectedRoute) return

    setTrip((prev) => ({ ...prev, status: 'executing' }))
    setExecutionState({
      currentStopIndex: 0,
      completedStopIds: [],
      startedAt: new Date(),
    })
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

  return (
    <TripContext.Provider
      value={{
        trip,
        routes,
        selectedRouteType,
        executionState,
        isGeocoding,
        isOptimizing,
        addStop,
        removeStop,
        updateStop,
        clearTrip,
        loadDemoData,
        setGeocodeResults,
        setIsGeocoding,
        setRoutes,
        setSelectedRouteType,
        setIsOptimizing,
        startExecution,
        markStopComplete,
        endExecution,
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
