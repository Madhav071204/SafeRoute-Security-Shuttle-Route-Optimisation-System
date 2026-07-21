import { NextRequest, NextResponse } from 'next/server'
import { getDirections, getMapboxToken } from '@/lib/mapbox'
import { Coordinates } from '@/types'
import { AVERAGE_SPEED_KMH, MAX_DESTINATIONS } from '@/lib/constants'
import { haversineDistance } from '@/lib/algorithms/haversine'
import { isValidCoordinates } from '@/lib/validation'

interface StopInput {
  id: string
  coordinates: Coordinates
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { origin, stops, orderedStopIds } = body as {
      origin: unknown
      stops: unknown
      orderedStopIds: unknown
    }

    if (!isValidCoordinates(origin)) {
      return NextResponse.json(
        { error: 'Invalid origin coordinates', code: 'INVALID_ORIGIN' },
        { status: 400 }
      )
    }

    if (!Array.isArray(stops)) {
      return NextResponse.json(
        { error: 'stops must be an array', code: 'INVALID_STOPS' },
        { status: 400 }
      )
    }

    if (!Array.isArray(orderedStopIds)) {
      return NextResponse.json(
        { error: 'orderedStopIds must be an array', code: 'INVALID_ORDER' },
        { status: 400 }
      )
    }

    if (stops.length > MAX_DESTINATIONS) {
      return NextResponse.json(
        {
          error: `A maximum of ${MAX_DESTINATIONS} destinations is allowed`,
          code: 'TOO_MANY_DESTINATIONS',
          details: { max: MAX_DESTINATIONS, received: stops.length },
        },
        { status: 400 }
      )
    }

    // Validate every stop used to build the route — reject invalid values with
    // their index rather than returning a 200 with null/NaN distances.
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i] as { id?: unknown; coordinates?: unknown } | null
      if (!stop || typeof stop !== 'object' || typeof stop.id !== 'string' || stop.id.length === 0) {
        return NextResponse.json(
          { error: 'Invalid stop: a non-empty string id is required', code: 'INVALID_STOP', details: { stopIndex: i } },
          { status: 400 }
        )
      }
      if (!isValidCoordinates(stop.coordinates)) {
        return NextResponse.json(
          { error: 'Invalid stop coordinates', code: 'INVALID_COORDINATES', details: { stopIndex: i } },
          { status: 400 }
        )
      }
    }

    // No destinations to route — return an explicit empty result.
    if (orderedStopIds.length === 0) {
      return NextResponse.json({
        polyline: '',
        legs: [],
        totalDistanceKm: 0,
        totalDurationMinutes: 0,
        routeSource: 'none',
        isFallback: false,
      })
    }

    const validStops = stops as StopInput[]
    const stopMap = new Map(validStops.map((s) => [s.id, s]))

    // Build waypoints in the ordered sequence (origin first). Every id in the
    // order must be a string and refer to a provided stop.
    const waypoints: Coordinates[] = [origin]
    for (const id of orderedStopIds) {
      if (typeof id !== 'string') {
        return NextResponse.json(
          { error: 'orderedStopIds must contain only stop id strings', code: 'INVALID_ORDER' },
          { status: 400 }
        )
      }
      const stop = stopMap.get(id)
      if (stop) {
        waypoints.push(stop.coordinates)
      }
    }

    // Try to get directions from Mapbox
    let token: string
    try {
      token = getMapboxToken()
    } catch {
      // Fallback to haversine-based estimates if no token
      return calculateFallbackRoute(origin, stopMap, orderedStopIds as string[])
    }

    const result = await getDirections(waypoints, token)

    if (!result.success) {
      // Fallback to haversine-based estimates
      return calculateFallbackRoute(origin, stopMap, orderedStopIds as string[])
    }

    // Build legs with stop IDs
    const legs = []
    let prevId: string | 'origin' = 'origin'
    for (let i = 0; i < orderedStopIds.length; i++) {
      legs.push({
        fromStopId: prevId,
        toStopId: orderedStopIds[i] as string,
        distanceKm: result.legs?.[i]?.distance || 0,
        durationMinutes: result.legs?.[i]?.duration || 0,
      })
      prevId = orderedStopIds[i] as string
    }

    return NextResponse.json({
      polyline: result.polyline || '',
      legs,
      totalDistanceKm: Math.round((result.distance || 0) * 100) / 100,
      totalDurationMinutes: Math.round((result.duration || 0) * 100) / 100,
      routeSource: 'mapbox',
      isFallback: false,
    })
  } catch (error) {
    console.error('Route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateFallbackRoute(
  origin: Coordinates,
  stopMap: Map<string, StopInput>,
  orderedStopIds: string[]
) {
  let totalDistanceKm = 0
  const legs = []
  let currentPos = origin
  let prevId: string | 'origin' = 'origin'

  for (const id of orderedStopIds) {
    const stop = stopMap.get(id)
    if (stop) {
      const distance = haversineDistance(currentPos, stop.coordinates)
      const duration = (distance / AVERAGE_SPEED_KMH) * 60 // minutes

      legs.push({
        fromStopId: prevId,
        toStopId: id,
        distanceKm: Math.round(distance * 100) / 100,
        durationMinutes: Math.round(duration * 100) / 100,
      })

      totalDistanceKm += distance
      currentPos = stop.coordinates
      prevId = id
    }
  }

  const totalDurationMinutes = (totalDistanceKm / AVERAGE_SPEED_KMH) * 60

  return NextResponse.json({
    // Straight-line estimate — no polyline is available without Mapbox.
    polyline: '',
    legs,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    totalDurationMinutes: Math.round(totalDurationMinutes * 100) / 100,
    routeSource: 'haversine-fallback',
    isFallback: true,
  })
}
