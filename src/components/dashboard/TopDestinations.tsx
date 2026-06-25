'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'
import { DestinationStats } from '@/types/trip'

interface TopDestinationsProps {
  destinations: DestinationStats[]
  maxItems?: number
}

export function TopDestinations({ destinations, maxItems = 5 }: TopDestinationsProps) {
  const displayDestinations = destinations.slice(0, maxItems)
  const maxCount = Math.max(...displayDestinations.map(d => d.visitCount), 1)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">
        Most Visited Destinations
      </h3>
      
      {displayDestinations.length === 0 ? (
        <div className="py-8 text-center text-surface-400 dark:text-surface-500 text-sm">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Complete trips to see popular destinations
        </div>
      ) : (
        <div className="space-y-3">
          {displayDestinations.map((destination, index) => (
            <motion.div
              key={destination.address}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={clsx(
                    'w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold',
                    index === 0 && 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300',
                    index === 1 && 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300',
                    index === 2 && 'bg-warning-100 dark:bg-warning-900/40 text-warning-700 dark:text-warning-400',
                    index > 2 && 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400'
                  )}>
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-200 truncate">
                    {destination.displayName}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-semibold text-surface-900 dark:text-white">
                    {destination.visitCount}
                  </span>
                  <span className="text-xs text-surface-400 dark:text-surface-500">
                    ({destination.percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(destination.visitCount / maxCount) * 100}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className={clsx(
                    'h-full rounded-full',
                    index === 0 && 'bg-primary-500',
                    index === 1 && 'bg-surface-400 dark:bg-surface-500',
                    index === 2 && 'bg-warning-500',
                    index > 2 && 'bg-surface-300 dark:bg-surface-600'
                  )}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
