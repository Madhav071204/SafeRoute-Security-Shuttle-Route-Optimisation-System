'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Stop } from '@/types'
import clsx from 'clsx'

interface UpcomingStopsDrawerProps {
  stops: Stop[]
  orderedStopIds: string[]
  completedStopIds: string[]
  currentStopIndex: number
}

export function UpcomingStopsDrawer({
  stops,
  orderedStopIds,
  completedStopIds,
  currentStopIndex,
}: UpcomingStopsDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const upcomingCount = orderedStopIds.length - currentStopIndex - 1
  const completedCount = completedStopIds.length

  const getStopStatus = (stopId: string, index: number) => {
    if (completedStopIds.includes(stopId)) return 'completed'
    if (index === currentStopIndex) return 'current'
    return 'upcoming'
  }

  return (
    <div className="bg-surface-50 dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700">
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 sm:px-5 py-2.5 flex items-center justify-between hover:bg-surface-100 dark:hover:bg-surface-700/50 transition-colors"
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-7 h-7 rounded-lg bg-surface-200 dark:bg-surface-700 flex items-center justify-center"
          >
            <svg
              className="w-3.5 h-3.5 text-surface-600 dark:text-surface-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </motion.div>
          <div className="text-left">
            <span className="text-sm font-semibold text-surface-900 dark:text-white block">
              {upcomingCount > 0 
                ? `${upcomingCount} stop${upcomingCount !== 1 ? 's' : ''} remaining`
                : 'Route complete'}
            </span>
            <span className="text-xs text-surface-500 dark:text-surface-400">
              Tap to {isExpanded ? 'hide' : 'view'} all stops
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {[...Array(Math.min(3, orderedStopIds.length))].map((_, i) => (
              <div
                key={i}
                className={clsx(
                  'w-6 h-6 rounded-full border-2 border-surface-50 dark:border-surface-800 flex items-center justify-center text-2xs font-bold',
                  i < completedCount
                    ? 'bg-success-500 text-white'
                    : i === completedCount
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-300 dark:bg-surface-600 text-surface-600 dark:text-surface-400'
                )}
              >
                {i < completedCount ? '✓' : i + 1}
              </div>
            ))}
            {orderedStopIds.length > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-surface-50 dark:border-surface-800 bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-2xs font-bold text-surface-600 dark:text-surface-400">
                +{orderedStopIds.length - 3}
              </div>
            )}
          </div>
        </div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="max-h-48 sm:max-h-56 overflow-y-auto overscroll-contain scrollbar-thin border-t border-surface-200 dark:border-surface-700">
              <div className="px-3 sm:px-4 py-2.5 space-y-1">
                {orderedStopIds.map((stopId, index) => {
                  const stop = stops.find((s) => s.id === stopId)
                  if (!stop) return null

                  const status = getStopStatus(stopId, index)
                  const displayNumber = index + 1

                  return (
                    <motion.div
                      key={stopId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={clsx(
                        'flex items-center gap-2.5 py-2 px-2.5 rounded-lg transition-all',
                        status === 'current' && 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800',
                        status === 'completed' && 'opacity-60'
                      )}
                    >
                      <div className="flex-shrink-0 relative">
                        {status === 'completed' ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-7 h-7 rounded-lg bg-success-500 flex items-center justify-center shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                        ) : status === 'current' ? (
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm">
                            <span className="text-white text-xs font-bold">{displayNumber}</span>
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
                            <span className="text-surface-600 dark:text-surface-400 text-xs font-semibold">{displayNumber}</span>
                          </div>
                        )}
                        
                        {index < orderedStopIds.length - 1 && (
                          <div className={clsx(
                            'absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-3',
                            status === 'completed' 
                              ? 'bg-success-300 dark:bg-success-700'
                              : 'bg-surface-200 dark:bg-surface-700'
                          )} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={clsx(
                          'text-sm font-medium truncate',
                          status === 'completed' 
                            ? 'text-surface-500 dark:text-surface-500 line-through' 
                            : 'text-surface-900 dark:text-white'
                        )}>
                          {stop.passengerName || `Passenger ${displayNumber}`}
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{stop.address}</p>
                      </div>

                      {status === 'current' && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-800/50 rounded-md"
                        >
                          Now
                        </motion.span>
                      )}
                      {status === 'completed' && (
                        <span className="flex-shrink-0 text-xs font-medium text-success-600 dark:text-success-400">
                          Done
                        </span>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
