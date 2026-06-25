import { Coordinates } from './index'

export interface SearchSuggestion {
  id: string
  displayName: string
  fullAddress: string
  coordinates: Coordinates
  placeType: string[]
  mapboxId?: string
}

export interface SearchState {
  query: string
  suggestions: SearchSuggestion[]
  isLoading: boolean
  error: string | null
  isOpen: boolean
  highlightedIndex: number
}

export interface SearchOptions {
  proximity?: Coordinates
  country?: string
  limit?: number
  types?: string[]
}

export type SearchInputStatus = 'idle' | 'searching' | 'selected' | 'error'
