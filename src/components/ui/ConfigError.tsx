'use client'

import { motion } from 'framer-motion'

interface ConfigErrorProps {
  title: string
  message: string
  details?: string
}

export function ConfigError({ title, message, details }: ConfigErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-danger-600 dark:text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
        {title}
      </h3>
      
      <p className="text-surface-600 dark:text-surface-400 max-w-md mb-4">
        {message}
      </p>
      
      {details && (
        <div className="bg-surface-100 dark:bg-surface-800 rounded-lg px-4 py-3 max-w-md">
          <code className="text-xs text-surface-700 dark:text-surface-300 font-mono">
            {details}
          </code>
        </div>
      )}
    </motion.div>
  )
}
