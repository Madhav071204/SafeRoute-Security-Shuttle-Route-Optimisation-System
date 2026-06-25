'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
type BadgeSize = 'sm' | 'md' | 'lg'

interface StatusBadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  pulse?: boolean
  icon?: React.ReactNode
  className?: string
}

export function StatusBadge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  icon,
  className = '',
}: StatusBadgeProps) {
  const variants = {
    default: `
      bg-surface-100 dark:bg-surface-800
      text-surface-700 dark:text-surface-300
      border-surface-200 dark:border-surface-700
    `,
    primary: `
      bg-primary-50 dark:bg-primary-900/30
      text-primary-700 dark:text-primary-300
      border-primary-200 dark:border-primary-800
    `,
    success: `
      bg-success-50 dark:bg-success-900/30
      text-success-700 dark:text-success-300
      border-success-200 dark:border-success-800
    `,
    warning: `
      bg-warning-50 dark:bg-warning-900/30
      text-warning-700 dark:text-warning-300
      border-warning-200 dark:border-warning-800
    `,
    danger: `
      bg-danger-50 dark:bg-danger-900/30
      text-danger-700 dark:text-danger-300
      border-danger-200 dark:border-danger-800
    `,
    info: `
      bg-blue-50 dark:bg-blue-900/30
      text-blue-700 dark:text-blue-300
      border-blue-200 dark:border-blue-800
    `,
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }

  const dotColors = {
    default: 'bg-surface-500',
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    info: 'bg-blue-500',
  }

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span 
              className={clsx(
                'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                dotColors[variant]
              )} 
            />
          )}
          <span 
            className={clsx(
              'relative inline-flex rounded-full h-2 w-2',
              dotColors[variant]
            )} 
          />
        </span>
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </motion.span>
  )
}

interface CountBadgeProps {
  count: number
  max?: number
  variant?: BadgeVariant
  className?: string
}

export function CountBadge({
  count,
  max = 99,
  variant = 'danger',
  className = '',
}: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count

  if (count === 0) return null

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={clsx(
        'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold rounded-full',
        variant === 'danger' && 'bg-danger-500 text-white',
        variant === 'primary' && 'bg-primary-500 text-white',
        variant === 'success' && 'bg-success-500 text-white',
        className
      )}
    >
      {displayCount}
    </motion.span>
  )
}
