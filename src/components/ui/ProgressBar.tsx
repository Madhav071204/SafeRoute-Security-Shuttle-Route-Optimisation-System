'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'

interface ProgressBarProps {
  value: number
  max: number
  label?: string
  showPercentage?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'gradient'
  animated?: boolean
  className?: string
}

export function ProgressBar({
  value,
  max,
  label,
  showPercentage = true,
  size = 'md',
  variant = 'default',
  animated = true,
  className = '',
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const barVariants = {
    default: 'bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-400 dark:to-primary-500',
    success: 'bg-gradient-to-r from-success-500 to-success-600 dark:from-success-400 dark:to-success-500',
    gradient: 'bg-gradient-to-r from-primary-500 via-primary-400 to-success-500',
  }

  const isComplete = percentage >= 100

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className={clsx(
              'font-medium text-surface-700 dark:text-surface-300',
              textSizeClasses[size]
            )}>
              {label}
            </span>
          )}
          {showPercentage && (
            <motion.span
              key={percentage}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={clsx(
                'font-semibold tabular-nums',
                textSizeClasses[size],
                isComplete 
                  ? 'text-success-600 dark:text-success-400' 
                  : 'text-surface-500 dark:text-surface-400'
              )}
            >
              {percentage}%
            </motion.span>
          )}
        </div>
      )}
      <div 
        className={clsx(
          'w-full rounded-full overflow-hidden',
          'bg-surface-200 dark:bg-surface-700',
          sizeClasses[size]
        )}
      >
        <motion.div
          className={clsx(
            'h-full rounded-full relative overflow-hidden',
            barVariants[variant],
            sizeClasses[size]
          )}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${percentage}%` }}
          transition={{ 
            duration: animated ? 0.5 : 0, 
            ease: [0.4, 0, 0.2, 1] 
          }}
        >
          {animated && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  )
}

interface CircularProgressProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  showPercentage?: boolean
  className?: string
}

export function CircularProgress({
  value,
  max,
  size = 80,
  strokeWidth = 8,
  showPercentage = true,
  className = '',
}: CircularProgressProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-surface-200 dark:stroke-surface-700"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="stroke-primary-500 dark:stroke-primary-400"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            key={percentage}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-lg font-bold text-surface-900 dark:text-white tabular-nums"
          >
            {percentage}%
          </motion.span>
        </div>
      )}
    </div>
  )
}
