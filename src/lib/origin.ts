import { Coordinates, RouteOrigin } from '@/types'
import { MONASH_FALLBACK_ORIGIN, LOCATION_TIMEOUT_MS } from '@/lib/constants'

/**
 * Resolve the route origin based on available driver location.
 * If valid coordinates are provided, uses live location.
 * Otherwise falls back to Monash University.
 */
export function resolveRouteOrigin(driverLocation?: Coordinates | null): RouteOrigin {
  if (
    driverLocation &&
    typeof driverLocation.lat === 'number' &&
    typeof driverLocation.lng === 'number' &&
    !isNaN(driverLocation.lat) &&
    !isNaN(driverLocation.lng) &&
    driverLocation.lat >= -90 &&
    driverLocation.lat <= 90 &&
    driverLocation.lng >= -180 &&
    driverLocation.lng <= 180
  ) {
    return {
      coordinates: driverLocation,
      label: 'Current Location',
      source: 'live_location',
    }
  }

  return MONASH_FALLBACK_ORIGIN
}

/**
 * Get the user's current location with timeout.
 * Returns null if geolocation is unavailable, denied, or times out.
 */
export function getCurrentLocation(
  timeoutMs: number = LOCATION_TIMEOUT_MS
): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }

    const timeoutId = setTimeout(() => {
      resolve(null)
    }, timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId)
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => {
        clearTimeout(timeoutId)
        resolve(null)
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 30000, // Accept cached position up to 30 seconds old
      }
    )
  })
}

/**
 * Format origin label for display.
 */
export function formatOriginLabel(origin: RouteOrigin): string {
  if (origin.source === 'live_location') {
    return 'your current location'
  }
  return `${origin.label} (fallback)`
}

/**
 * Get a status message for the origin used.
 */
export function getOriginStatusMessage(origin: RouteOrigin): {
  message: string
  type: 'success' | 'warning'
} {
  if (origin.source === 'live_location') {
    return {
      message: 'Optimising from your current location',
      type: 'success',
    }
  }
  return {
    message: 'Location unavailable — optimising from Monash University',
    type: 'warning',
  }
}
