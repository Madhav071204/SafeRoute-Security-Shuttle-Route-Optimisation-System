'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { DispatchTrip } from '@/types/dispatch'

interface ActiveTripSummaryCardProps {
  activeTrip: DispatchTrip | null
  onClear: () => void
}

export function ActiveTripSummaryCard({ activeTrip, onClear }: ActiveTripSummaryCardProps) {
  return (
    <Card variant="glass" className="min-w-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Active trip</CardTitle>
            <CardDescription>{activeTrip ? `Trip: ${activeTrip.id}` : 'No active trip'}</CardDescription>
          </div>
          {activeTrip && (
            <span className="mt-0.5 flex-shrink-0 rounded-full bg-success-100 dark:bg-success-900/30 border border-success-200 dark:border-success-800 px-2.5 py-1 text-xs font-semibold text-success-700 dark:text-success-300">
              Active
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {activeTrip ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 dark:bg-surface-900/30 p-3">
                <p className="text-xs text-surface-500 dark:text-surface-400">Stops</p>
                <p className="text-lg font-bold text-surface-900 dark:text-white">{activeTrip.trip.stops.length}</p>
              </div>
              <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 dark:bg-surface-900/30 p-3">
                <p className="text-xs text-surface-500 dark:text-surface-400">Status</p>
                <p className="text-lg font-bold text-surface-900 dark:text-white capitalize">{activeTrip.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link href="/driver" className="min-w-0">
                <Button variant="outline" size="sm" fullWidth>
                  Open driver
                </Button>
              </Link>
              <Button variant="danger" size="sm" onClick={onClear} fullWidth>
                Clear
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-surface-200 dark:border-surface-700 bg-white/40 dark:bg-surface-900/20 p-5 text-sm text-surface-500 dark:text-surface-400">
            Build a trip, optimize it, then activate it so the driver can start navigation.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

