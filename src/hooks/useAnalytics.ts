'use client'

import { useState, useEffect, useCallback } from 'react'
import { tripRepository } from '@/services/tripRepository'
import { DailyStats, WeeklyStats, DestinationStats, HourlyActivity, TripSummary } from '@/types/trip'

export type TimeFilter = 'today' | 'week' | 'month' | 'custom'

interface AnalyticsData {
  todayStats: DailyStats | null
  weeklyStats: WeeklyStats | null
  dailyHistory: DailyStats[]
  topDestinations: DestinationStats[]
  hourlyActivity: HourlyActivity[]
  recentTrips: TripSummary[]
  isLoading: boolean
  error: string | null
}

interface UseAnalyticsReturn extends AnalyticsData {
  timeFilter: TimeFilter
  setTimeFilter: (filter: TimeFilter) => void
  customDateRange: { start: Date; end: Date } | null
  setCustomDateRange: (range: { start: Date; end: Date } | null) => void
  refresh: () => Promise<void>
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function useAnalytics(): UseAnalyticsReturn {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today')
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null)
  const [data, setData] = useState<AnalyticsData>({
    todayStats: null,
    weeklyStats: null,
    dailyHistory: [],
    topDestinations: [],
    hourlyActivity: [],
    recentTrips: [],
    isLoading: true,
    error: null,
  })

  const fetchData = useCallback(async () => {
    setData(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const today = new Date()
      const weekStart = getWeekStart(today)
      
      let startDate: Date
      let endDate: Date = today
      
      switch (timeFilter) {
        case 'today':
          startDate = new Date(today)
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate = weekStart
          break
        case 'month':
          startDate = getMonthStart(today)
          break
        case 'custom':
          if (customDateRange) {
            startDate = customDateRange.start
            endDate = customDateRange.end
          } else {
            startDate = weekStart
          }
          break
        default:
          startDate = weekStart
      }
      
      const [todayStats, weeklyStats, topDestinations, hourlyActivity, recentTrips, dailyHistory] = await Promise.all([
        tripRepository.getDailyStats(today),
        tripRepository.getWeeklyStats(weekStart),
        tripRepository.getTopDestinations(10),
        tripRepository.getHourlyActivity(),
        tripRepository.getTripSummaries(20),
        tripRepository.getDailyStatsRange(startDate, endDate),
      ])

      setData({
        todayStats,
        weeklyStats,
        dailyHistory,
        topDestinations,
        hourlyActivity,
        recentTrips,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load analytics',
      }))
    }
  }, [timeFilter, customDateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    ...data,
    timeFilter,
    setTimeFilter,
    customDateRange,
    setCustomDateRange,
    refresh: fetchData,
  }
}
