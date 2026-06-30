'use client'

import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { useAddressSearch } from '@/hooks/useAddressSearch'
import { SearchSuggestion } from '@/types/location'
import { Coordinates } from '@/types'

interface AddressSearchInputProps {
  value: string
  onChange: (value: string) => void
  onSelect: (suggestion: SearchSuggestion) => void
  placeholder?: string
  disabled?: boolean
  hasError?: boolean
  errorMessage?: string
  proximity?: Coordinates
  className?: string
}

export function AddressSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = 'Search for an address or place...',
  disabled = false,
  hasError = false,
  errorMessage,
  proximity,
  className,
}: AddressSearchInputProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleSelect = useCallback((suggestion: SearchSuggestion) => {
    onSelect(suggestion)
  }, [onSelect])

  const {
    query,
    suggestions,
    isLoading,
    error,
    isOpen,
    highlightedIndex,
    setQuery,
    selectSuggestion,
    handleKeyDown,
    closeDropdown,
    openDropdown,
    inputRef,
  } = useAddressSearch({
    proximity,
    onSelect: handleSelect,
  })

  useEffect(() => {
    setQuery(value)
  }, [value, setQuery])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setQuery(newValue)
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    selectSuggestion(suggestion)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [closeDropdown])

  const getPlaceTypeIcon = (placeType: string[]) => {
    const type = placeType[0] || ''
    
    if (type.includes('poi') || type.includes('point_of_interest')) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    }
    
    if (type.includes('place') || type.includes('locality') || type.includes('neighborhood')) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
    
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  }

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500 pointer-events-none">
          {isLoading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={openDropdown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={clsx(
            'w-full pl-10 pr-4 py-2.5 rounded-lg text-sm',
            'bg-surface-50 dark:bg-surface-900/50',
            'text-surface-900 dark:text-surface-100',
            'placeholder:text-surface-400 dark:placeholder:text-surface-500',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
            'transition-colors duration-200',
            disabled && 'opacity-50 cursor-not-allowed',
            hasError
              ? 'border-2 border-danger-400 dark:border-danger-500 focus:border-danger-500'
              : 'border border-surface-200 dark:border-surface-600 focus:border-primary-500 dark:focus:border-primary-400 hover:border-surface-300 dark:hover:border-surface-500'
          )}
        />
      </div>

      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={clsx(
              'absolute z-50 w-full mt-1 py-1',
              'bg-white dark:bg-surface-800',
              'border border-surface-200 dark:border-surface-700',
              'rounded-lg shadow-lg',
              'max-h-64 overflow-y-auto'
            )}
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className={clsx(
                  'w-full px-3 py-2.5 text-left flex items-start gap-3',
                  'transition-colors duration-100',
                  index === highlightedIndex
                    ? 'bg-primary-50 dark:bg-primary-900/30'
                    : 'hover:bg-surface-50 dark:hover:bg-surface-700/50'
                )}
              >
                <span className={clsx(
                  'mt-0.5 flex-shrink-0',
                  index === highlightedIndex
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-surface-400 dark:text-surface-500'
                )}>
                  {getPlaceTypeIcon(suggestion.placeType)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={clsx(
                    'text-sm font-medium truncate',
                    index === highlightedIndex
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-surface-900 dark:text-surface-100'
                  )}>
                    {suggestion.displayName}
                  </p>
                  {suggestion.fullAddress && suggestion.fullAddress !== suggestion.displayName && (
                    <p className="text-xs text-surface-500 dark:text-surface-400 truncate mt-0.5">
                      {suggestion.fullAddress}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && query.length >= 2 && !isLoading && suggestions.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={clsx(
              'absolute z-50 w-full mt-1 p-4',
              'bg-white dark:bg-surface-800',
              'border border-surface-200 dark:border-surface-700',
              'rounded-lg shadow-lg text-center'
            )}
          >
            <svg className="w-8 h-8 mx-auto text-surface-300 dark:text-surface-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              No places found for &quot;{query}&quot;
            </p>
            <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
              Try a different search term
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={clsx(
              'absolute z-50 w-full mt-1 p-3',
              'bg-danger-50 dark:bg-danger-900/20',
              'border border-danger-200 dark:border-danger-800',
              'rounded-lg'
            )}
          >
            <p className="text-sm text-danger-700 dark:text-danger-300 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {hasError && errorMessage && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-xs text-danger-600 dark:text-danger-400 mt-1"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {errorMessage}
        </motion.p>
      )}
    </div>
  )
}
