import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { TripProvider } from '@/context/TripContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SafeRoute - Security Shuttle Route Optimization',
  description: 'Optimize security shuttle drop-off routes for university students',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TripProvider>
        <div className="min-h-screen flex flex-col">
          <header className="bg-white border-b border-gray-200 px-4 py-3">
            <nav className="max-w-7xl mx-auto flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
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
                <span className="text-xl font-bold text-gray-900">SafeRoute</span>
              </Link>
              <div className="flex items-center gap-4">
                <Link
                  href="/settings"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Settings
                </Link>
                <Link
                  href="/about"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  About
                </Link>
              </div>
            </nav>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <footer className="bg-white border-t border-gray-200 px-4 py-4">
            <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
              SafeRoute is a student portfolio project. It is not affiliated with Monash University. 
              Do not use for actual student transport operations.
            </div>
          </footer>
        </div>
        </TripProvider>
      </body>
    </html>
  )
}
