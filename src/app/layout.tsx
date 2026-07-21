import type { Metadata } from 'next'
import './globals.css'
import { TripProvider } from '@/context/TripContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { AppLayout } from '@/components/layout/AppLayout'

export const metadata: Metadata = {
  title: 'SafeRoute - Security Shuttle Route Comparison',
  description: 'Personal proof-of-concept comparing FIFO and nearest-neighbour stop ordering for security-shuttle style trips. Not an official campus system.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
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
      <body className="font-sans">
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
