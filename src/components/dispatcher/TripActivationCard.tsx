'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface TripActivationCardProps {
  stopCount: number
  hasRoutes: boolean
  savingActive: boolean
  onActivate: () => void
  onClearPlanner: () => void
}

export function TripActivationCard({
  stopCount,
  hasRoutes,
  savingActive,
  onActivate,
  onClearPlanner,
}: TripActivationCardProps) {
  const ready = hasRoutes && stopCount > 0

  return (
    <Card variant="glass" className="min-w-0">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Trip builder</CardTitle>
            <CardDescription>Build the trip in the planner, optimize, then activate for the driver.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-surface-200 dark:border-surface-700 bg-white/70 dark:bg-surface-900/40 px-2.5 py-1 text-xs font-semibold text-surface-700 dark:text-surface-200">
              {stopCount} stop{stopCount === 1 ? '' : 's'}
            </span>
            <span
              className={
                ready
                  ? 'rounded-full bg-success-100 dark:bg-success-900/30 border border-success-200 dark:border-success-800 px-2.5 py-1 text-xs font-semibold text-success-700 dark:text-success-300'
                  : 'rounded-full bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 px-2.5 py-1 text-xs font-semibold text-surface-600 dark:text-surface-300'
              }
            >
              {hasRoutes ? 'Routes ready' : 'Not optimized'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!hasRoutes && stopCount > 0 && (
          <div className="rounded-xl border border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-900/20 px-4 py-3 text-sm text-warning-800 dark:text-warning-200">
            Optimize the route in the Trip Planner to generate FIFO vs optimized routes.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            variant="success"
            size="sm"
            onClick={onActivate}
            disabled={!ready || savingActive}
            isLoading={savingActive}
            fullWidth
          >
            Activate trip
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearPlanner} disabled={stopCount === 0} fullWidth>
            Clear planner
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

