'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'

interface DataPoint {
  label: string
  value: number
}

interface SimpleBarChartProps {
  data: DataPoint[]
  title: string
  color?: 'primary' | 'success' | 'warning'
  formatValue?: (value: number) => string
  maxBars?: number
}

export function SimpleBarChart({ 
  data, 
  title, 
  color = 'primary',
  formatValue = (v) => v.toString(),
  maxBars = 7,
}: SimpleBarChartProps) {
  const displayData = data.slice(-maxBars)
  const maxValue = Math.max(...displayData.map(d => d.value), 1)

  const colorClasses = {
    primary: 'bg-primary-500 dark:bg-primary-400',
    success: 'bg-success-500 dark:bg-success-400',
    warning: 'bg-warning-500 dark:bg-warning-400',
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">{title}</h3>
      
      {displayData.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-surface-400 dark:text-surface-500 text-sm">
          No data available
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-end gap-2 h-32">
            {displayData.map((point, index) => {
              const height = maxValue > 0 ? (point.value / maxValue) * 100 : 0
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">
                    {formatValue(point.value)}
                  </span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(height, 4)}%` }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className={clsx(
                      'w-full rounded-t-md min-h-[4px]',
                      colorClasses[color]
                    )}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            {displayData.map((point, index) => (
              <div key={index} className="flex-1 text-center">
                <span className="text-xs text-surface-500 dark:text-surface-400 truncate block">
                  {point.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
