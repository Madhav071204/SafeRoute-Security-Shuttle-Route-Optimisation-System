'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import clsx from 'clsx'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className = '', 
    variant = 'primary', 
    size = 'md', 
    isLoading, 
    disabled, 
    children,
    leftIcon,
    rightIcon,
    fullWidth,
    ...props 
  }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-semibold rounded-xl
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2 
      focus:ring-offset-white dark:focus:ring-offset-surface-900
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
      active:scale-[0.98]
    `
    
    const variants = {
      primary: `
        bg-gradient-to-r from-primary-600 to-primary-700
        hover:from-primary-500 hover:to-primary-600
        text-white shadow-lg shadow-primary-500/25
        hover:shadow-xl hover:shadow-primary-500/30
        focus:ring-primary-500
        dark:from-primary-500 dark:to-primary-600
        dark:hover:from-primary-400 dark:hover:to-primary-500
      `,
      secondary: `
        bg-surface-100 dark:bg-surface-800
        hover:bg-surface-200 dark:hover:bg-surface-700
        text-surface-700 dark:text-surface-300
        border border-surface-200 dark:border-surface-700
        focus:ring-surface-400
      `,
      success: `
        bg-gradient-to-r from-success-600 to-success-700
        hover:from-success-500 hover:to-success-600
        text-white shadow-lg shadow-success-500/25
        hover:shadow-xl hover:shadow-success-500/30
        focus:ring-success-500
        dark:from-success-500 dark:to-success-600
      `,
      danger: `
        bg-gradient-to-r from-danger-600 to-danger-700
        hover:from-danger-500 hover:to-danger-600
        text-white shadow-lg shadow-danger-500/25
        hover:shadow-xl hover:shadow-danger-500/30
        focus:ring-danger-500
      `,
      ghost: `
        bg-transparent
        hover:bg-surface-100 dark:hover:bg-surface-800
        text-surface-600 dark:text-surface-400
        hover:text-surface-900 dark:hover:text-surface-100
        focus:ring-surface-400
      `,
      outline: `
        bg-transparent
        border-2 border-primary-500 dark:border-primary-400
        text-primary-600 dark:text-primary-400
        hover:bg-primary-50 dark:hover:bg-primary-900/20
        focus:ring-primary-500
      `,
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-lg',
    }

    const motionProps: Partial<HTMLMotionProps<'button'>> = {
      whileHover: disabled || isLoading ? {} : { scale: 1.02 },
      whileTap: disabled || isLoading ? {} : { scale: 0.98 },
      transition: { duration: 0.15 },
    }

    return (
      <motion.button
        ref={ref}
        className={clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || isLoading}
        {...motionProps}
        {...(props as any)}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
