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

// Navigation types for turn-by-turn directions
export interface NavigationStep {
  instruction: string
  maneuverType: string
  modifier?: string
  distance: number // meters
  duration: number // seconds
  location: Coordinates
  roadName?: string
}

export interface DirectionRoute {
  geometry: GeoJSON.LineString
  distance: number // meters
  duration: number // seconds
  legs: DirectionLeg[]
  steps: NavigationStep[]
}

export interface DirectionLeg {
  distance: number // meters
  duration: number // seconds
  steps: NavigationStep[]
}

export interface DirectionsRequest {
  origin: Coordinates
  destination: Coordinates
  waypoints?: Coordinates[]
}

export interface DirectionsResponse {
  success: boolean
  route?: DirectionRoute
  error?: string
}

export type StopStatus = 'pending' | 'current' | 'completed' | 'skipped'

export interface ActiveNavigationState {
  isNavigating: boolean
  currentStepIndex: number
  currentLegIndex: number
  route: DirectionRoute | null
  destinationStopId: string | null
  distanceToNextManeuver: number | null // meters
  distanceToDestination: number | null // meters
  etaToDestination: number | null // seconds
  isRecalculating: boolean
  isOffRoute: boolean
  lastRecalculatedAt: number | null
}

export interface NavigationConfig {
  maneuverThresholdMeters: number // Distance to advance to next instruction
  offRouteThresholdMeters: number // Distance to trigger recalculation
  recalculationCooldownMs: number // Min time between recalculations
}
