import { Settings, Coordinates, RouteOrigin } from '@/types'

// Monash University fallback origin - used only when live location is unavailable
export const MONASH_FALLBACK_ORIGIN: RouteOrigin = {
  coordinates: {
    lat: -37.9105,
    lng: 145.1363,
  },
  label: 'Monash University',
  source: 'fallback_monash',
}

// Legacy constants for backward compatibility
export const DEFAULT_ORIGIN_ADDRESS = MONASH_FALLBACK_ORIGIN.label
export const DEFAULT_ORIGIN_COORDINATES: Coordinates = MONASH_FALLBACK_ORIGIN.coordinates

// Default settings
export const DEFAULT_SETTINGS: Settings = {
  fuelConsumptionPer100km: 12, // L/100km - typical shuttle van
  fuelPricePerLiter: 1.80, // AUD per liter
  originAddress: DEFAULT_ORIGIN_ADDRESS,
  originCoordinates: DEFAULT_ORIGIN_COORDINATES,
}

// Location acquisition timeout (ms)
export const LOCATION_TIMEOUT_MS = 6000

// Constraints
// A trip supports at most 15 passenger destinations. The origin is a separate
// field and never counts toward this limit. `MAX_STOPS` is kept as a backward-
// compatible alias so there is a single source of truth for the value.
export const MAX_DESTINATIONS = 15
export const MAX_STOPS = MAX_DESTINATIONS
export const MIN_STOPS_FOR_OPTIMIZATION = 2

// Maximum accepted length for a single geocoding address string.
export const MAX_ADDRESS_LENGTH = 250

// Map defaults
export const DEFAULT_MAP_CENTER: Coordinates = DEFAULT_ORIGIN_COORDINATES
export const DEFAULT_MAP_ZOOM = 12

// Average speed for time estimates (km/h) - urban driving
export const AVERAGE_SPEED_KMH = 40
