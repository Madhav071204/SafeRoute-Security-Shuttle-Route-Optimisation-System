'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { WeeklyStats, DestinationStats } from '@/types/trip'

interface WeeklySummaryProps {
  stats: WeeklyStats | null
  topDestinations: DestinationStats[]
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDayName(dateStr: string): string {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return DAY_NAMES[date.getDay()]
}

export function WeeklySummary({ stats, topDestinations }: WeeklySummaryProps) {
  if (!stats) {
    return (
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
          Weekly Summary
        </h3>
        <div className="text-center py-8 text-surface-400 dark:text-surface-500">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">Complete trips this week to see your summary</p>
        </div>
      </div>
    )
  }

  const top3Destinations = topDestinations.slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
          Weekly Summary
        </h3>
        <span className="text-xs text-surface-500 dark:text-surface-400">
          {stats.weekStart} — {stats.weekEnd}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 border border-primary-200/50 dark:border-primary-800/50">
          <p className="text-xs text-primary-600 dark:text-primary-400 font-medium uppercase tracking-wide">
            Busiest Day
          </p>
          <p className="text-2xl font-bold text-primary-700 dark:text-primary-300 mt-1">
            {formatDayName(stats.busiestDay)}
          </p>
          <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">
            {stats.busiestDayTrips} trip{stats.busiestDayTrips !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-success-50 dark:bg-success-900/20 rounded-lg p-4 border border-success-200/50 dark:border-success-800/50">
          <p className="text-xs text-success-600 dark:text-success-400 font-medium uppercase tracking-wide">
            Efficiency Gains
          </p>
          <p className="text-2xl font-bold text-success-700 dark:text-success-300 mt-1">
            {stats.distanceSavedKm.toFixed(1)} km
          </p>
          <p className="text-xs text-success-500 dark:text-success-400 mt-0.5">
            {stats.timeSavedMinutes.toFixed(0)} min saved
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-surface-900 dark:text-white">
            {stats.totalTrips}
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Total Trips
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-surface-900 dark:text-white">
            {stats.totalDistanceKm.toFixed(1)}
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            km Driven
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-surface-900 dark:text-white">
            {stats.averageTripDuration.toFixed(0)}
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Avg Duration (min)
          </p>
        </div>
      </div>

      {top3Destinations.length > 0 && (
        <div>
          <p className="text-xs text-surface-500 dark:text-surface-400 font-medium uppercase tracking-wide mb-3">
            Top 3 Destinations
          </p>
          <div className="space-y-2">
            {top3Destinations.map((dest, index) => (
              <div key={dest.address} className="flex items-center gap-2">
                <span className={clsx(
                  'w-5 h-5 rounded flex items-center justify-center text-xs font-bold',
                  index === 0 && 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300',
                  index === 1 && 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300',
                  index === 2 && 'bg-warning-100 dark:bg-warning-900/40 text-warning-700 dark:text-warning-400'
                )}>
                  {index + 1}
                </span>
                <span className="text-sm text-surface-700 dark:text-surface-200 truncate flex-1">
                  {dest.displayName}
                </span>
                <span className="text-sm font-medium text-surface-900 dark:text-white">
                  {dest.visitCount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
