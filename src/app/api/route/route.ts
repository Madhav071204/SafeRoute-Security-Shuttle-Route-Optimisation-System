import { NextRequest, NextResponse } from 'next/server'
import { getDirections, getMapboxToken } from '@/lib/mapbox'
import { Coordinates } from '@/types'
import { AVERAGE_SPEED_KMH } from '@/lib/constants'
import { haversineDistance } from '@/lib/algorithms/haversine'

interface StopInput {
  id: string
  coordinates: Coordinates
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { origin, stops, orderedStopIds } = body as {
      origin: Coordinates
      stops: StopInput[]
      orderedStopIds: string[]
    }

    if (!origin || !origin.lat || !origin.lng) {
      return NextResponse.json(
        { error: 'Invalid request: origin coordinates required' },
        { status: 400 }
      )
    }

    if (!stops || !Array.isArray(stops) || !orderedStopIds || !Array.isArray(orderedStopIds)) {
      return NextResponse.json(
        { error: 'Invalid request: stops and orderedStopIds required' },
        { status: 400 }
      )
    }

    if (orderedStopIds.length === 0) {
      return NextResponse.json({
        polyline: '',
        legs: [],
        totalDistanceKm: 0,
        totalDurationMinutes: 0,
      })
    }

    const stopMap = new Map(stops.map((s) => [s.id, s]))

    // Build waypoints in the ordered sequence
    const waypoints: Coordinates[] = [origin]
    for (const id of orderedStopIds) {
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
      return calculateFallbackRoute(origin, stopMap, orderedStopIds)
    }

    const result = await getDirections(waypoints, token)

    if (!result.success) {
      // Fallback to haversine-based estimates
      return calculateFallbackRoute(origin, stopMap, orderedStopIds)
    }

    // Build legs with stop IDs
    const legs = []
    let prevId: string | 'origin' = 'origin'
    for (let i = 0; i < orderedStopIds.length; i++) {
      legs.push({
        fromStopId: prevId,
        toStopId: orderedStopIds[i],
        distanceKm: result.legs?.[i]?.distance || 0,
        durationMinutes: result.legs?.[i]?.duration || 0,
      })
      prevId = orderedStopIds[i]
    }

    return NextResponse.json({
      polyline: result.polyline || '',
      legs,
      totalDistanceKm: Math.round((result.distance || 0) * 100) / 100,
      totalDurationMinutes: Math.round((result.duration || 0) * 100) / 100,
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
    polyline: '', // No polyline without Mapbox
    legs,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    totalDurationMinutes: Math.round(totalDurationMinutes * 100) / 100,
  })
}
