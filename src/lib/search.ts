import { Coordinates } from '@/types'
import { SearchSuggestion, SearchOptions } from '@/types/location'
import { MONASH_FALLBACK_ORIGIN } from './constants'

const MAPBOX_SEARCH_URL = 'https://api.mapbox.com/search/searchbox/v1/suggest'
const MAPBOX_RETRIEVE_URL = 'https://api.mapbox.com/search/searchbox/v1/retrieve'

export interface SearchResult {
  success: boolean
  suggestions: SearchSuggestion[]
  error?: string
}

export interface RetrieveResult {
  success: boolean
  suggestion?: SearchSuggestion
  error?: string
}

function getMapboxToken(): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token || token === 'your_mapbox_public_token_here') {
    throw new Error('Mapbox token not configured')
  }
  return token
}

export async function searchAddresses(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  if (!query || query.trim().length < 2) {
    return { success: true, suggestions: [] }
  }

  try {
    const token = getMapboxToken()
    const proximity = options.proximity || MONASH_FALLBACK_ORIGIN.coordinates
    const country = options.country || 'AU'
    const limit = options.limit || 8
    
    const params = new URLSearchParams({
      q: query.trim(),
      access_token: token,
      session_token: getSessionToken(),
      language: 'en',
      country: country,
      limit: limit.toString(),
      proximity: `${proximity.lng},${proximity.lat}`,
      types: options.types?.join(',') || 'address,place,poi,neighborhood,locality,district,region',
    })

    const response = await fetch(`${MAPBOX_SEARCH_URL}?${params}`)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, suggestions: [], error: 'Invalid API key' }
      }
      if (response.status === 429) {
        return { success: false, suggestions: [], error: 'Rate limit exceeded. Please try again.' }
      }
      return { success: false, suggestions: [], error: `Search failed: ${response.status}` }
    }

    const data = await response.json()
    
    const suggestions: SearchSuggestion[] = (data.suggestions || []).map((s: MapboxSuggestion) => ({
      id: s.mapbox_id,
      displayName: s.name || s.address || '',
      fullAddress: s.full_address || s.place_formatted || s.name || '',
      coordinates: { lat: 0, lng: 0 },
      placeType: s.feature_type ? [s.feature_type] : [],
      mapboxId: s.mapbox_id,
    }))

    return { success: true, suggestions }
  } catch (error) {
    console.error('Search error:', error)
    return {
      success: false,
      suggestions: [],
      error: error instanceof Error ? error.message : 'Search failed',
    }
  }
}

export async function retrieveSuggestion(mapboxId: string): Promise<RetrieveResult> {
  try {
    const token = getMapboxToken()
    
    const params = new URLSearchParams({
      access_token: token,
      session_token: getSessionToken(),
    })

    const response = await fetch(`${MAPBOX_RETRIEVE_URL}/${mapboxId}?${params}`)

    if (!response.ok) {
      return { success: false, error: `Retrieve failed: ${response.status}` }
    }

    const data = await response.json()
    
    if (!data.features || data.features.length === 0) {
      return { success: false, error: 'Location details not found' }
    }

    const feature = data.features[0]
    const [lng, lat] = feature.geometry.coordinates

    const suggestion: SearchSuggestion = {
      id: mapboxId,
      displayName: feature.properties.name || feature.properties.address || '',
      fullAddress: feature.properties.full_address || feature.properties.place_formatted || '',
      coordinates: { lat, lng },
      placeType: feature.properties.feature_type ? [feature.properties.feature_type] : [],
      mapboxId: mapboxId,
    }

    return { success: true, suggestion }
  } catch (error) {
    console.error('Retrieve error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get location details',
    }
  }
}

interface MapboxSuggestion {
  mapbox_id: string
  name?: string
  address?: string
  full_address?: string
  place_formatted?: string
  feature_type?: string
}

let sessionToken: string | null = null

function getSessionToken(): string {
  if (!sessionToken) {
    sessionToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }
  return sessionToken
}

export function resetSessionToken(): void {
  sessionToken = null
}
