import { Settings, Coordinates } from '@/types'

// Default origin: Monash University Clayton Campus
export const DEFAULT_ORIGIN_ADDRESS = 'Monash University, Wellington Rd, Clayton VIC 3800'
export const DEFAULT_ORIGIN_COORDINATES: Coordinates = {
  lat: -37.9105,
  lng: 145.1363,
}

// Default settings
export const DEFAULT_SETTINGS: Settings = {
  fuelConsumptionPer100km: 12, // L/100km - typical shuttle van
  fuelPricePerLiter: 1.80, // AUD per liter
  originAddress: DEFAULT_ORIGIN_ADDRESS,
  originCoordinates: DEFAULT_ORIGIN_COORDINATES,
}

// Constraints
export const MAX_STOPS = 15
export const MIN_STOPS_FOR_OPTIMIZATION = 2

// Map defaults
export const DEFAULT_MAP_CENTER: Coordinates = DEFAULT_ORIGIN_COORDINATES
export const DEFAULT_MAP_ZOOM = 12

// Average speed for time estimates (km/h) - urban driving
export const AVERAGE_SPEED_KMH = 40
