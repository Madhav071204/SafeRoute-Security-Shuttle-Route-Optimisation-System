'use client'

import { motion } from 'framer-motion'
import { useTrip } from '@/context/TripContext'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/Button'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { DriverModeView } from './DriverModeView'

export function ExecutionView() {
  const {
    trip,
    routes,
    selectedRouteType,
    endExecution,
  } = useTrip()
  const { calculateFuelCost } = useSettings()

  const selectedRoute = selectedRouteType === 'fifo' ? routes.fifo : routes.optimized
  if (!selectedRoute) return null

  const { orderedStopIds, metrics } = selectedRoute
  const totalStops = orderedStopIds.length
  const isComplete = trip.status === 'completed'

  if (isComplete) {
    const fuelCost = calculateFuelCost(metrics.totalDistanceKm)

    return (
      <div className="min-h-screen bg-gradient-to-br from-success-50 via-success-100 to-primary-50 dark:from-surface-900 dark:via-surface-800 dark:to-primary-900/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="w-full max-w-lg"
        >
          <div className="bg-white dark:bg-surface-800 rounded-3xl shadow-premium overflow-hidden">
            <div className="relative bg-gradient-to-br from-success-500 to-success-600 px-8 py-12 text-center overflow-hidden">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="relative z-10"
              >
                <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-white/30">
                  <motion.svg
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="w-12 h-12 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                  >
                    <motion.path
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </motion.svg>
                </div>
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold text-white mb-2"
                >
                  Trip Complete!
                </motion.h2>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-success-100 text-lg"
                >
                  All {totalStops} stops delivered successfully
                </motion.p>
              </motion.div>

              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full" />
            </div>

            <div className="px-8 py-8">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <h3 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-4">
                  Trip Summary
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-2xl bg-surface-50 dark:bg-surface-700/50">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <p className="text-xl font-bold text-surface-900 dark:text-white">
                      <AnimatedCounter value={metrics.totalDistanceKm} decimals={1} suffix="km" />
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">Distance</p>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-surface-50 dark:bg-surface-700/50">
                    <div className="w-10 h-10 rounded-xl bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-xl font-bold text-surface-900 dark:text-white">
                      <AnimatedCounter value={Math.round(metrics.totalDurationMinutes)} suffix="min" />
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">Duration</p>
                  </div>
                  <div className="text-center p-4 rounded-2xl bg-surface-50 dark:bg-surface-700/50">
                    <div className="w-10 h-10 rounded-xl bg-success-100 dark:bg-success-900/30 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-xl font-bold text-surface-900 dark:text-white">
                      <AnimatedCounter value={fuelCost} prefix="$" decimals={2} />
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">Fuel Cost</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8"
              >
                <Button 
                  onClick={endExecution} 
                  variant="primary" 
                  size="lg" 
                  fullWidth
                  leftIcon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                >
                  Start New Trip
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center text-xs text-surface-400 dark:text-surface-500 mt-4"
              >
                {selectedRouteType === 'optimized' ? 'Optimized' : 'FIFO'} route completed
              </motion.p>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return <DriverModeView />
}
