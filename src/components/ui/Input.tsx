'use client'

import { InputHTMLAttributes, forwardRef } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  variant?: 'default' | 'filled' | 'ghost'
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className = '', 
    label, 
    error, 
    hint, 
    id, 
    leftIcon,
    rightIcon,
    variant = 'default',
    disabled,
    ...props 
  }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    const variants = {
      default: `
        bg-white dark:bg-surface-800
        border border-surface-200 dark:border-surface-600
        hover:border-surface-300 dark:hover:border-surface-500
      `,
      filled: `
        bg-surface-100 dark:bg-surface-800
        border border-transparent
        hover:bg-surface-200 dark:hover:bg-surface-700
      `,
      ghost: `
        bg-surface-50 dark:bg-surface-900/50
        border border-surface-200 dark:border-surface-600
        hover:bg-surface-100 dark:hover:bg-surface-800
        hover:border-surface-300 dark:hover:border-surface-500
      `,
    }

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={clsx(
              'w-full rounded-xl text-sm transition-all duration-200',
              'text-surface-900 dark:text-surface-100',
              'placeholder:text-surface-400 dark:placeholder:text-surface-400',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
              error
                ? 'border-danger-300 dark:border-danger-700 focus:border-danger-500 focus:ring-danger-500/50'
                : 'focus:border-primary-500 dark:focus:border-primary-400',
              variants[variant],
              leftIcon ? 'pl-10' : 'px-4',
              rightIcon ? 'pr-10' : 'px-4',
              'py-3',
              disabled && 'opacity-50 cursor-not-allowed bg-surface-100 dark:bg-surface-900',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-sm text-danger-600 dark:text-danger-400 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </motion.p>
        )}
        {hint && !error && (
          <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
