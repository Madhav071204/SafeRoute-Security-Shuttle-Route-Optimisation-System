'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Stop, DriverLocation, RouteLeg } from '@/types'
import { formatDistance, formatDuration, getDistanceAndETA } from '@/lib/distance'
import clsx from 'clsx'
import type { DriverStopAction } from './DriverModeView'

interface CurrentStopCardProps {
  stop: Stop
  stopNumber: number
  totalStops: number
  driverLocation: DriverLocation | null
  leg?: RouteLeg
  onMarkComplete: () => void
  onStopAction?: (action: DriverStopAction) => void | Promise<void>
  stopActionBusy?: DriverStopAction | null
  stopActionError?: string | null
  isExpanded?: boolean
}

export function CurrentStopCard({
  stop,
  stopNumber,
  totalStops,
  driverLocation,
  leg,
  onMarkComplete,
  onStopAction,
  stopActionBusy,
  stopActionError,
  isExpanded = false,
}: CurrentStopCardProps) {
  const { distance, eta } = getDistanceAndETA(
    driverLocation,
    stop.coordinates,
    leg?.durationMinutes
  )

  const handleOpenInGoogleMaps = () => {
    if (stop.coordinates) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.coordinates.lat},${stop.coordinates.lng}`
      window.open(url, '_blank')
    }
  }

  const handleOpenInAppleMaps = () => {
    if (stop.coordinates) {
      const url = `http://maps.apple.com/?daddr=${stop.coordinates.lat},${stop.coordinates.lng}`
      window.open(url, '_blank')
    }
  }

  const isFinalStop = stopNumber === totalStops

  return (
    <div className="px-4 sm:px-5 pb-4">
      {/* Header with stop badge and metrics */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <motion.div
          key={stop.id + '-badge'}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2"
        >
          <span className={clsx('stop-badge', isFinalStop && 'final')}>
            Stop {stopNumber} of {totalStops}
          </span>
          {isFinalStop && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="stop-badge final"
            >
              Final
            </motion.span>
          )}
        </motion.div>

        {/* Distance & ETA chips */}
        <AnimatePresence mode="wait">
          {distance !== null && eta !== null && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-2"
            >
              <div className="metric-chip">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>{formatDistance(distance)}</span>
              </div>
              <div className="metric-chip primary">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>~{formatDuration(eta)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Passenger info */}
      <motion.div
        key={stop.id + '-info'}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-4"
      >
        <div className="flex items-start gap-3">
          {/* Stop number indicator */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/25">
            <span className="text-lg sm:text-xl font-bold text-white">{stopNumber}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-surface-900 dark:text-white truncate leading-tight">
              {stop.passengerName || `Passenger ${stopNumber}`}
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5 line-clamp-2 leading-snug">
              {stop.address}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Action buttons */}
      <div className="space-y-2.5">
        {/* Navigation buttons - balanced width */}
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenInGoogleMaps}
            className="nav-button google"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span>Google Maps</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenInAppleMaps}
            className="nav-button apple"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <span>Apple Maps</span>
          </motion.button>
        </div>

        {onStopAction ? (
          <div className="space-y-2">
            {stopActionError && (
              <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200/50 dark:border-danger-800/50 rounded-xl px-3 py-2">
                <p className="text-xs text-danger-700 dark:text-danger-300">{stopActionError}</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onStopAction('arrived')}
                disabled={!!stopActionBusy}
                className={clsx(
                  'px-3 py-2 rounded-lg text-xs font-semibold border transition-colors',
                  'border-surface-200 dark:border-surface-700',
                  'bg-white/80 dark:bg-surface-900/30',
                  'text-surface-700 dark:text-surface-200',
                  !!stopActionBusy && 'opacity-60 cursor-not-allowed'
                )}
              >
                {stopActionBusy === 'arrived' ? '...' : 'Arrived'}
              </button>
              <button
                type="button"
                onClick={() => onStopAction('picked_up')}
                disabled={!!stopActionBusy}
                className={clsx(
                  'px-3 py-2 rounded-lg text-xs font-semibold border transition-colors',
                  'border-success-200 dark:border-success-800',
                  'bg-success-50 dark:bg-success-900/20',
                  'text-success-800 dark:text-success-300',
                  !!stopActionBusy && 'opacity-60 cursor-not-allowed'
                )}
              >
                {stopActionBusy === 'picked_up' ? '...' : 'Picked Up'}
              </button>
              <button
                type="button"
                onClick={() => onStopAction('no_show')}
                disabled={!!stopActionBusy}
                className={clsx(
                  'px-3 py-2 rounded-lg text-xs font-semibold border transition-colors',
                  'border-danger-200 dark:border-danger-800',
                  'bg-danger-50 dark:bg-danger-900/20',
                  'text-danger-800 dark:text-danger-300',
                  !!stopActionBusy && 'opacity-60 cursor-not-allowed'
                )}
              >
                {stopActionBusy === 'no_show' ? '...' : 'No Show'}
              </button>
            </div>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onMarkComplete}
            className="complete-button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>Mark Arrived & Continue</span>
          </motion.button>
        )}
      </div>
    </div>
  )
}
