'use client'

import { motion } from 'framer-motion'
import { useAnalytics } from '@/hooks/useAnalytics'
import { StatCard } from '@/components/dashboard/StatCard'
import { SimpleBarChart } from '@/components/dashboard/SimpleBarChart'
import { TopDestinations } from '@/components/dashboard/TopDestinations'
import { WeeklySummary } from '@/components/dashboard/WeeklySummary'
import { TimeFilter } from '@/components/dashboard/TimeFilter'
import { RecentTrips } from '@/components/dashboard/RecentTrips'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function DashboardPage() {
  const {
    todayStats,
    weeklyStats,
    dailyHistory,
    topDestinations,
    recentTrips,
    isLoading,
    error,
    timeFilter,
    setTimeFilter,
    refresh,
  } = useAnalytics()

  const formatDayLabel = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-AU', { weekday: 'short' })
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </motion.div>
              <h1 className="text-3xl md:text-4xl font-bold text-surface-900 dark:text-white mb-2">
                Shuttle Dashboard
              </h1>
              <p className="text-surface-600 dark:text-surface-400 text-lg max-w-2xl">
                Track shuttle operations, efficiency gains, and popular destinations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <TimeFilter value={timeFilter} onChange={setTimeFilter} />
              <button
                onClick={refresh}
                disabled={isLoading}
                className="p-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors"
                title="Refresh data"
              >
                <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-6">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 text-sm">
            {error}
          </div>
        )}

        {isLoading && !todayStats ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <svg className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-surface-500 dark:text-surface-400">Loading analytics...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Trips Today"
                value={todayStats?.tripsCompleted || 0}
                subtitle={`${todayStats?.stopsServed || 0} stops served`}
                color="primary"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
              />
              
              <StatCard
                title="Distance Today"
                value={`${(todayStats?.totalDistanceKm || 0).toFixed(1)} km`}
                subtitle={`${(todayStats?.totalDurationMinutes || 0).toFixed(0)} min driving`}
                color="neutral"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                }
              />
              
              <StatCard
                title="Distance Saved"
                value={`${(todayStats?.distanceSavedKm || 0).toFixed(1)} km`}
                subtitle="via route optimization"
                color="success"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                }
              />
              
              <StatCard
                title="Time Saved"
                value={`${(todayStats?.timeSavedMinutes || 0).toFixed(0)} min`}
                subtitle={`${(todayStats?.completionRate || 100).toFixed(0)}% completion rate`}
                color="warning"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card variant="glass" className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Activity Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SimpleBarChart
                      title="Trips per Day"
                      data={dailyHistory.map(d => ({
                        label: formatDayLabel(d.date),
                        value: d.tripsCompleted,
                      }))}
                      color="primary"
                    />
                    <SimpleBarChart
                      title="Stops per Day"
                      data={dailyHistory.map(d => ({
                        label: formatDayLabel(d.date),
                        value: d.stopsServed,
                      }))}
                      color="success"
                    />
                  </div>
                </CardContent>
              </Card>

              <WeeklySummary stats={weeklyStats} topDestinations={topDestinations} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Efficiency Gains</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SimpleBarChart
                      title="Distance Saved (km)"
                      data={dailyHistory.map(d => ({
                        label: formatDayLabel(d.date),
                        value: d.distanceSavedKm,
                      }))}
                      color="success"
                      formatValue={(v) => v.toFixed(1)}
                    />
                    <SimpleBarChart
                      title="Time Saved (min)"
                      data={dailyHistory.map(d => ({
                        label: formatDayLabel(d.date),
                        value: d.timeSavedMinutes,
                      }))}
                      color="warning"
                      formatValue={(v) => v.toFixed(0)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Popular Destinations</CardTitle>
                </CardHeader>
                <CardContent>
                  <TopDestinations destinations={topDestinations} maxItems={5} />
                </CardContent>
              </Card>
            </div>

            <Card variant="glass">
              <CardHeader>
                <CardTitle>Trip History</CardTitle>
              </CardHeader>
              <CardContent>
                <RecentTrips trips={recentTrips} maxItems={10} />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
