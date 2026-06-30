'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RideRequest, RideRequestStatus } from '@/types/rideRequest'
import { requestRepository, subscribeRideRequests } from '@/services/requestRepository'

export interface UseRideRequestsResult {
  requests: RideRequest[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateStatus: (id: string, status: RideRequestStatus, extras?: Partial<RideRequest>) => Promise<void>
}

export function useRideRequests(): UseRideRequestsResult {
  const [requests, setRequests] = useState<RideRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const list = await requestRepository.list()
      setRequests(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load requests')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const unsub = subscribeRideRequests(() => {
      refresh().catch(() => {})
    })
    return unsub
  }, [refresh])

  const updateStatus = useCallback(
    async (id: string, status: RideRequestStatus, extras?: Partial<RideRequest>) => {
      await requestRepository.updateStatus(id, status, extras)
    },
    []
  )

  return useMemo(
    () => ({ requests, isLoading, error, refresh, updateStatus }),
    [requests, isLoading, error, refresh, updateStatus]
  )
}

