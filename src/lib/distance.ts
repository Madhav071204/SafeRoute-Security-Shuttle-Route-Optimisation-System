import { Coordinates, DriverLocation } from '@/types'
import { haversineDistance } from '@/lib/algorithms/haversine'
import { AVERAGE_SPEED_KMH } from '@/lib/constants'

/**
 * Calculate the straight-line distance from driver to a stop.
 * Returns distance in kilometers.
 */
export function calculateDistanceToStop(
  driverLocation: DriverLocation | Coordinates | null,
  stopCoordinates: Coordinates | null
): number | null {
  if (!driverLocation || !stopCoordinates) {
    return null
  }

  const driverCoords = 'coordinates' in driverLocation 
    ? driverLocation.coordinates 
    : driverLocation

  return haversineDistance(driverCoords, stopCoordinates)
}

/**
 * Estimate travel time based on distance and average speed.
 * Returns time in minutes.
 */
export function estimateETA(
  distanceKm: number,
  speedKmh: number = AVERAGE_SPEED_KMH
): number {
  if (distanceKm <= 0 || speedKmh <= 0) {
    return 0
  }
  return (distanceKm / speedKmh) * 60
}

/**
 * Format distance for display.
 * Shows meters for distances under 1km, otherwise kilometers.
 */
export function formatDistance(km: number | null): string {
  if (km === null) {
    return '--'
  }

  if (km < 0.1) {
    return `${Math.round(km * 1000)} m`
  }

  if (km < 1) {
    return `${Math.round(km * 1000 / 10) * 10} m`
  }

  if (km < 10) {
    return `${km.toFixed(1)} km`
  }

  return `${Math.round(km)} km`
}

/**
 * Format duration for display.
 * Shows minutes or hours + minutes.
 */
export function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes < 0) {
    return '--'
  }

  if (minutes < 1) {
    return '< 1 min'
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} min`
  }

  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (mins === 0) {
    return `${hours} hr`
  }

  return `${hours} hr ${mins} min`
}

/**
 * Get remaining distance and ETA for the current stop.
 * Uses leg data if available, otherwise calculates from driver location.
 */
export function getDistanceAndETA(
  driverLocation: DriverLocation | null,
  stopCoordinates: Coordinates | null,
  legDurationMinutes?: number
): { distance: number | null; eta: number | null } {
  const distance = calculateDistanceToStop(driverLocation, stopCoordinates)

  if (distance === null) {
    return { distance: null, eta: null }
  }

  const eta = legDurationMinutes ?? estimateETA(distance)

  return { distance, eta }
}
