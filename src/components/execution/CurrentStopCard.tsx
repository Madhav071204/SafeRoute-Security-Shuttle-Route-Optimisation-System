'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Stop, DriverLocation, RouteLeg } from '@/types'
import { Button } from '@/components/ui/Button'
import { formatDistance, formatDuration, getDistanceAndETA } from '@/lib/distance'

interface CurrentStopCardProps {
  stop: Stop
  stopNumber: number
  totalStops: number
  driverLocation: DriverLocation | null
  leg?: RouteLeg
  onMarkComplete: () => void
}

export function CurrentStopCard({
  stop,
  stopNumber,
  totalStops,
  driverLocation,
  leg,
  onMarkComplete,
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

  return (
    <motion.div
      key={stop.id}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="bg-white dark:bg-surface-900 rounded-t-3xl shadow-premium border-t border-surface-200 dark:border-surface-700"
    >
      {/* Drag handle */}
      <div className="w-12 h-1.5 bg-surface-300 dark:bg-surface-600 rounded-full mx-auto mt-2.5" />

      {/* Header with stop count and ETA */}
      <div className="px-4 sm:px-5 pt-3 pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800">
              <span className="text-xs font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wider">
                Stop {stopNumber}/{totalStops}
              </span>
            </div>
            {stopNumber === totalStops && (
              <div className="px-2 py-0.5 rounded-full bg-success-100 dark:bg-success-900/30 border border-success-200 dark:border-success-800">
                <span className="text-xs font-semibold text-success-700 dark:text-success-300">Final</span>
              </div>
            )}
          </motion.div>

          <AnimatePresence mode="wait">
            {distance !== null && eta !== null && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 text-sm"
              >
                <div className="flex items-center gap-1 text-surface-600 dark:text-surface-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="font-semibold">{formatDistance(distance)}</span>
                </div>
                <div className="w-px h-3.5 bg-surface-300 dark:bg-surface-600" />
                <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-bold">~{formatDuration(eta)}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Passenger info */}
      <div className="px-4 sm:px-5 py-3">
        <motion.div
          key={stop.id + '-info'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/30">
              <span className="text-base sm:text-lg font-bold text-white">{stopNumber}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-surface-900 dark:text-white truncate">
                {stop.passengerName || `Passenger ${stopNumber}`}
              </h3>
              <p className="text-surface-500 dark:text-surface-400 text-sm mt-0.5 line-clamp-2">
                {stop.address}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Action buttons - sticky at bottom */}
      <div className="px-4 sm:px-5 pb-4 space-y-2.5 bg-white dark:bg-surface-900">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenInGoogleMaps}
            className="flex-1"
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          >
            <span className="hidden sm:inline">Google</span> Maps
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenInAppleMaps}
            className="px-3"
            title="Open in Apple Maps"
            leftIcon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            }
          >
            <span className="hidden sm:inline">Apple</span>
          </Button>
        </div>

        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <Button
            variant="success"
            onClick={onMarkComplete}
            fullWidth
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            }
          >
            Mark Arrived & Complete
          </Button>
        </motion.div>
      </div>
    </motion.div>
  )
}
