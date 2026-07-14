import { NextRequest, NextResponse } from 'next/server'
import { batchGeocodeAddresses, getMapboxToken } from '@/lib/mapbox'
import { MAX_DESTINATIONS, MAX_ADDRESS_LENGTH } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { addresses } = body as { addresses: unknown }

    // Validate request structure BEFORE calling Mapbox.
    if (!Array.isArray(addresses)) {
      return NextResponse.json(
        { error: 'addresses must be an array', code: 'INVALID_ADDRESSES' },
        { status: 400 }
      )
    }

    if (addresses.length === 0) {
      return NextResponse.json(
        { error: 'At least one address is required', code: 'EMPTY_BATCH' },
        { status: 400 }
      )
    }

    if (addresses.length > MAX_DESTINATIONS) {
      return NextResponse.json(
        {
          error: `A maximum of ${MAX_DESTINATIONS} addresses is allowed`,
          code: 'TOO_MANY_ADDRESSES',
          details: { max: MAX_DESTINATIONS, received: addresses.length },
        },
        { status: 400 }
      )
    }

    // Validate every entry. Input order and duplicates are preserved; invalid
    // entries are reported (with their index), never silently removed.
    for (let i = 0; i < addresses.length; i++) {
      const entry = addresses[i] as { id?: unknown; address?: unknown } | null
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return NextResponse.json(
          { error: 'Invalid address entry', code: 'INVALID_ADDRESS_ENTRY', details: { index: i } },
          { status: 400 }
        )
      }
      if (typeof entry.id !== 'string' || entry.id.length === 0) {
        return NextResponse.json(
          { error: 'Each address entry requires a non-empty string id', code: 'INVALID_ADDRESS_ID', details: { index: i } },
          { status: 400 }
        )
      }
      if (typeof entry.address !== 'string') {
        return NextResponse.json(
          { error: 'Each address must be a string', code: 'INVALID_ADDRESS', details: { index: i } },
          { status: 400 }
        )
      }
      if (entry.address.trim().length === 0) {
        return NextResponse.json(
          { error: 'Address must not be empty', code: 'EMPTY_ADDRESS', details: { index: i } },
          { status: 400 }
        )
      }
      if (entry.address.length > MAX_ADDRESS_LENGTH) {
        return NextResponse.json(
          {
            error: `Address exceeds the maximum length of ${MAX_ADDRESS_LENGTH} characters`,
            code: 'ADDRESS_TOO_LONG',
            details: { index: i, max: MAX_ADDRESS_LENGTH },
          },
          { status: 400 }
        )
      }
    }

    let token: string
    try {
      token = getMapboxToken()
    } catch {
      return NextResponse.json(
        { error: 'Mapbox API key not configured. Please add your key to .env.local', code: 'MAPBOX_NOT_CONFIGURED' },
        { status: 500 }
      )
    }

    const results = await batchGeocodeAddresses(
      addresses as { id: string; address: string }[],
      token
    )

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Geocode batch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
