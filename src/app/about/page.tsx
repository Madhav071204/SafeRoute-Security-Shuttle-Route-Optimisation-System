'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function AboutPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-mesh-light dark:bg-mesh-dark">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-surface-900 dark:text-white">About SafeRoute</h1>
          <p className="text-surface-600 dark:text-surface-400 mt-2">
            Learn about how SafeRoute optimizes shuttle routes
          </p>
        </div>
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={itemVariants}>
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle>What is SafeRoute?</CardTitle>
                    <CardDescription>AI-powered route optimization</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-surface-600 dark:text-surface-400 leading-relaxed">
                  SafeRoute is a route optimization tool designed for university security shuttles. 
                  Instead of dropping students off in the order they boarded (FIFO), SafeRoute calculates 
                  a more efficient route that minimizes total travel distance and time, reducing fuel costs
                  and carbon emissions.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle>How It Works</CardTitle>
                    <CardDescription>Nearest-neighbor algorithm</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-surface-600 dark:text-surface-400">
                  SafeRoute uses a <strong className="text-surface-900 dark:text-white">nearest-neighbor heuristic</strong> to optimize routes:
                </p>
                <ol className="space-y-3 ml-4">
                  {[
                    'Start at the origin (university)',
                    'Find the unvisited stop closest to the current position',
                    'Travel to that stop and mark it as visited',
                    'Repeat until all stops have been visited',
                  ].map((step, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary-700 dark:text-primary-300">{index + 1}</span>
                      </div>
                      <span className="text-surface-600 dark:text-surface-400">{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="p-4 rounded-xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-warning-800 dark:text-warning-300">
                      <strong>Note:</strong> This is a heuristic algorithm that finds good solutions quickly, 
                      but it does not guarantee the absolute optimal route. In practice, it typically 
                      reduces distance by 15-35% compared to FIFO ordering.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} id="privacy">
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle>Privacy Notice</CardTitle>
                    <CardDescription>How we handle your data</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-surface-900 dark:text-white mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    SafeRoute does not store your trip data
                  </h4>
                  <ul className="space-y-2 ml-6">
                    {[
                      'Passenger addresses are held in browser memory only',
                      'Addresses are cleared when you close the browser tab',
                      'No addresses are saved to your device or our servers',
                    ].map((item, index) => (
                      <li key={index} className="text-surface-600 dark:text-surface-400 text-sm flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-surface-400 mt-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-surface-900 dark:text-white mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-warning-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    However, addresses ARE sent to third-party services
                  </h4>
                  <ul className="space-y-2 ml-6">
                    {[
                      'Mapbox Geocoding API (to convert addresses to coordinates)',
                      'Mapbox Directions API (to calculate driving routes)',
                    ].map((item, index) => (
                      <li key={index} className="text-surface-600 dark:text-surface-400 text-sm flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-surface-400 mt-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-surface-500 dark:text-surface-400 pt-2">
                  These services have their own privacy policies. Do not enter addresses for real 
                  students in a production context.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-danger-600 dark:text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle>Disclaimer</CardTitle>
                    <CardDescription>Important information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-surface-600 dark:text-surface-400">
                  This is a <strong className="text-surface-900 dark:text-white">student portfolio project</strong> and proof-of-concept only. 
                  SafeRoute is not affiliated with Monash University or its security services. Do not use this 
                  application for actual student transport operations.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle>Tech Stack</CardTitle>
                    <CardDescription>Built with modern technologies</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Frontend', value: 'Next.js, TypeScript, Tailwind CSS', icon: '🎨' },
                    { label: 'Maps', value: 'Mapbox GL JS', icon: '🗺️' },
                    { label: 'Algorithms', value: 'Nearest-neighbor heuristic', icon: '🧮' },
                    { label: 'Deployment', value: 'Vercel', icon: '🚀' },
                  ].map((item) => (
                    <div key={item.label} className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{item.icon}</span>
                        <p className="font-medium text-surface-900 dark:text-white text-sm">{item.label}</p>
                      </div>
                      <p className="text-surface-500 dark:text-surface-400 text-xs">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
