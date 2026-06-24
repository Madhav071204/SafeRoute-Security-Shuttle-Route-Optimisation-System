import { NextRequest, NextResponse } from 'next/server'
import { batchGeocodeAddresses, getMapboxToken } from '@/lib/mapbox'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { addresses } = body

    if (!addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: 'Invalid request: addresses array required' },
        { status: 400 }
      )
    }

    if (addresses.length === 0) {
      return NextResponse.json({ results: [] })
    }

    let token: string
    try {
      token = getMapboxToken()
    } catch {
      return NextResponse.json(
        { error: 'Mapbox API key not configured. Please add your key to .env.local' },
        { status: 500 }
      )
    }

    const results = await batchGeocodeAddresses(addresses, token)

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Geocode batch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
