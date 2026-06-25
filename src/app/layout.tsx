import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { TripProvider } from '@/context/TripContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { AppLayout } from '@/components/layout/AppLayout'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'SafeRoute - AI-Powered Route Optimization',
  description: 'Intelligent security shuttle route optimization for university campuses. Save time, fuel, and reduce emissions with smart routing.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('saferoute-theme');
                  const theme = stored || 'system';
                  const resolved = theme === 'system' 
                    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                    : theme;
                  document.documentElement.classList.add(resolved);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider>
          <TripProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </TripProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
