'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
}

export function StatCard({ title, value, subtitle, icon, trend, color = 'primary' }: StatCardProps) {
  const colorClasses = {
    primary: {
      bg: 'bg-primary-50 dark:bg-primary-900/20',
      icon: 'bg-primary-100 dark:bg-primary-800/50 text-primary-600 dark:text-primary-400',
      border: 'border-primary-200/50 dark:border-primary-800/50',
    },
    success: {
      bg: 'bg-success-50 dark:bg-success-900/20',
      icon: 'bg-success-100 dark:bg-success-800/50 text-success-600 dark:text-success-400',
      border: 'border-success-200/50 dark:border-success-800/50',
    },
    warning: {
      bg: 'bg-warning-50 dark:bg-warning-900/20',
      icon: 'bg-warning-100 dark:bg-warning-800/50 text-warning-600 dark:text-warning-400',
      border: 'border-warning-200/50 dark:border-warning-800/50',
    },
    danger: {
      bg: 'bg-danger-50 dark:bg-danger-900/20',
      icon: 'bg-danger-100 dark:bg-danger-800/50 text-danger-600 dark:text-danger-400',
      border: 'border-danger-200/50 dark:border-danger-800/50',
    },
    neutral: {
      bg: 'bg-surface-50 dark:bg-surface-800/50',
      icon: 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400',
      border: 'border-surface-200 dark:border-surface-700',
    },
  }

  const colors = colorClasses[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'rounded-xl p-5 border',
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-surface-500 dark:text-surface-400">{title}</p>
          <p className="text-2xl font-bold text-surface-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-surface-500 dark:text-surface-400">{subtitle}</p>
          )}
          {trend && (
            <p className={clsx(
              'text-xs font-medium flex items-center gap-1',
              trend.isPositive ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'
            )}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                {trend.isPositive ? (
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
                )}
              </svg>
              {Math.abs(trend.value)}% from last period
            </p>
          )}
        </div>
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', colors.icon)}>
          {icon}
        </div>
      </div>
    </motion.div>
  )
}
