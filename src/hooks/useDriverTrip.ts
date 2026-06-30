'use client'

import { useMemo } from 'react'
import { DispatchTrip } from '@/types/dispatch'
import { useActiveTrip } from '@/hooks/useActiveTrip'

export interface UseDriverTripResult {
  trip: DispatchTrip | null
  isLoading: boolean
  error: string | null
  hasTrip: boolean
}

export function useDriverTrip(): UseDriverTripResult {
  const { activeTrip, isLoading, error } = useActiveTrip()

  return useMemo(
    () => ({
      trip: activeTrip,
      isLoading,
      error,
      hasTrip: !!activeTrip && activeTrip.status !== 'cancelled',
    }),
    [activeTrip, isLoading, error]
  )
}

