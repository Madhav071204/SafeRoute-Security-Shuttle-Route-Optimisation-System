'use client'

import { useTrip } from '@/context/TripContext'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isDriverMode } = useTrip()

  if (isDriverMode) {
    return (
      <div className="fixed inset-0 z-50 bg-surface-100 dark:bg-surface-900">
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
