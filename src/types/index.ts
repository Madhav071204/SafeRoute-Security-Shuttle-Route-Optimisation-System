// Core data types for SafeRoute

export interface Coordinates {
  lat: number
  lng: number
}

export interface Stop {
  id: string
  passengerName: string
  address: string
  coordinates: Coordinates | null
  geocodeStatus: 'pending' | 'success' | 'failed'
  geocodeError?: string
}

export interface Trip {
  id: string
  origin: {
    address: string
    coordinates: Coordinates
  }
  stops: Stop[]
  status: 'input' | 'geocoded' | 'optimized' | 'executing' | 'completed'
}

export interface RouteLeg {
  fromStopId: string | 'origin'
  toStopId: string
  distanceKm: number
  durationMinutes: number
}

export interface RouteMetrics {
  totalDistanceKm: number
  totalDurationMinutes: number
  estimatedFuelCostAud: number
}

export interface Route {
  type: 'fifo' | 'optimized'
  orderedStopIds: string[]
  polyline: string
  legs: RouteLeg[]
  metrics: RouteMetrics
}

export interface Settings {
  fuelConsumptionPer100km: number
  fuelPricePerLiter: number
  originAddress: string
  originCoordinates: Coordinates
}

// Driver location for live tracking
export interface DriverLocation {
  coordinates: Coordinates
  heading: number | null
  accuracy: number
  timestamp: number
}

// Map tracking mode during execution
export type TrackingMode = 'follow' | 'overview'

export interface ExecutionState {
  currentStopIndex: number
  completedStopIds: string[]
  startedAt: Date | null
  driverLocation: DriverLocation | null
  trackingMode: TrackingMode
  hasLocationPermission: boolean | null // null = not asked yet
}

// API types
export interface GeocodeRequest {
  addresses: { id: string; address: string }[]
}

export interface GeocodeResult {
  id: string
  success: boolean
  coordinates?: Coordinates
  error?: string
}

export interface GeocodeResponse {
  results: GeocodeResult[]
}

export interface OptimizeRequest {
  origin: Coordinates
  stops: { id: string; coordinates: Coordinates }[]
}

export interface OptimizeResponse {
  orderedStopIds: string[]
  totalDistanceKm: number
}

export interface RouteRequest {
  origin: Coordinates
  stops: { id: string; coordinates: Coordinates }[]
  orderedStopIds: string[]
}

export interface RouteResponse {
  polyline: string
  legs: RouteLeg[]
  totalDistanceKm: number
  totalDurationMinutes: number
}
