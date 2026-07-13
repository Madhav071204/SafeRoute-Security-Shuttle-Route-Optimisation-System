import { NextRequest, NextResponse } from 'next/server'
import { nearestNeighborRoute, calculateTotalDistance } from '@/lib/algorithms/nearestNeighbor'
import { isValidCoordinates } from '@/lib/validation'
import { MAX_DESTINATIONS } from '@/lib/constants'
import { Coordinates } from '@/types'

interface StopInput {
  id: string
  coordinates: Coordinates
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { origin, stops } = body as { origin: unknown; stops: unknown }

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

    // Zero destinations is a valid (empty) request, not an error.
    if (stops.length === 0) {
      return NextResponse.json({ orderedStopIds: [], totalDistanceKm: 0 })
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

    // Validate every stop up front. Invalid stops are reported (with their
    // index) and rejected — never silently removed. Duplicate valid stops and
    // zero-valued coordinates are preserved.
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

    const validStops = stops as StopInput[]

    const orderedStopIds = nearestNeighborRoute(origin, validStops)
    const totalDistanceKm = calculateTotalDistance(origin, validStops, orderedStopIds)

    return NextResponse.json({
      orderedStopIds,
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    })
  } catch (error) {
    console.error('Optimize error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
