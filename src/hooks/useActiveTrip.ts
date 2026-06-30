'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DispatchTrip } from '@/types/dispatch'
import { dispatchTripRepository, subscribeDispatchTrip } from '@/services/tripRepository'

export interface UseActiveTripResult {
  activeTrip: DispatchTrip | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  clear: () => Promise<void>
}

export function useActiveTrip(): UseActiveTripResult {
  const [activeTrip, setActiveTrip] = useState<DispatchTrip | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const trip = await dispatchTripRepository.getActiveTrip()
      setActiveTrip(trip)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load active trip')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const unsub = subscribeDispatchTrip(() => {
      refresh().catch(() => {})
    })
    return unsub
  }, [refresh])

  const clear = useCallback(async () => {
    await dispatchTripRepository.clearActiveTrip()
  }, [])

  return useMemo(
    () => ({ activeTrip, isLoading, error, refresh, clear }),
    [activeTrip, isLoading, error, refresh, clear]
  )
}

