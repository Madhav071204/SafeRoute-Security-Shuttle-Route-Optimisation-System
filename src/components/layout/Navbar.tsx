'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import clsx from 'clsx'

export function Navbar() {
  const pathname = usePathname()

  const navLinks = [
    { href: '/request', label: 'Request' },
    { href: '/dispatcher', label: 'Dispatcher' },
    { href: '/driver', label: 'Driver' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/settings', label: 'Settings' },
    { href: '/about', label: 'About' },
  ]

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-50 w-full"
    >
      <div className="glass-intense border-b border-surface-200/50 dark:border-surface-700/50">
        <nav className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
                  <svg
                    className="w-6 h-6 text-white"
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
              </motion.div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-surface-900 dark:text-white tracking-tight">
                  SafeRoute
                </span>
                <span className="text-2xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider hidden sm:block">
                  Smart Route Optimization
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                    pathname === link.href
                      ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                      : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="w-px h-6 bg-surface-200 dark:bg-surface-700 mx-2" />
              <ThemeToggle />
            </div>
          </div>
        </nav>
      </div>
    </motion.header>
  )
}
