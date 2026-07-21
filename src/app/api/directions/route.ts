import { NextRequest, NextResponse } from 'next/server'
import { getMapboxToken } from '@/lib/mapbox'
import { Coordinates, DirectionRoute, NavigationStep, DirectionLeg } from '@/types'
import { isValidCoordinates } from '@/lib/validation'

const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving-traffic'

interface MapboxStep {
  maneuver: {
    instruction: string
    type: string
    modifier?: string
    location: [number, number]
  }
  distance: number
  duration: number
  name: string
}

interface MapboxLeg {
  distance: number
  duration: number
  steps: MapboxStep[]
}

interface MapboxRoute {
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  distance: number
  duration: number
  legs: MapboxLeg[]
}

interface MapboxResponse {
  code: string
  routes: MapboxRoute[]
  message?: string
}

function parseSteps(mapboxSteps: MapboxStep[]): NavigationStep[] {
  return mapboxSteps.map((step) => ({
    instruction: step.maneuver.instruction,
    maneuverType: step.maneuver.type,
    modifier: step.maneuver.modifier,
    distance: step.distance,
    duration: step.duration,
    location: {
      lat: step.maneuver.location[1],
      lng: step.maneuver.location[0],
    },
    roadName: step.name || undefined,
  }))
}

function parseLegs(mapboxLegs: MapboxLeg[]): DirectionLeg[] {
  return mapboxLegs.map((leg) => ({
    distance: leg.distance,
    duration: leg.duration,
    steps: parseSteps(leg.steps),
  }))
}

function parseRoute(mapboxRoute: MapboxRoute): DirectionRoute {
  const legs = parseLegs(mapboxRoute.legs)
  const allSteps = legs.flatMap((leg) => leg.steps)

  return {
    geometry: {
      type: 'LineString',
      coordinates: mapboxRoute.geometry.coordinates,
    },
    distance: mapboxRoute.distance,
    duration: mapboxRoute.duration,
    legs,
    steps: allSteps,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      origin: unknown
      destination: unknown
      waypoints?: unknown
    }
    const { origin, destination, waypoints } = body

    if (!isValidCoordinates(origin)) {
      return NextResponse.json(
        { success: false, error: 'Invalid origin coordinates' },
        { status: 400 }
      )
    }

    if (!isValidCoordinates(destination)) {
      return NextResponse.json(
        { success: false, error: 'Invalid destination coordinates' },
        { status: 400 }
      )
    }

    let safeWaypoints: Coordinates[] = []
    if (waypoints !== undefined) {
      if (!Array.isArray(waypoints) || !waypoints.every(isValidCoordinates)) {
        return NextResponse.json(
          { success: false, error: 'Invalid waypoint coordinates' },
          { status: 400 }
        )
      }
      safeWaypoints = waypoints
    }

    let token: string
    try {
      token = getMapboxToken()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Mapbox token not configured' },
        { status: 500 }
      )
    }

    // Build coordinates string: origin;waypoint1;waypoint2;...;destination
    const coords: Coordinates[] = [origin]
    if (safeWaypoints.length > 0) {
      coords.push(...safeWaypoints)
    }
    coords.push(destination)

    const coordinatesStr = coords
      .map((c) => `${c.lng},${c.lat}`)
      .join(';')

    const params = new URLSearchParams({
      access_token: token,
      geometries: 'geojson',
      overview: 'full',
      steps: 'true',
      alternatives: 'false',
      annotations: 'distance,duration',
      banner_instructions: 'true',
      voice_instructions: 'true',
    })

    const url = `${MAPBOX_DIRECTIONS_URL}/${coordinatesStr}?${params.toString()}`
    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { success: false, error: 'Invalid Mapbox API key' },
          { status: 401 }
        )
      }
      if (response.status === 429) {
        return NextResponse.json(
          { success: false, error: 'API rate limit exceeded' },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { success: false, error: `Mapbox API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data: MapboxResponse = await response.json()

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return NextResponse.json(
        { success: false, error: data.message || 'No route found' },
        { status: 404 }
      )
    }

    const route = parseRoute(data.routes[0])

    return NextResponse.json({
      success: true,
      route,
    })
  } catch (error) {
    console.error('Directions API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
