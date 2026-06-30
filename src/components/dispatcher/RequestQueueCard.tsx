'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { RideRequest } from '@/types/rideRequest'

interface RequestQueueCardProps {
  pendingRequests: RideRequest[]
  unassignedRequests: RideRequest[]
  isLoading: boolean
  tripStopIds: Set<string>
  onAddToPlanner: (requestId: string) => void
  onReject: (requestId: string) => void
}

export function RequestQueueCard({
  pendingRequests,
  unassignedRequests,
  isLoading,
  tripStopIds,
  onAddToPlanner,
  onReject,
}: RequestQueueCardProps) {
  const countLabel = isLoading ? 'Loading…' : `${pendingRequests.length} pending`
  const queue = unassignedRequests.length > 0 ? unassignedRequests : pendingRequests

  return (
    <Card variant="glass" className="min-w-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Requests queue</CardTitle>
            <CardDescription>{countLabel}</CardDescription>
          </div>
          {!isLoading && pendingRequests.length > 0 && (
            <span className="mt-0.5 flex-shrink-0 rounded-full border border-surface-200 dark:border-surface-700 bg-white/70 dark:bg-surface-900/40 px-2.5 py-1 text-xs font-semibold text-surface-700 dark:text-surface-200">
              {pendingRequests.length}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {pendingRequests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-200 dark:border-surface-700 bg-white/40 dark:bg-surface-900/20 p-5 text-sm text-surface-500 dark:text-surface-400">
            No pending requests yet. New passenger requests will appear here.
          </div>
        ) : (
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
            {queue.map((r) => {
              const isAdded = tripStopIds.has(r.id)
              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white/70 dark:bg-surface-900/30 p-4"
                >
                  <div className="grid grid-cols-1 gap-3">
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">
                            {r.passengerName}
                          </p>
                          <p className="text-xs text-surface-500 dark:text-surface-400 truncate mt-1">
                            Pickup: {r.pickup.label}
                          </p>
                          <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                            To: {r.destination.label}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <Link
                            href={`/track/${r.id}`}
                            className="text-xs text-primary-600 dark:text-primary-400 underline hover:no-underline"
                          >
                            Track
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={isAdded ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => onAddToPlanner(r.id)}
                        disabled={isAdded}
                        fullWidth
                      >
                        {isAdded ? 'Added' : 'Add to trip'}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => onReject(r.id)} fullWidth>
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

