import { Coordinates } from '@/types'

/**
 * Calculate the distance between two points on Earth using the Haversine formula.
 * Returns the distance in kilometers.
 */
export function haversineDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371 // Earth's radius in kilometers

  const lat1Rad = toRadians(point1.lat)
  const lat2Rad = toRadians(point2.lat)
  const deltaLat = toRadians(point2.lat - point1.lat)
  const deltaLng = toRadians(point2.lng - point1.lng)

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate the total distance for a route (array of coordinates).
 * The route should include the origin as the first point.
 */
export function calculateRouteDistance(route: Coordinates[]): number {
  if (route.length < 2) return 0

  let totalDistance = 0
  for (let i = 0; i < route.length - 1; i++) {
    totalDistance += haversineDistance(route[i], route[i + 1])
  }

  return totalDistance
}
