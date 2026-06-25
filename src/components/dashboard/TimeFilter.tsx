'use client'

import clsx from 'clsx'
import { TimeFilter as TimeFilterType } from '@/hooks/useAnalytics'

interface TimeFilterProps {
  value: TimeFilterType
  onChange: (value: TimeFilterType) => void
}

const FILTER_OPTIONS: { value: TimeFilterType; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
]

export function TimeFilter({ value, onChange }: TimeFilterProps) {
  return (
    <div className="inline-flex rounded-lg bg-surface-100 dark:bg-surface-800 p-1">
      {FILTER_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
            value === option.value
              ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm'
              : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
