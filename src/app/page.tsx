'use client'

import { motion } from 'framer-motion'
import { useTrip } from '@/context/TripContext'
import { TripPanel } from '@/components/trip/TripPanel'
import { MapView } from '@/components/map/MapView'
import { RouteComparison } from '@/components/results/RouteComparison'
import { ExecutionView } from '@/components/execution/ExecutionView'
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

export default function Home() {
  const { trip } = useTrip()

  if (trip.status === 'executing' || trip.status === 'completed') {
    return <ExecutionView />
  }

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <div className="bg-mesh-light dark:bg-mesh-dark">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 pt-8 pb-6"
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium mb-3"
              >
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                AI-Powered Optimization
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-white mb-2">
                Plan Your Route
              </h1>
              <p className="text-surface-600 dark:text-surface-400 text-lg max-w-2xl">
                Add passenger destinations, optimize with AI, and start your trip with turn-by-turn guidance.
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="hidden md:flex items-center gap-3 bg-white/60 dark:bg-surface-800/60 backdrop-blur-sm px-4 py-3 rounded-2xl border border-surface-200 dark:border-surface-700"
            >
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-surface-900 dark:text-white">Save up to 35%</p>
                  <p className="text-surface-500 dark:text-surface-400 text-xs">on travel distance</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <TripPanel />
          </motion.div>

          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Route Preview</CardTitle>
                    <CardDescription>
                      Visualize stops and compare route options
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400">
                      <span className="w-3 h-0.5 bg-surface-400 rounded" />
                      FIFO
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400">
                      <span className="w-3 h-0.5 bg-primary-500 rounded" />
                      Optimized
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[400px] lg:h-[450px]">
                  <MapView />
                </div>
              </CardContent>
            </Card>

            <RouteComparison />
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
