'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useDriverTrip } from '@/hooks/useDriverTrip'
import { useTrip } from '@/context/TripContext'
import { ExecutionView } from '@/components/execution/ExecutionView'
import { dispatchTripRepository } from '@/services/tripRepository'
import { requestRepository } from '@/services/requestRepository'
import { getCurrentLocation } from '@/lib/origin'
import { DriverStopAction } from '@/components/execution/DriverModeView'

export default function DriverPage() {
  const { trip: activeDispatchTrip, isLoading, error, hasTrip } = useDriverTrip()
  const {
    trip,
    routes,
    selectedRouteType,
    executionState,
    loadTrip,
    startExecution,
  } = useTrip()

  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const activeStopIds = useMemo(() => activeDispatchTrip?.trip.stops.map((s) => s.id) || [], [activeDispatchTrip])

  // Load the active dispatch trip into the existing TripContext (so navigation + UI reuse works)
  useEffect(() => {
    if (!activeDispatchTrip) return
    if (trip.id === activeDispatchTrip.trip.id && routes.optimized && routes.fifo) return
    loadTrip(activeDispatchTrip.trip, activeDispatchTrip.routes, activeDispatchTrip.selectedRouteType)
  }, [activeDispatchTrip, loadTrip])

  // Persist driver location for passenger tracking
  const lastLocSavedAtRef = useRef(0)
  useEffect(() => {
    if (!activeDispatchTrip) return
    if (!executionState.driverLocation) return
    const now = Date.now()
    if (now - lastLocSavedAtRef.current < 2000) return
    lastLocSavedAtRef.current = now
    dispatchTripRepository.updateDriverLocation(executionState.driverLocation).catch(() => {})
  }, [executionState.driverLocation, activeDispatchTrip])

  // When trip completes, mark request statuses + dispatch trip completed
  const completionHandledRef = useRef<string | null>(null)
  useEffect(() => {
    if (!activeDispatchTrip) return
    if (trip.status !== 'completed') return
    if (completionHandledRef.current === activeDispatchTrip.id) return
    completionHandledRef.current = activeDispatchTrip.id

    const completedAt = new Date().toISOString()

    Promise.all([
      dispatchTripRepository.markTripCompleted(completedAt),
      ...activeStopIds.map((id) =>
        requestRepository.safeUpdateStatus(id, 'completed', { completedAt })
      ),
      ...activeStopIds.map((id) => dispatchTripRepository.updateStopStatus(id, 'completed')),
    ]).catch(() => {})
  }, [trip.status, activeDispatchTrip, activeStopIds])

  const handleStartTrip = async () => {
    if (!activeDispatchTrip) return
    setStartError(null)
    setStarting(true)
    try {
      const liveOrigin = await getCurrentLocation()
      startExecution(liveOrigin || undefined)

      const at = new Date().toISOString()
      await dispatchTripRepository.markTripStarted(at)
      await Promise.all([
        ...activeStopIds.map((id) => requestRepository.safeUpdateStatus(id, 'driver_on_way')),
        ...activeStopIds.map((id) => dispatchTripRepository.updateStopStatus(id, 'driver_on_way')),
      ])
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Failed to start trip')
    } finally {
      setStarting(false)
    }
  }

  const handleStopAction = async (stopId: string, action: DriverStopAction) => {
    if (!activeDispatchTrip) return

    if (action === 'arrived') {
      await Promise.all([
        requestRepository.safeUpdateStatus(stopId, 'arrived'),
        dispatchTripRepository.updateStopStatus(stopId, 'arrived'),
      ])
      return
    }

    if (action === 'picked_up') {
      await Promise.all([
        requestRepository.safeUpdateStatus(stopId, 'picked_up'),
        dispatchTripRepository.updateStopStatus(stopId, 'picked_up'),
      ])
      return
    }

    if (action === 'no_show') {
      await Promise.all([
        requestRepository.safeUpdateStatus(stopId, 'no_show'),
        dispatchTripRepository.updateStopStatus(stopId, 'no_show'),
      ])
    }
  }

  if (trip.status === 'executing' || trip.status === 'completed') {
    return <ExecutionView driverModeProps={{ onStopAction: handleStopAction }} />
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Driver</CardTitle>
              <CardDescription>
                Load your assigned dispatch trip and start navigation.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dispatcher">
                <Button variant="ghost" size="sm">Dispatcher</Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(error || startError) && (
            <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 text-sm">
              {error || startError}
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-surface-500 dark:text-surface-400">Loading…</p>
          ) : !hasTrip || !activeDispatchTrip ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 text-warning-700 dark:text-warning-300 text-sm">
                No active dispatch trip assigned yet.
              </div>
              <Link href="/dispatcher">
                <Button variant="primary">Open dispatcher</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white/70 dark:bg-surface-900/30 p-4">
                <p className="text-xs uppercase tracking-wider text-surface-500 dark:text-surface-400 font-semibold">
                  Assigned trip
                </p>
                <p className="mt-1 font-mono text-sm text-surface-900 dark:text-white">
                  {activeDispatchTrip.id}
                </p>
                <p className="mt-2 text-sm text-surface-700 dark:text-surface-200">
                  Stops: <span className="font-semibold">{activeDispatchTrip.trip.stops.length}</span> · Mode:{' '}
                  <span className="font-semibold">{selectedRouteType}</span>
                </p>
              </div>

              <Button
                variant="success"
                size="lg"
                fullWidth
                onClick={handleStartTrip}
                disabled={starting || !activeDispatchTrip.routes.optimized}
                isLoading={starting}
              >
                Start trip
              </Button>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Starting will use live location if available; otherwise the Monash fallback origin will be used.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

