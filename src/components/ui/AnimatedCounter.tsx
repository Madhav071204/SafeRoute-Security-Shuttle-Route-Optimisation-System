'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import clsx from 'clsx'

interface AnimatedCounterProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}

export function AnimatedCounter({
  value,
  duration = 0.8,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}: AnimatedCounterProps) {
  const spring = useSpring(0, { duration: duration * 1000 })
  const display = useTransform(spring, (current) =>
    `${prefix}${current.toFixed(decimals)}${suffix}`
  )
  const [displayValue, setDisplayValue] = useState(`${prefix}0${suffix}`)

  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => setDisplayValue(v))
    return () => unsubscribe()
  }, [display])

  return (
    <motion.span
      className={clsx('tabular-nums', className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {displayValue}
    </motion.span>
  )
}

interface AnimatedPercentageProps {
  value: number
  showSign?: boolean
  className?: string
  positiveClass?: string
  negativeClass?: string
}

export function AnimatedPercentage({
  value,
  showSign = true,
  className = '',
  positiveClass = 'text-success-600 dark:text-success-400',
  negativeClass = 'text-danger-600 dark:text-danger-400',
}: AnimatedPercentageProps) {
  const isPositive = value >= 0
  const sign = showSign ? (isPositive ? '+' : '') : ''

  return (
    <motion.span
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={clsx(
        'font-semibold',
        isPositive ? positiveClass : negativeClass,
        className
      )}
    >
      <AnimatedCounter
        value={value}
        prefix={sign}
        suffix="%"
        decimals={0}
      />
    </motion.span>
  )
}

interface MetricDisplayProps {
  value: number
  label: string
  prefix?: string
  suffix?: string
  decimals?: number
  trend?: number
  icon?: React.ReactNode
  variant?: 'default' | 'highlight'
  className?: string
}

export function MetricDisplay({
  value,
  label,
  prefix = '',
  suffix = '',
  decimals = 0,
  trend,
  icon,
  variant = 'default',
  className = '',
}: MetricDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'flex flex-col',
        variant === 'highlight' && 'bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl',
        className
      )}
    >
      <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400 mb-1">
        {icon && <span className="text-surface-400 dark:text-surface-500">{icon}</span>}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <AnimatedCounter
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          className="text-2xl font-bold text-surface-900 dark:text-white"
        />
        {trend !== undefined && (
          <AnimatedPercentage value={trend} className="text-sm" />
        )}
      </div>
    </motion.div>
  )
}
