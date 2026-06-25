'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTrip } from '@/context/TripContext'
import { useSettings } from '@/hooks/useSettings'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { MetricsCard } from './MetricsCard'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'

export function RouteComparison() {
  const { routes, selectedRouteType, setSelectedRouteType, trip, originSource } = useTrip()
  const { calculateFuelCost } = useSettings()

  if (!routes.fifo || !routes.optimized) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            Route Comparison
          </CardTitle>
          <CardDescription>
            Compare FIFO vs AI-optimized routes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-surface-400 dark:text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-surface-600 dark:text-surface-400 font-medium">No routes calculated yet</p>
            <p className="text-surface-500 dark:text-surface-500 text-sm mt-1">
              Add stops and click &quot;Optimize Route&quot; to see comparison
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const fifoMetrics = {
    ...routes.fifo.metrics,
    estimatedFuelCostAud: calculateFuelCost(routes.fifo.metrics.totalDistanceKm),
  }

  const optimizedMetrics = {
    ...routes.optimized.metrics,
    estimatedFuelCostAud: calculateFuelCost(routes.optimized.metrics.totalDistanceKm),
  }

  const distanceSaved = fifoMetrics.totalDistanceKm - optimizedMetrics.totalDistanceKm
  const distanceSavedPercent = fifoMetrics.totalDistanceKm > 0
    ? (distanceSaved / fifoMetrics.totalDistanceKm) * 100
    : 0

  const timeSaved = fifoMetrics.totalDurationMinutes - optimizedMetrics.totalDurationMinutes
  const timeSavedPercent = fifoMetrics.totalDurationMinutes > 0
    ? (timeSaved / fifoMetrics.totalDurationMinutes) * 100
    : 0

  const costSaved = fifoMetrics.estimatedFuelCostAud - optimizedMetrics.estimatedFuelCostAud

  const hasOptimizationBenefit = distanceSaved > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <CardTitle>Route Comparison</CardTitle>
                <CardDescription>Click to select your preferred route</CardDescription>
              </div>
            </div>
            {hasOptimizationBenefit && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="px-3 py-1.5 rounded-full bg-success-100 dark:bg-success-900/30 border border-success-200 dark:border-success-800"
              >
                <span className="text-sm font-semibold text-success-700 dark:text-success-400">
                  <AnimatedCounter value={distanceSavedPercent} decimals={0} suffix="% savings" />
                </span>
              </motion.div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricsCard
              title="FIFO Route"
              subtitle="Original order"
              metrics={fifoMetrics}
              variant="default"
              isSelected={selectedRouteType === 'fifo'}
              onSelect={() => setSelectedRouteType('fifo')}
            />
            <MetricsCard
              title="Optimized Route"
              subtitle="AI-powered"
              metrics={optimizedMetrics}
              variant="primary"
              isSelected={selectedRouteType === 'optimized'}
              onSelect={() => setSelectedRouteType('optimized')}
              recommended={hasOptimizationBenefit}
            />
          </div>

          <AnimatePresence>
            {hasOptimizationBenefit && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-5 rounded-2xl bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20 border border-success-200 dark:border-success-800">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-success-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-success-800 dark:text-success-300">
                      Estimated Savings with Optimized Route
                    </h4>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="flex items-center gap-2 text-success-600 dark:text-success-400 mb-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span className="text-sm font-medium">Distance</span>
                      </div>
                      <p className="text-xl font-bold text-success-800 dark:text-success-300">
                        <AnimatedCounter value={distanceSaved} decimals={1} suffix=" km" />
                      </p>
                      <p className="text-xs text-success-600 dark:text-success-400 mt-0.5">
                        {distanceSavedPercent.toFixed(0)}% less
                      </p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div className="flex items-center gap-2 text-success-600 dark:text-success-400 mb-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium">Time</span>
                      </div>
                      <p className="text-xl font-bold text-success-800 dark:text-success-300">
                        <AnimatedCounter value={Math.round(timeSaved)} suffix=" min" />
                      </p>
                      <p className="text-xs text-success-600 dark:text-success-400 mt-0.5">
                        {timeSavedPercent.toFixed(0)}% faster
                      </p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <div className="flex items-center gap-2 text-success-600 dark:text-success-400 mb-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium">Fuel Cost</span>
                      </div>
                      <p className="text-xl font-bold text-success-800 dark:text-success-300">
                        <AnimatedCounter value={costSaved} prefix="$" decimals={2} />
                      </p>
                      <p className="text-xs text-success-600 dark:text-success-400 mt-0.5">
                        saved per trip
                      </p>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Origin info */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            originSource === 'live_location'
              ? 'bg-success-50 dark:bg-success-900/20'
              : 'bg-surface-100 dark:bg-surface-800'
          }`}>
            <svg
              className={`w-4 h-4 flex-shrink-0 ${
                originSource === 'live_location'
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-surface-500 dark:text-surface-400'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <span className={`text-xs font-medium ${
                originSource === 'live_location'
                  ? 'text-success-700 dark:text-success-300'
                  : 'text-surface-600 dark:text-surface-400'
              }`}>
                Origin:{' '}
              </span>
              <span className={`text-xs ${
                originSource === 'live_location'
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-surface-500 dark:text-surface-500'
              }`}>
                {trip.origin.address}
                {originSource === 'fallback_monash' && ' (fallback)'}
              </span>
            </div>
          </div>

          <p className="text-xs text-surface-500 dark:text-surface-400 flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            The optimized route uses a nearest-neighbor heuristic. Results are typically 15-35% better than FIFO but not guaranteed to be absolute optimal.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
