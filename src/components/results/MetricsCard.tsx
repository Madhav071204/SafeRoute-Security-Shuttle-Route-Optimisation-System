'use client'

import { motion } from 'framer-motion'
import { RouteMetrics } from '@/types'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import clsx from 'clsx'

interface MetricsCardProps {
  title: string
  subtitle?: string
  metrics: RouteMetrics
  variant?: 'default' | 'primary'
  isSelected?: boolean
  onSelect?: () => void
  recommended?: boolean
}

export function MetricsCard({
  title,
  subtitle,
  metrics,
  variant = 'default',
  isSelected,
  onSelect,
  recommended,
}: MetricsCardProps) {
  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)} m`
    return `${km.toFixed(1)} km`
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        'relative p-5 rounded-2xl cursor-pointer transition-all duration-300',
        'border-2',
        variant === 'default' && 'bg-surface-50 dark:bg-surface-800/50',
        variant === 'primary' && 'bg-primary-50/50 dark:bg-primary-900/20',
        isSelected 
          ? 'border-primary-500 dark:border-primary-400 shadow-lg shadow-primary-500/20' 
          : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600',
      )}
      onClick={onSelect}
    >
      {recommended && (
        <motion.div
          initial={{ scale: 0, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          className="absolute -top-3 left-4 px-3 py-1 rounded-full bg-gradient-to-r from-success-500 to-success-600 text-white text-xs font-semibold shadow-lg"
        >
          Recommended
        </motion.div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={clsx(
            'font-semibold',
            variant === 'primary' 
              ? 'text-primary-900 dark:text-primary-100' 
              : 'text-surface-900 dark:text-white'
          )}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-surface-500 dark:text-surface-400">{subtitle}</p>
          )}
        </div>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center"
          >
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.div>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400">
            <div className="w-7 h-7 rounded-lg bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-sm">Distance</span>
          </div>
          <span className="text-lg font-bold text-surface-900 dark:text-white tabular-nums">
            {formatDistance(metrics.totalDistanceKm)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400">
            <div className="w-7 h-7 rounded-lg bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm">Time</span>
          </div>
          <span className="text-lg font-bold text-surface-900 dark:text-white tabular-nums">
            {formatDuration(metrics.totalDurationMinutes)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400">
            <div className="w-7 h-7 rounded-lg bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm">Fuel Cost</span>
          </div>
          <span className="text-lg font-bold text-surface-900 dark:text-white tabular-nums">
            <AnimatedCounter 
              value={metrics.estimatedFuelCostAud} 
              prefix="$" 
              decimals={2} 
            />
          </span>
        </div>
      </div>

      {!isSelected && (
        <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
          <p className="text-xs text-center text-surface-400 dark:text-surface-500">
            Click to select this route
          </p>
        </div>
      )}
    </motion.div>
  )
}
