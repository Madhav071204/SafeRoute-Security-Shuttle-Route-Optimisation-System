'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useDispatcherQueue } from '@/hooks/useDispatcherQueue'
import { useTrip } from '@/context/TripContext'
import { TripPanel } from '@/components/trip/TripPanel'
import { RouteComparison } from '@/components/results/RouteComparison'
import { DispatchTrip } from '@/types/dispatch'
import { dispatchTripRepository } from '@/services/tripRepository'
import { requestRepository } from '@/services/requestRepository'
import { RequestQueueCard } from '@/components/dispatcher/RequestQueueCard'
import { ActiveTripSummaryCard } from '@/components/dispatcher/ActiveTripSummaryCard'
import { TripActivationCard } from '@/components/dispatcher/TripActivationCard'
import { RoutePreviewPanel } from '@/components/dispatcher/RoutePreviewPanel'

export default function DispatcherPage() {
  const { pendingRequests, unassignedRequests, activeTrip, isLoading, error, reject, clearActiveTrip } =
    useDispatcherQueue()
  const { trip, routes, selectedRouteType, loadDemoData, clearTrip } = useTrip()

  const [savingActive, setSavingActive] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const hasRoutes = !!routes.fifo && !!routes.optimized

  const tripStopIds = useMemo(() => new Set(trip.stops.map((s) => s.id)), [trip.stops])

  const handleAddToPlanner = (requestId: string) => {
    const req = unassignedRequests.find((r) => r.id === requestId) || pendingRequests.find((r) => r.id === requestId)
    if (!req) return
    if (tripStopIds.has(req.id)) return

    loadDemoData([
      ...trip.stops,
      {
        id: req.id, // IMPORTANT: stopId === rideRequestId (enables status syncing)
        passengerName: req.passengerName,
        address: req.pickup.address,
        coordinates: { lat: req.pickup.lat, lng: req.pickup.lng },
        geocodeStatus: 'success',
      },
    ])
  }

  const handleActivateTrip = async () => {
    setSaveError(null)
    if (!hasRoutes || trip.stops.length === 0) return

    setSavingActive(true)
    try {
      const at = new Date().toISOString()
      const dispatchTrip: DispatchTrip = {
        id: trip.id,
        createdAt: at,
        status: 'active',
        trip,
        routes,
        selectedRouteType,
        driverLocation: null,
        stops: trip.stops.map((s) => ({
          stopId: s.id,
          status: 'assigned',
        })),
      }

      await dispatchTripRepository.setActiveTrip(dispatchTrip)

      await Promise.all(
        trip.stops.map((s) =>
          requestRepository.safeUpdateStatus(s.id, 'assigned', {
            assignedTripId: trip.id,
            assignedAt: at,
          })
        )
      )
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to activate trip')
    } finally {
      setSavingActive(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <div className="bg-mesh-light dark:bg-mesh-dark">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 pt-8 pb-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium mb-3">
                Dispatcher
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-white mb-2">
                Dispatch Console
              </h1>
              <p className="text-surface-600 dark:text-surface-400 text-lg max-w-2xl">
                Review ride requests, build an optimized trip, and assign it to a driver.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/driver">
                <Button variant="ghost" size="sm">Driver view</Button>
              </Link>
              <Link href="/request">
                <Button variant="ghost" size="sm">Passenger request</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-6">
        {(error || saveError) && (
          <div className="mb-6 p-4 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 text-sm">
            {error || saveError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[360px_420px_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-6 lg:row-span-2 xl:row-span-1">
            <RequestQueueCard
              pendingRequests={pendingRequests}
              unassignedRequests={unassignedRequests}
              isLoading={isLoading}
              tripStopIds={tripStopIds}
              onAddToPlanner={handleAddToPlanner}
              onReject={reject}
            />
            <ActiveTripSummaryCard activeTrip={activeTrip} onClear={clearActiveTrip} />
          </aside>

          <section className="min-w-0 space-y-6 xl:col-start-2 xl:row-start-1">
            <TripActivationCard
              stopCount={trip.stops.length}
              hasRoutes={hasRoutes}
              savingActive={savingActive}
              onActivate={handleActivateTrip}
              onClearPlanner={clearTrip}
            />
            <TripPanel />
          </section>

          <section className="min-w-0 space-y-6 lg:col-start-2 xl:col-start-3 xl:row-start-1">
            <RoutePreviewPanel />
            <RouteComparison />
          </section>
        </div>
      </div>
    </div>
  )
}

