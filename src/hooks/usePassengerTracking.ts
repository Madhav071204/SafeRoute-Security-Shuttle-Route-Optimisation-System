'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RideRequest } from '@/types/rideRequest'
import { DispatchTrip } from '@/types/dispatch'
import { requestRepository, subscribeRideRequests } from '@/services/requestRepository'
import { dispatchTripRepository, subscribeDispatchTrip } from '@/services/tripRepository'

export interface UsePassengerTrackingResult {
  request: RideRequest | null
  activeTrip: DispatchTrip | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function usePassengerTracking(requestId: string): UsePassengerTrackingResult {
  const [request, setRequest] = useState<RideRequest | null>(null)
  const [activeTrip, setActiveTrip] = useState<DispatchTrip | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [req, trip] = await Promise.all([
        requestRepository.get(requestId),
        dispatchTripRepository.getActiveTrip(),
      ])
      setRequest(req)
      // Only attach active trip if it matches this request assignment
      if (req?.assignedTripId && trip?.id === req.assignedTripId) {
        setActiveTrip(trip)
      } else {
        setActiveTrip(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tracking info')
    } finally {
      setIsLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const unsubReq = subscribeRideRequests(() => {
      refresh().catch(() => {})
    })
    const unsubTrip = subscribeDispatchTrip(() => {
      refresh().catch(() => {})
    })
    return () => {
      unsubReq()
      unsubTrip()
    }
  }, [refresh])

  return useMemo(
    () => ({ request, activeTrip, isLoading, error, refresh }),
    [request, activeTrip, isLoading, error, refresh]
  )
}

