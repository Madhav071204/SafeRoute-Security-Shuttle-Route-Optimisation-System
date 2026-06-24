import { NextRequest, NextResponse } from 'next/server'
import { nearestNeighborRoute, calculateTotalDistance } from '@/lib/algorithms/nearestNeighbor'
import { Coordinates } from '@/types'

interface StopInput {
  id: string
  coordinates: Coordinates
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { origin, stops } = body as { origin: Coordinates; stops: StopInput[] }

    if (!origin || !origin.lat || !origin.lng) {
      return NextResponse.json(
        { error: 'Invalid request: origin coordinates required' },
        { status: 400 }
      )
    }

    if (!stops || !Array.isArray(stops)) {
      return NextResponse.json(
        { error: 'Invalid request: stops array required' },
        { status: 400 }
      )
    }

    if (stops.length === 0) {
      return NextResponse.json({
        orderedStopIds: [],
        totalDistanceKm: 0,
      })
    }

    // Validate all stops have coordinates
    const validStops = stops.filter(
      (s) => s.coordinates && s.coordinates.lat && s.coordinates.lng
    )

    if (validStops.length === 0) {
      return NextResponse.json({
        orderedStopIds: [],
        totalDistanceKm: 0,
      })
    }

    // Run nearest-neighbor optimization
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
