'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { TripSummary } from '@/types/trip'

interface RecentTripsProps {
  trips: TripSummary[]
  maxItems?: number
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  
  if (diffHours < 24) {
    return date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
  } else if (diffHours < 48) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  }
}

export function RecentTrips({ trips, maxItems = 10 }: RecentTripsProps) {
  const displayTrips = trips.slice(0, maxItems)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">
        Recent Trips
      </h3>
      
      {displayTrips.length === 0 ? (
        <div className="py-8 text-center text-surface-400 dark:text-surface-500 text-sm">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          No trips completed yet
        </div>
      ) : (
        <div className="space-y-2">
          {displayTrips.map((trip, index) => (
            <motion.div
              key={trip.tripId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={clsx(
                'flex items-center justify-between py-3 px-4 rounded-lg',
                'bg-surface-50 dark:bg-surface-800/50',
                'border border-surface-100 dark:border-surface-700/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  trip.status === 'completed'
                    ? 'bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400'
                    : 'bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400'
                )}>
                  {trip.status === 'completed' ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-900 dark:text-white">
                    {trip.completedCount}/{trip.stopsCount} stops
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    {formatDate(trip.date)} • {trip.totalDistanceKm.toFixed(1)} km
                  </p>
                </div>
              </div>
              <div className="text-right">
                {trip.distanceSavedKm > 0 && (
                  <p className="text-xs font-medium text-success-600 dark:text-success-400">
                    -{trip.distanceSavedKm.toFixed(1)} km
                  </p>
                )}
                <span className={clsx(
                  'inline-flex px-2 py-0.5 text-xs font-medium rounded-full',
                  trip.routeMode === 'optimized'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400'
                )}>
                  {trip.routeMode === 'optimized' ? 'Optimized' : 'FIFO'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
