'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { SearchSuggestion, SearchState, SearchOptions } from '@/types/location'
import { searchAddresses, retrieveSuggestion, resetSessionToken } from '@/lib/search'
import { Coordinates } from '@/types'

const DEBOUNCE_MS = 300

interface UseAddressSearchOptions {
  proximity?: Coordinates
  onSelect?: (suggestion: SearchSuggestion) => void
}

interface UseAddressSearchReturn extends SearchState {
  setQuery: (query: string) => void
  selectSuggestion: (suggestion: SearchSuggestion) => Promise<void>
  handleKeyDown: (e: React.KeyboardEvent) => void
  clearSearch: () => void
  closeDropdown: () => void
  openDropdown: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
}

export function useAddressSearch(options: UseAddressSearchOptions = {}): UseAddressSearchReturn {
  const { proximity, onSelect } = options

  const [state, setState] = useState<SearchState>({
    query: '',
    suggestions: [],
    isLoading: false,
    error: null,
    isOpen: false,
    highlightedIndex: -1,
  })

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const lastQueryRef = useRef<string>('')

  const performSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setState(prev => ({
        ...prev,
        suggestions: [],
        isLoading: false,
        error: null,
        isOpen: false,
      }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    const searchOptions: SearchOptions = {
      proximity,
      country: 'AU',
      limit: 8,
    }

    const result = await searchAddresses(query, searchOptions)

    if (query !== lastQueryRef.current) {
      return
    }

    if (result.success) {
      setState(prev => ({
        ...prev,
        suggestions: result.suggestions,
        isLoading: false,
        isOpen: result.suggestions.length > 0,
        highlightedIndex: -1,
      }))
    } else {
      setState(prev => ({
        ...prev,
        suggestions: [],
        isLoading: false,
        error: result.error || 'Search failed',
        isOpen: false,
      }))
    }
  }, [proximity])

  const setQuery = useCallback((query: string) => {
    lastQueryRef.current = query
    setState(prev => ({ ...prev, query }))

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.trim().length < 2) {
      setState(prev => ({
        ...prev,
        suggestions: [],
        isLoading: false,
        isOpen: false,
      }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true }))

    debounceRef.current = setTimeout(() => {
      performSearch(query)
    }, DEBOUNCE_MS)
  }, [performSearch])

  const selectSuggestion = useCallback(async (suggestion: SearchSuggestion) => {
    setState(prev => ({ ...prev, isLoading: true, isOpen: false }))

    if (suggestion.mapboxId && (!suggestion.coordinates || (suggestion.coordinates.lat === 0 && suggestion.coordinates.lng === 0))) {
      const result = await retrieveSuggestion(suggestion.mapboxId)
      
      if (result.success && result.suggestion) {
        setState(prev => ({
          ...prev,
          query: result.suggestion!.fullAddress || result.suggestion!.displayName,
          suggestions: [],
          isLoading: false,
          isOpen: false,
          highlightedIndex: -1,
        }))
        resetSessionToken()
        onSelect?.(result.suggestion)
        return
      }
    }

    setState(prev => ({
      ...prev,
      query: suggestion.fullAddress || suggestion.displayName,
      suggestions: [],
      isLoading: false,
      isOpen: false,
      highlightedIndex: -1,
    }))
    resetSessionToken()
    onSelect?.(suggestion)
  }, [onSelect])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const { suggestions, highlightedIndex, isOpen } = state

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen && suggestions.length > 0) {
          setState(prev => ({ ...prev, isOpen: true, highlightedIndex: 0 }))
        } else if (isOpen) {
          setState(prev => ({
            ...prev,
            highlightedIndex: Math.min(prev.highlightedIndex + 1, suggestions.length - 1),
          }))
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        if (isOpen) {
          setState(prev => ({
            ...prev,
            highlightedIndex: Math.max(prev.highlightedIndex - 1, 0),
          }))
        }
        break

      case 'Enter':
        e.preventDefault()
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          selectSuggestion(suggestions[highlightedIndex])
        }
        break

      case 'Escape':
        e.preventDefault()
        setState(prev => ({ ...prev, isOpen: false, highlightedIndex: -1 }))
        break

      case 'Tab':
        setState(prev => ({ ...prev, isOpen: false }))
        break
    }
  }, [state, selectSuggestion])

  const clearSearch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    lastQueryRef.current = ''
    resetSessionToken()
    setState({
      query: '',
      suggestions: [],
      isLoading: false,
      error: null,
      isOpen: false,
      highlightedIndex: -1,
    })
  }, [])

  const closeDropdown = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, highlightedIndex: -1 }))
  }, [])

  const openDropdown = useCallback(() => {
    if (state.suggestions.length > 0) {
      setState(prev => ({ ...prev, isOpen: true }))
    }
  }, [state.suggestions.length])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    ...state,
    setQuery,
    selectSuggestion,
    handleKeyDown,
    clearSearch,
    closeDropdown,
    openDropdown,
    inputRef,
  }
}
