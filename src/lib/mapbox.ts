import { Coordinates, GeocodeResult } from '@/types'

const MAPBOX_BASE_URL = 'https://api.mapbox.com'

const PLACEHOLDER_TOKENS = new Set([
  'your_mapbox_public_token_here',
  'your_mapbox_server_token_here',
])

/**
 * Resolve the server-side Mapbox access token.
 *
 * Preference order:
 * 1. `MAPBOX_ACCESS_TOKEN` — server-only (never bundled into the browser)
 * 2. `NEXT_PUBLIC_MAPBOX_TOKEN` — documented development/fallback only
 *
 * Client Mapbox GL must continue to use `NEXT_PUBLIC_MAPBOX_TOKEN` directly.
 * Neither token value is returned in API error responses.
 */
export function getMapboxToken(): string {
  const serverToken = process.env.MAPBOX_ACCESS_TOKEN?.trim()
  if (serverToken && !PLACEHOLDER_TOKENS.has(serverToken)) {
    return serverToken
  }

  const publicToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim()
  if (publicToken && !PLACEHOLDER_TOKENS.has(publicToken)) {
    return publicToken
  }

  throw new Error(
    'Mapbox token not configured. Set MAPBOX_ACCESS_TOKEN (preferred) or NEXT_PUBLIC_MAPBOX_TOKEN in the server environment.'
  )
}

/**
 * Geocode a single address using the Mapbox Geocoding API.
 */
export async function geocodeAddress(
  address: string,
  token: string
): Promise<{ success: boolean; coordinates?: Coordinates; error?: string }> {
  try {
    const encodedAddress = encodeURIComponent(address)
    const url = `${MAPBOX_BASE_URL}/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${token}&country=AU&limit=1`

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Invalid API key' }
      }
      if (response.status === 429) {
        return { success: false, error: 'API quota exceeded' }
      }
      return { success: false, error: `API error: ${response.status}` }
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return { success: false, error: 'Address not found' }
    }

    const [lng, lat] = data.features[0].center
    return {
      success: true,
      coordinates: { lat, lng },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Batch geocode multiple addresses.
 */
export async function batchGeocodeAddresses(
  addresses: { id: string; address: string }[],
  token: string
): Promise<GeocodeResult[]> {
  const results = await Promise.all(
    addresses.map(async ({ id, address }) => {
      const result = await geocodeAddress(address, token)
      return {
        id,
        success: result.success,
        coordinates: result.coordinates,
        error: result.error,
      }
    })
  )
  return results
}

/**
 * Get driving directions between waypoints using Mapbox Directions API.
 */
export async function getDirections(
  waypoints: Coordinates[],
  token: string
): Promise<{
  success: boolean
  polyline?: string
  distance?: number
  duration?: number
  legs?: { distance: number; duration: number }[]
  error?: string
}> {
  if (waypoints.length < 2) {
    return { success: false, error: 'At least 2 waypoints required' }
  }

  try {
    const coordinates = waypoints
      .map((w) => `${w.lng},${w.lat}`)
      .join(';')

    const url = `${MAPBOX_BASE_URL}/directions/v5/mapbox/driving/${coordinates}?access_token=${token}&geometries=polyline&overview=full`

    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Invalid API key' }
      }
      if (response.status === 429) {
        return { success: false, error: 'API quota exceeded' }
      }
      return { success: false, error: `API error: ${response.status}` }
    }

    const data = await response.json()

    if (!data.routes || data.routes.length === 0) {
      return { success: false, error: 'No route found' }
    }

    const route = data.routes[0]
    return {
      success: true,
      polyline: route.geometry,
      distance: route.distance / 1000, // Convert to km
      duration: route.duration / 60, // Convert to minutes
      legs: route.legs.map((leg: { distance: number; duration: number }) => ({
        distance: leg.distance / 1000,
        duration: leg.duration / 60,
      })),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
