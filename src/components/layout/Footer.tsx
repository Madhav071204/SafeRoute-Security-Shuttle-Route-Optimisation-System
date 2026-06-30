'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="border-t border-surface-200 dark:border-surface-800 bg-white/50 dark:bg-surface-900/50 backdrop-blur-sm"
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-surface-600 dark:text-surface-400">
              SafeRoute
            </span>
          </div>
          
          <p className="text-sm text-surface-500 dark:text-surface-500 text-center">
            A portfolio project. Not affiliated with Monash University. Not for production use.
          </p>
          
          <div className="flex items-center gap-4">
            <Link
              href="/about#privacy"
              className="text-sm text-surface-500 dark:text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/about"
              className="text-sm text-surface-500 dark:text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              About
            </Link>
          </div>
        </div>
      </div>
    </motion.footer>
  )
}
