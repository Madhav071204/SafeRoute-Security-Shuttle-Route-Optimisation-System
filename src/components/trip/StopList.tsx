'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTrip } from '@/context/TripContext'
import { StopInput } from './StopInput'
import { MAX_STOPS } from '@/lib/constants'

interface StopListProps {
  disabled?: boolean
}

export function StopList({ disabled }: StopListProps) {
  const { trip, updateStop, removeStop } = useTrip()

  if (trip.stops.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
          <svg className="w-8 h-8 text-surface-400 dark:text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-surface-600 dark:text-surface-400 font-medium">No stops added yet</p>
        <p className="text-surface-500 dark:text-surface-500 text-sm mt-1">
          Add destinations or load demo data
        </p>
      </motion.div>
    )
  }

  const successCount = trip.stops.filter(s => s.geocodeStatus === 'success').length
  const errorCount = trip.stops.filter(s => s.geocodeStatus === 'failed').length

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-surface-700 dark:text-surface-300">
            Stops
          </span>
          {successCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400">
              {successCount} located
            </span>
          )}
          {errorCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400">
              {errorCount} failed
            </span>
          )}
        </div>
        {trip.stops.length >= MAX_STOPS && (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400">
            Maximum reached
          </span>
        )}
      </div>
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
        <AnimatePresence initial={false}>
          {trip.stops.map((stop, index) => (
            <motion.div
              key={stop.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <StopInput
                stop={stop}
                index={index}
                onUpdate={(updates) => updateStop(stop.id, updates)}
                onRemove={() => removeStop(stop.id)}
                disabled={disabled}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
