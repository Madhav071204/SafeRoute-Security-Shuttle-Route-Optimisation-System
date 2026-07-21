import { afterEach, describe, expect, it } from 'vitest'
import { getMapboxToken } from '@/lib/mapbox'

describe('getMapboxToken', () => {
  const originalPublic = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const originalServer = process.env.MAPBOX_ACCESS_TOKEN

  afterEach(() => {
    if (originalPublic === undefined) delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    else process.env.NEXT_PUBLIC_MAPBOX_TOKEN = originalPublic
    if (originalServer === undefined) delete process.env.MAPBOX_ACCESS_TOKEN
    else process.env.MAPBOX_ACCESS_TOKEN = originalServer
  })

  it('prefers MAPBOX_ACCESS_TOKEN over the public token', () => {
    process.env.MAPBOX_ACCESS_TOKEN = 'sk.server-only-token'
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.public-browser-token'
    expect(getMapboxToken()).toBe('sk.server-only-token')
  })

  it('falls back to NEXT_PUBLIC_MAPBOX_TOKEN when the server token is absent', () => {
    delete process.env.MAPBOX_ACCESS_TOKEN
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.public-browser-token'
    expect(getMapboxToken()).toBe('pk.public-browser-token')
  })

  it('rejects documented placeholders', () => {
    process.env.MAPBOX_ACCESS_TOKEN = 'your_mapbox_server_token_here'
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'your_mapbox_public_token_here'
    expect(() => getMapboxToken()).toThrow(/Mapbox token not configured/)
  })

  it('throws when neither token is configured', () => {
    delete process.env.MAPBOX_ACCESS_TOKEN
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    expect(() => getMapboxToken()).toThrow(/Mapbox token not configured/)
  })
})
