import { Coordinates, DirectionsResponse, DirectionRoute } from '@/types'

export async function fetchDirections(
  origin: Coordinates,
  destination: Coordinates,
  waypoints?: Coordinates[]
): Promise<DirectionsResponse> {
  try {
    const response = await fetch('/api/directions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, waypoints }),
    })

    const data = await response.json()
    return data
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

export function getManeuverIcon(maneuverType: string, modifier?: string): string {
  const type = maneuverType.toLowerCase()
  const mod = modifier?.toLowerCase()

  if (type === 'arrive') return '🏁'
  if (type === 'depart') return '🚗'

  if (type === 'turn' || type === 'end of road' || type === 'fork') {
    if (mod === 'left') return '↰'
    if (mod === 'right') return '↱'
    if (mod === 'sharp left') return '↰'
    if (mod === 'sharp right') return '↱'
    if (mod === 'slight left') return '↖'
    if (mod === 'slight right') return '↗'
    if (mod === 'uturn') return '↩'
  }

  if (type === 'merge') {
    if (mod === 'left') return '↖'
    if (mod === 'right') return '↗'
    return '↑'
  }

  if (type === 'roundabout' || type === 'rotary') return '↻'
  if (type === 'continue' || type === 'new name') return '↑'
  if (type === 'on ramp' || type === 'off ramp') return '⤴'

  return '↑'
}

export function formatManeuverDistance(meters: number): string {
  if (meters < 100) {
    return `${Math.round(meters)} m`
  }
  if (meters < 1000) {
    return `${Math.round(meters / 10) * 10} m`
  }
  const km = meters / 1000
  if (km < 10) {
    return `${km.toFixed(1)} km`
  }
  return `${Math.round(km)} km`
}

export function formatDurationSeconds(seconds: number): string {
  if (seconds < 60) {
    return '< 1 min'
  }
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} hr`
  }
  return `${hours} hr ${mins} min`
}

export function calculateDistanceToPoint(
  from: Coordinates,
  to: Coordinates
): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Calculate the perpendicular distance from a point to a line segment.
 * Returns the minimum distance from the point to any point on the segment.
 */
function distanceToLineSegment(
  point: Coordinates,
  segmentStart: Coordinates,
  segmentEnd: Coordinates
): number {
  const px = point.lng
  const py = point.lat
  const x1 = segmentStart.lng
  const y1 = segmentStart.lat
  const x2 = segmentEnd.lng
  const y2 = segmentEnd.lat

  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    return calculateDistanceToPoint(point, segmentStart)
  }

  // Calculate projection of point onto line segment
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared
  t = Math.max(0, Math.min(1, t))

  const projectedPoint: Coordinates = {
    lng: x1 + t * dx,
    lat: y1 + t * dy,
  }

  return calculateDistanceToPoint(point, projectedPoint)
}

/**
 * Find the closest point on the route polyline to the current position.
 * This checks distance to line segments, not just vertices.
 */
export function findClosestPointOnRoute(
  currentPosition: Coordinates,
  routeGeometry: GeoJSON.LineString
): { point: Coordinates; index: number; distance: number } {
  let minDistance = Infinity
  let closestPoint: Coordinates = currentPosition
  let closestIndex = 0

  const coords = routeGeometry.coordinates

  if (coords.length === 0) {
    return { point: currentPosition, index: 0, distance: Infinity }
  }

  if (coords.length === 1) {
    const point: Coordinates = { lng: coords[0][0], lat: coords[0][1] }
    return {
      point,
      index: 0,
      distance: calculateDistanceToPoint(currentPosition, point),
    }
  }

  // Check distance to each line segment
  for (let i = 0; i < coords.length - 1; i++) {
    const segStart: Coordinates = { lng: coords[i][0], lat: coords[i][1] }
    const segEnd: Coordinates = { lng: coords[i + 1][0], lat: coords[i + 1][1] }

    const distance = distanceToLineSegment(currentPosition, segStart, segEnd)

    if (distance < minDistance) {
      minDistance = distance
      closestIndex = i
      // Calculate the actual closest point on the segment
      const px = currentPosition.lng
      const py = currentPosition.lat
      const dx = segEnd.lng - segStart.lng
      const dy = segEnd.lat - segStart.lat
      const lengthSquared = dx * dx + dy * dy
      
      if (lengthSquared === 0) {
        closestPoint = segStart
      } else {
        let t = ((px - segStart.lng) * dx + (py - segStart.lat) * dy) / lengthSquared
        t = Math.max(0, Math.min(1, t))
        closestPoint = {
          lng: segStart.lng + t * dx,
          lat: segStart.lat + t * dy,
        }
      }
    }
  }

  return { point: closestPoint, index: closestIndex, distance: minDistance }
}

/**
 * Calculate off-route threshold based on GPS accuracy.
 * Uses a minimum of 100m or 1.5x the GPS accuracy.
 */
export function calculateOffRouteThreshold(gpsAccuracy?: number): number {
  const baseThreshold = 100 // 100 meters minimum
  const accuracy = gpsAccuracy ?? 50
  return Math.max(baseThreshold, accuracy * 1.5)
}

/**
 * Check if the driver is off-route.
 * Compares driver position to the route polyline (line segments, not just vertices).
 */
export function isOffRoute(
  currentPosition: Coordinates,
  route: DirectionRoute,
  gpsAccuracy?: number
): boolean {
  const threshold = calculateOffRouteThreshold(gpsAccuracy)
  const { distance } = findClosestPointOnRoute(currentPosition, route.geometry)
  
  // Debug logging
  console.log('[Navigation] Off-route check:', {
    distanceToRoute: Math.round(distance),
    threshold: Math.round(threshold),
    gpsAccuracy: gpsAccuracy ?? 'unknown',
    isOffRoute: distance > threshold,
    routePointCount: route.geometry.coordinates.length,
  })
  
  return distance > threshold
}

/**
 * Get the distance from driver to route polyline.
 */
export function getDistanceToRoute(
  currentPosition: Coordinates,
  routeGeometry: GeoJSON.LineString
): number {
  const { distance } = findClosestPointOnRoute(currentPosition, routeGeometry)
  return distance
}

export function findCurrentStepIndex(
  currentPosition: Coordinates,
  steps: DirectionRoute['steps'],
  currentIndex: number = 0
): { stepIndex: number; distanceToManeuver: number } {
  if (steps.length === 0) {
    return { stepIndex: 0, distanceToManeuver: 0 }
  }

  // Start from current index and look ahead
  for (let i = currentIndex; i < steps.length; i++) {
    const step = steps[i]
    const distanceToManeuver = calculateDistanceToPoint(
      currentPosition,
      step.location
    )

    // If we're close to this maneuver, this is our current step
    if (distanceToManeuver < 30) {
      // Within 30m of maneuver point
      // Move to next step if available
      if (i + 1 < steps.length) {
        const nextStep = steps[i + 1]
        const distanceToNext = calculateDistanceToPoint(
          currentPosition,
          nextStep.location
        )
        return { stepIndex: i + 1, distanceToManeuver: distanceToNext }
      }
      return { stepIndex: i, distanceToManeuver }
    }

    // If this is our current or future step, return it
    if (i >= currentIndex) {
      return { stepIndex: i, distanceToManeuver }
    }
  }

  // Fallback to last step
  const lastStep = steps[steps.length - 1]
  const distance = calculateDistanceToPoint(currentPosition, lastStep.location)
  return { stepIndex: steps.length - 1, distanceToManeuver: distance }
}

export function getRemainingDistance(
  route: DirectionRoute,
  currentStepIndex: number
): number {
  let remaining = 0
  for (let i = currentStepIndex; i < route.steps.length; i++) {
    remaining += route.steps[i].distance
  }
  return remaining
}

export function getRemainingDuration(
  route: DirectionRoute,
  currentStepIndex: number
): number {
  let remaining = 0
  for (let i = currentStepIndex; i < route.steps.length; i++) {
    remaining += route.steps[i].duration
  }
  return remaining
}
