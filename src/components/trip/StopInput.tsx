'use client'

import { motion } from 'framer-motion'
import { Stop } from '@/types'
import clsx from 'clsx'

interface StopInputProps {
  stop: Stop
  index: number
  onUpdate: (updates: Partial<Stop>) => void
  onRemove: () => void
  disabled?: boolean
}

export function StopInput({ stop, index, onUpdate, onRemove, disabled }: StopInputProps) {
  const statusConfig = {
    pending: {
      dot: 'bg-surface-400 dark:bg-surface-500',
      ring: '',
      label: 'Pending location',
    },
    success: {
      dot: 'bg-success-500',
      ring: 'ring-2 ring-success-500/20',
      label: 'Location found',
    },
    failed: {
      dot: 'bg-danger-500',
      ring: 'ring-2 ring-danger-500/20',
      label: 'Location not found',
    },
  }

  const status = statusConfig[stop.geocodeStatus]

  return (
    <div
      className={clsx(
        'relative p-4 sm:p-5 rounded-xl transition-all duration-200',
        'bg-white dark:bg-surface-800',
        'border border-surface-200 dark:border-surface-700',
        'hover:border-surface-300 dark:hover:border-surface-600',
        'shadow-sm',
        status.ring
      )}
    >
      <div className="flex gap-3 sm:gap-4">
        {/* Stop number badge */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center border border-primary-200 dark:border-primary-800">
            <span className="text-sm font-bold text-primary-700 dark:text-primary-300">
              {index + 1}
            </span>
          </div>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={clsx('w-2.5 h-2.5 rounded-full', status.dot)}
            title={status.label}
          />
        </div>
        
        {/* Input fields */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Passenger Name Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Passenger Name
              <span className="text-surface-400 dark:text-surface-500 font-normal normal-case ml-1">(optional)</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="e.g. John Smith"
                value={stop.passengerName}
                onChange={(e) => onUpdate({ passengerName: e.target.value })}
                disabled={disabled}
                className={clsx(
                  'w-full pl-10 pr-4 py-2.5 rounded-lg text-sm font-medium',
                  'bg-surface-50 dark:bg-surface-900/50',
                  'border border-surface-200 dark:border-surface-600',
                  'text-surface-900 dark:text-surface-100',
                  'placeholder:text-surface-400 dark:placeholder:text-surface-500',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 dark:focus:border-primary-400',
                  'hover:border-surface-300 dark:hover:border-surface-500',
                  'transition-colors duration-200',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              />
            </div>
          </div>

          {/* Destination Address Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Destination Address
              <span className="text-danger-500 ml-0.5">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="e.g. 123 Main Street, Sydney NSW"
                value={stop.address}
                onChange={(e) => onUpdate({ address: e.target.value, geocodeStatus: 'pending', coordinates: null })}
                disabled={disabled}
                className={clsx(
                  'w-full pl-10 pr-4 py-2.5 rounded-lg text-sm',
                  'bg-surface-50 dark:bg-surface-900/50',
                  'text-surface-900 dark:text-surface-100',
                  'placeholder:text-surface-400 dark:placeholder:text-surface-500',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
                  'transition-colors duration-200',
                  disabled && 'opacity-50 cursor-not-allowed',
                  stop.geocodeStatus === 'failed'
                    ? 'border-2 border-danger-400 dark:border-danger-500 focus:border-danger-500'
                    : 'border border-surface-200 dark:border-surface-600 focus:border-primary-500 dark:focus:border-primary-400 hover:border-surface-300 dark:hover:border-surface-500'
                )}
              />
            </div>
            {stop.geocodeStatus === 'failed' && stop.geocodeError && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 text-xs text-danger-600 dark:text-danger-400 mt-1"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {stop.geocodeError}
              </motion.p>
            )}
          </div>

          {/* Success indicator */}
          {stop.geocodeStatus === 'success' && stop.coordinates && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 text-xs text-success-600 dark:text-success-400"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Location verified</span>
            </motion.div>
          )}
        </div>

        {/* Remove button */}
        <div className="flex-shrink-0 pt-1">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRemove}
            disabled={disabled}
            className={clsx(
              'p-2 rounded-lg transition-all duration-200',
              'text-surface-400 dark:text-surface-500',
              'hover:text-danger-600 dark:hover:text-danger-400',
              'hover:bg-danger-50 dark:hover:bg-danger-900/30',
              'border border-transparent hover:border-danger-200 dark:hover:border-danger-800',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-transparent'
            )}
            title="Remove stop"
            aria-label="Remove stop"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  )
}
