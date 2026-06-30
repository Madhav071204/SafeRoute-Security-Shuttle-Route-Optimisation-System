'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { usePassengerTracking } from '@/hooks/usePassengerTracking'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { TrackingMapView } from '@/components/map/TrackingMapView'
import { Button } from '@/components/ui/Button'

export default function TrackRequestPage({ params }: { params: { requestId: string } }) {
  const requestId = params.requestId
  const { request, activeTrip, isLoading, error } = usePassengerTracking(requestId)

  const message = useMemo(() => {
    const status = request?.status
    switch (status) {
      case 'pending':
        return 'Request received'
      case 'assigned':
        return 'Your shuttle has been assigned'
      case 'driver_on_way':
        return 'Driver is on the way'
      case 'arrived':
        return 'Driver has arrived'
      case 'picked_up':
        return 'You have been picked up'
      case 'completed':
        return 'Trip completed'
      case 'cancelled':
        return 'Request cancelled'
      case 'no_show':
        return 'Marked as no-show'
      default:
        return 'Request received'
    }
  }, [request?.status])

  const etaSummary = useMemo(() => {
    if (!activeTrip) return null
    const selected = activeTrip.selectedRouteType === 'fifo' ? activeTrip.routes.fifo : activeTrip.routes.optimized
    const minutes = selected?.metrics.totalDurationMinutes
    if (!minutes || minutes <= 0) return null
    return `${Math.round(minutes)} min (route estimate)`
  }, [activeTrip])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Track your request</CardTitle>
              <CardDescription>
                Request ID: <span className="font-mono">{requestId}</span>
              </CardDescription>
            </div>
            <Link href="/request">
              <Button variant="ghost" size="sm">
                New request
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-surface-500 dark:text-surface-400 text-sm">Loading…</div>
          ) : !request ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 text-warning-700 dark:text-warning-300 text-sm">
                This request ID wasn’t found on this device.
              </div>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Tracking uses local persistence in this MVP. In Phase 2/Realtime, this will work across devices/accounts.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white/70 dark:bg-surface-900/30 p-4">
                  <p className="text-xs uppercase tracking-wider text-surface-500 dark:text-surface-400 font-semibold">
                    Status
                  </p>
                  <p className="mt-1 text-lg font-bold text-surface-900 dark:text-white">{message}</p>
                  {etaSummary && (
                    <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">
                      ETA: <span className="font-semibold">{etaSummary}</span>
                    </p>
                  )}
                  {!activeTrip && request.status !== 'pending' && (
                    <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
                      Shuttle assigned trip data not available yet.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white/70 dark:bg-surface-900/30 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wider text-surface-500 dark:text-surface-400 font-semibold">
                    Trip details
                  </p>
                  <div className="text-sm text-surface-700 dark:text-surface-200">
                    <p className="font-semibold">Pickup</p>
                    <p className="text-surface-600 dark:text-surface-300">{request.pickup.address}</p>
                  </div>
                  <div className="text-sm text-surface-700 dark:text-surface-200">
                    <p className="font-semibold">Destination</p>
                    <p className="text-surface-600 dark:text-surface-300">{request.destination.address}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white/70 dark:bg-surface-900/30 p-4">
                  <p className="text-xs uppercase tracking-wider text-surface-500 dark:text-surface-400 font-semibold">
                    Shuttle location
                  </p>
                  {activeTrip?.driverLocation ? (
                    <p className="mt-1 text-sm text-surface-700 dark:text-surface-200">
                      Live location available (updated{' '}
                      {new Date(activeTrip.driverLocation.timestamp).toLocaleTimeString('en-AU')}
                      )
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-surface-600 dark:text-surface-300">
                      Live location not available yet. Showing route/ETA fallback.
                    </p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-3">
                <TrackingMapView
                  pickup={{ lat: request.pickup.lat, lng: request.pickup.lng }}
                  destination={{ lat: request.destination.lat, lng: request.destination.lng }}
                  driverLocation={activeTrip?.driverLocation || null}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

