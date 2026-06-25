'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import clsx from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated' | 'outlined' | 'primary' | 'success'
  hover?: boolean
  animate?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className = '', 
    variant = 'default', 
    hover = false,
    animate = true,
    padding = 'none',
    children, 
    ...props 
  }, ref) => {
    const variants = {
      default: `
        bg-white dark:bg-surface-800
        border border-surface-200 dark:border-surface-700
        shadow-card
      `,
      glass: `
        bg-white/80 dark:bg-surface-800/80
        backdrop-blur-xl
        border border-white/30 dark:border-surface-700/50
        shadow-glass dark:shadow-glass-dark
      `,
      elevated: `
        bg-white dark:bg-surface-800
        shadow-premium
        border border-surface-100 dark:border-surface-700
      `,
      outlined: `
        bg-transparent
        border-2 border-surface-200 dark:border-surface-700
      `,
      primary: `
        bg-primary-50 dark:bg-primary-900/20
        border border-primary-200 dark:border-primary-800
      `,
      success: `
        bg-success-50 dark:bg-success-900/20
        border border-success-200 dark:border-success-800
      `,
    }

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    }

    const hoverStyles = hover 
      ? 'hover:shadow-card-hover hover:scale-[1.02] cursor-pointer' 
      : ''

    const Component = animate ? motion.div : 'div'
    const motionProps = animate ? {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3 },
    } : {}

    return (
      <Component
        ref={ref}
        className={clsx(
          'rounded-2xl transition-all duration-300',
          variants[variant],
          paddings[padding],
          hoverStyles,
          className
        )}
        {...(animate ? motionProps : {})}
        {...(props as any)}
      >
        {children}
      </Component>
    )
  }
)

Card.displayName = 'Card'

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  noBorder?: boolean
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', noBorder = false, ...props }, ref) => (
    <div 
      ref={ref} 
      className={clsx(
        'px-6 py-4',
        !noBorder && 'border-b border-surface-100 dark:border-surface-700/50',
        className
      )} 
      {...props} 
    />
  )
)

CardHeader.displayName = 'CardHeader'

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', ...props }, ref) => (
    <h3 
      ref={ref} 
      className={clsx(
        'text-lg font-semibold text-surface-900 dark:text-white',
        className
      )} 
      {...props} 
    />
  )
)

CardTitle.displayName = 'CardTitle'

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className = '', ...props }, ref) => (
    <p 
      ref={ref} 
      className={clsx(
        'text-sm text-surface-500 dark:text-surface-400 mt-1',
        className
      )} 
      {...props} 
    />
  )
)

CardDescription.displayName = 'CardDescription'

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={clsx('p-6', className)} {...props} />
  )
)

CardContent.displayName = 'CardContent'

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div 
      ref={ref} 
      className={clsx(
        'px-6 py-4 border-t border-surface-100 dark:border-surface-700/50 bg-surface-50/50 dark:bg-surface-900/30 rounded-b-2xl',
        className
      )} 
      {...props} 
    />
  )
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
