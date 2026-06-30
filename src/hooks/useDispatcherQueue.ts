'use client'

import { useCallback, useMemo } from 'react'
import { RideRequest, RideRequestStatus } from '@/types/rideRequest'
import { requestRepository } from '@/services/requestRepository'
import { DispatchTrip } from '@/types/dispatch'
import { dispatchTripRepository } from '@/services/tripRepository'
import { useRideRequests } from '@/hooks/useRideRequests'
import { useActiveTrip } from '@/hooks/useActiveTrip'

export interface UseDispatcherQueueResult {
  pendingRequests: RideRequest[]
  unassignedRequests: RideRequest[]
  activeTrip: DispatchTrip | null
  isLoading: boolean
  error: string | null
  approve: (id: string) => Promise<void>
  reject: (id: string) => Promise<void>
  assignToActiveTrip: (requestIds: string[]) => Promise<void>
  clearActiveTrip: () => Promise<void>
}

export function useDispatcherQueue(): UseDispatcherQueueResult {
  const { requests, isLoading, error } = useRideRequests()
  const { activeTrip, clear: clearActiveTrip } = useActiveTrip()

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === 'pending'),
    [requests]
  )

  const unassignedRequests = useMemo(
    () => requests.filter((r) => r.status === 'pending' && !r.assignedTripId),
    [requests]
  )

  const approve = useCallback(async (id: string) => {
    // Model doesn't include "approved" state; approval is effectively "ready for assignment".
    // Keep as pending but ensure it's not cancelled/no_show/etc.
    await requestRepository.safeUpdateStatus(id, 'pending')
  }, [])

  const reject = useCallback(async (id: string) => {
    await requestRepository.safeUpdateStatus(id, 'cancelled')
  }, [])

  const assignToActiveTrip = useCallback(async (requestIds: string[]) => {
    const trip = await dispatchTripRepository.getActiveTrip()
    if (!trip) return
    const at = new Date().toISOString()
    await Promise.all(
      requestIds.map((id) =>
        requestRepository.safeUpdateStatus(id, 'assigned' as RideRequestStatus, {
          assignedTripId: trip.id,
          assignedAt: at,
        })
      )
    )
  }, [])

  return {
    pendingRequests,
    unassignedRequests,
    activeTrip,
    isLoading,
    error,
    approve,
    reject,
    assignToActiveTrip,
    clearActiveTrip,
  }
}

