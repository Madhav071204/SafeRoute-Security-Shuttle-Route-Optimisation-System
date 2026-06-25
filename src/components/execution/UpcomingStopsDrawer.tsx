'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Stop } from '@/types'
import clsx from 'clsx'

interface UpcomingStopsDrawerProps {
  stops: Stop[]
  orderedStopIds: string[]
  completedStopIds: string[]
  currentStopIndex: number
  isExpanded?: boolean
}

export function UpcomingStopsDrawer({
  stops,
  orderedStopIds,
  completedStopIds,
  currentStopIndex,
  isExpanded: parentExpanded = false,
}: UpcomingStopsDrawerProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const upcomingCount = orderedStopIds.length - currentStopIndex - 1
  const completedCount = completedStopIds.length
  const totalStops = orderedStopIds.length

  useEffect(() => {
    if (parentExpanded) {
      setIsDrawerOpen(true)
    }
  }, [parentExpanded])

  const getStopStatus = (stopId: string, index: number) => {
    if (completedStopIds.includes(stopId)) return 'completed'
    if (index === currentStopIndex) return 'current'
    return 'upcoming'
  }

  return (
    <div className="border-t border-surface-200/60 dark:border-surface-700/60 bg-surface-50/80 dark:bg-surface-800/50">
      {/* Drawer toggle button */}
      <motion.button
        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
        className="w-full px-4 sm:px-5 py-3 flex items-center justify-between hover:bg-surface-100/80 dark:hover:bg-surface-700/30 transition-colors"
        whileTap={{ scale: 0.995 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: isDrawerOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-6 h-6 rounded-lg bg-surface-200 dark:bg-surface-700 flex items-center justify-center"
          >
            <svg
              className="w-3.5 h-3.5 text-surface-500 dark:text-surface-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </motion.div>
          <div className="text-left">
            <span className="text-sm font-semibold text-surface-800 dark:text-surface-200 block">
              {upcomingCount > 0 
                ? `${upcomingCount} stop${upcomingCount !== 1 ? 's' : ''} remaining`
                : 'Route complete'}
            </span>
            <span className="text-2xs text-surface-500 dark:text-surface-400">
              Tap to {isDrawerOpen ? 'hide' : 'view'} all stops
            </span>
          </div>
        </div>

        {/* Progress indicators */}
        <div className="flex items-center gap-1.5">
          {orderedStopIds.slice(0, 4).map((stopId, i) => {
            const status = getStopStatus(stopId, i)
            return (
              <div
                key={stopId}
                className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center text-2xs font-bold transition-all',
                  status === 'completed' && 'bg-success-500 text-white shadow-sm shadow-success-500/30',
                  status === 'current' && 'bg-primary-500 text-white shadow-sm shadow-primary-500/30 ring-2 ring-primary-200 dark:ring-primary-800',
                  status === 'upcoming' && 'bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400'
                )}
              >
                {status === 'completed' ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
            )
          })}
          {totalStops > 4 && (
            <div className="w-6 h-6 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-2xs font-bold text-surface-500 dark:text-surface-400">
              +{totalStops - 4}
            </div>
          )}
        </div>
      </motion.button>

      {/* Expandable stops list */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="max-h-52 overflow-y-auto overscroll-contain driver-scrollbar border-t border-surface-200/50 dark:border-surface-700/50">
              <div className="px-3 sm:px-4 py-2.5 space-y-1">
                {orderedStopIds.map((stopId, index) => {
                  const stop = stops.find((s) => s.id === stopId)
                  if (!stop) return null

                  const status = getStopStatus(stopId, index)
                  const displayNumber = index + 1

                  return (
                    <motion.div
                      key={stopId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.025 }}
                      className={clsx(
                        'flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all',
                        status === 'current' && 'bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-200/80 dark:ring-primary-800/50',
                        status === 'completed' && 'opacity-60'
                      )}
                    >
                      {/* Stop indicator */}
                      <div className="flex-shrink-0 relative">
                        {status === 'completed' ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-8 h-8 rounded-lg bg-success-500 flex items-center justify-center shadow-sm"
                          >
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                        ) : status === 'current' ? (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-md">
                            <span className="text-white text-sm font-bold">{displayNumber}</span>
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
                            <span className="text-surface-500 dark:text-surface-400 text-sm font-semibold">{displayNumber}</span>
                          </div>
                        )}
                        
                        {/* Connector line */}
                        {index < orderedStopIds.length - 1 && (
                          <div className={clsx(
                            'absolute top-9 left-1/2 -translate-x-1/2 w-0.5 h-4',
                            status === 'completed' 
                              ? 'bg-success-300 dark:bg-success-700'
                              : 'bg-surface-200 dark:bg-surface-700'
                          )} />
                        )}
                      </div>

                      {/* Stop info */}
                      <div className="flex-1 min-w-0">
                        <p className={clsx(
                          'text-sm font-medium truncate',
                          status === 'completed' 
                            ? 'text-surface-400 dark:text-surface-500 line-through' 
                            : 'text-surface-800 dark:text-surface-100'
                        )}>
                          {stop.passengerName || `Passenger ${displayNumber}`}
                        </p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                          {stop.address}
                        </p>
                      </div>

                      {/* Status badge */}
                      {status === 'current' && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex-shrink-0 px-2 py-1 text-2xs font-bold text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-800/40 rounded-md uppercase tracking-wide"
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
