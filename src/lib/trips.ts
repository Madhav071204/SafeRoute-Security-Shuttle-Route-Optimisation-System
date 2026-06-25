import { Trip, Stop, Route, ExecutionState, OriginSource } from '@/types'
import { PersistedTrip, PersistedStop, TripStatus, RouteMode, PersistedStopStatus } from '@/types/trip'
import { tripRepository } from '@/services/tripRepository'

export function generateTripId(): string {
  return `trip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function createPersistedTrip(
  trip: Trip,
  routes: { fifo: Route | null; optimized: Route | null },
  selectedRouteType: RouteMode,
  executionState: ExecutionState,
  originSource: OriginSource
): PersistedTrip {
  const selectedRoute = selectedRouteType === 'fifo' ? routes.fifo : routes.optimized
  const fifoRoute = routes.fifo
  const optimizedRoute = routes.optimized
  
  const orderedStops = selectedRoute
    ? selectedRoute.orderedStopIds.map((id, index) => {
        const stop = trip.stops.find(s => s.id === id)
        return stop ? mapStopToPersisted(stop, index, executionState) : null
      }).filter(Boolean) as PersistedStop[]
    : trip.stops.map((stop, index) => mapStopToPersisted(stop, index, executionState))
  
  const fifoDistance = fifoRoute?.metrics.totalDistanceKm || 0
  const optimizedDistance = optimizedRoute?.metrics.totalDistanceKm || 0
  const fifoDuration = fifoRoute?.metrics.totalDurationMinutes || 0
  const optimizedDuration = optimizedRoute?.metrics.totalDurationMinutes || 0
  
  return {
    tripId: trip.id,
    createdAt: new Date().toISOString(),
    startedAt: executionState.startedAt?.toISOString(),
    completedAt: trip.status === 'completed' ? new Date().toISOString() : undefined,
    
    origin: {
      coordinates: trip.origin.coordinates,
      label: trip.origin.address,
    },
    originSource,
    
    routeMode: selectedRouteType,
    
    stops: orderedStops,
    completedStops: executionState.completedStopIds,
    skippedStops: [],
    
    totalStops: trip.stops.length,
    totalPassengers: trip.stops.filter(s => s.passengerName.trim() !== '').length,
    
    totalDistanceKm: selectedRoute?.metrics.totalDistanceKm || 0,
    totalDurationMinutes: selectedRoute?.metrics.totalDurationMinutes || 0,
    
    optimizedDistanceKm: optimizedDistance,
    fifoDistanceKm: fifoDistance,
    distanceSavedKm: selectedRouteType === 'optimized' ? Math.max(0, fifoDistance - optimizedDistance) : 0,
    timeSavedMinutes: selectedRouteType === 'optimized' ? Math.max(0, fifoDuration - optimizedDuration) : 0,
    
    driverLocationAvailable: executionState.hasLocationPermission === true,
    status: mapTripStatus(trip.status),
  }
}

function mapStopToPersisted(
  stop: Stop,
  orderIndex: number,
  executionState: ExecutionState
): PersistedStop {
  const isCompleted = executionState.completedStopIds.includes(stop.id)
  
  return {
    stopId: stop.id,
    passengerName: stop.passengerName,
    address: stop.address,
    displayName: extractDisplayName(stop.address),
    coordinates: stop.coordinates || { lat: 0, lng: 0 },
    orderIndex,
    status: isCompleted ? 'picked_up' : 'pending',
    pickedUpAt: isCompleted ? new Date().toISOString() : undefined,
  }
}

function extractDisplayName(address: string): string {
  const parts = address.split(',')
  return parts[0].trim()
}

function mapTripStatus(status: Trip['status']): TripStatus {
  switch (status) {
    case 'input':
    case 'geocoded':
    case 'optimized':
      return 'draft'
    case 'executing':
      return 'in_progress'
    case 'completed':
      return 'completed'
    default:
      return 'draft'
  }
}

export async function saveCompletedTrip(
  trip: Trip,
  routes: { fifo: Route | null; optimized: Route | null },
  selectedRouteType: RouteMode,
  executionState: ExecutionState,
  originSource: OriginSource
): Promise<void> {
  const persistedTrip = createPersistedTrip(
    trip,
    routes,
    selectedRouteType,
    executionState,
    originSource
  )
  
  persistedTrip.status = 'completed'
  persistedTrip.completedAt = new Date().toISOString()
  persistedTrip.completedStops = executionState.completedStopIds
  
  persistedTrip.stops = persistedTrip.stops.map(stop => {
    if (executionState.completedStopIds.includes(stop.stopId)) {
      return {
        ...stop,
        status: 'picked_up' as PersistedStopStatus,
        pickedUpAt: stop.pickedUpAt || new Date().toISOString(),
      }
    }
    return stop
  })
  
  await tripRepository.saveTrip(persistedTrip)
}

export async function saveTripInProgress(
  trip: Trip,
  routes: { fifo: Route | null; optimized: Route | null },
  selectedRouteType: RouteMode,
  executionState: ExecutionState,
  originSource: OriginSource
): Promise<void> {
  const persistedTrip = createPersistedTrip(
    trip,
    routes,
    selectedRouteType,
    executionState,
    originSource
  )
  
  persistedTrip.status = 'in_progress'
  
  await tripRepository.saveTrip(persistedTrip)
}

export { tripRepository }
