import { PersistedTrip, TripSummary, DailyStats, WeeklyStats, DestinationStats, HourlyActivity, TripStatus } from '@/types/trip'
import { DispatchStopStatus, DispatchTrip } from '@/types/dispatch'
import { DriverLocation } from '@/types'

const STORAGE_KEY = 'saferoute_trips'
const STORAGE_VERSION = 1
const DISPATCH_STORAGE_KEY = 'saferoute_dispatch'
const DISPATCH_STORAGE_VERSION = 1

const EVENT_KEY_TRIPS = 'trip_history'
const EVENT_KEY_DISPATCH = 'dispatch_trip'

interface StorageData {
  version: number
  trips: PersistedTrip[]
}

interface DispatchStorageData {
  version: number
  activeTrip: DispatchTrip | null
}

function isClient(): boolean {
  return typeof window !== 'undefined'
}

function notify(key: string): void {
  if (!isClient()) return
  window.dispatchEvent(new CustomEvent('saferoute:repo', { detail: { key } }))
}

function getStorageData(): StorageData {
  if (!isClient()) {
    return { version: STORAGE_VERSION, trips: [] }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { version: STORAGE_VERSION, trips: [] }
    }
    
    const data = JSON.parse(raw) as StorageData
    if (data.version !== STORAGE_VERSION) {
      return { version: STORAGE_VERSION, trips: [] }
    }
    
    return data
  } catch {
    console.error('Failed to parse trip storage')
    return { version: STORAGE_VERSION, trips: [] }
  }
}

function setStorageData(data: StorageData): void {
  if (!isClient()) return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    notify(EVENT_KEY_TRIPS)
  } catch (e) {
    console.error('Failed to save trip storage:', e)
  }
}

function getDispatchStorageData(): DispatchStorageData {
  if (!isClient()) {
    return { version: DISPATCH_STORAGE_VERSION, activeTrip: null }
  }

  try {
    const raw = localStorage.getItem(DISPATCH_STORAGE_KEY)
    if (!raw) return { version: DISPATCH_STORAGE_VERSION, activeTrip: null }
    const parsed = JSON.parse(raw) as DispatchStorageData
    if (parsed.version !== DISPATCH_STORAGE_VERSION) {
      return { version: DISPATCH_STORAGE_VERSION, activeTrip: null }
    }
    return parsed
  } catch {
    return { version: DISPATCH_STORAGE_VERSION, activeTrip: null }
  }
}

function setDispatchStorageData(data: DispatchStorageData): void {
  if (!isClient()) return
  try {
    localStorage.setItem(DISPATCH_STORAGE_KEY, JSON.stringify(data))
    notify(EVENT_KEY_DISPATCH)
  } catch (e) {
    console.error('Failed to save dispatch storage:', e)
  }
}

export const tripRepository = {
  async saveTrip(trip: PersistedTrip): Promise<void> {
    const data = getStorageData()
    const existingIndex = data.trips.findIndex(t => t.tripId === trip.tripId)
    
    if (existingIndex >= 0) {
      data.trips[existingIndex] = trip
    } else {
      data.trips.unshift(trip)
    }
    
    if (data.trips.length > 500) {
      data.trips = data.trips.slice(0, 500)
    }
    
    setStorageData(data)
  },

  async getTrip(tripId: string): Promise<PersistedTrip | null> {
    const data = getStorageData()
    return data.trips.find(t => t.tripId === tripId) || null
  },

  async getAllTrips(): Promise<PersistedTrip[]> {
    const data = getStorageData()
    return data.trips
  },

  async getTripsByDateRange(startDate: Date, endDate: Date): Promise<PersistedTrip[]> {
    const data = getStorageData()
    const start = startDate.toISOString()
    const end = endDate.toISOString()
    
    return data.trips.filter(t => {
      const created = t.createdAt
      return created >= start && created <= end
    })
  },

  async getCompletedTrips(): Promise<PersistedTrip[]> {
    const data = getStorageData()
    return data.trips.filter(t => t.status === 'completed')
  },

  async deleteTrip(tripId: string): Promise<void> {
    const data = getStorageData()
    data.trips = data.trips.filter(t => t.tripId !== tripId)
    setStorageData(data)
  },

  async clearAllTrips(): Promise<void> {
    setStorageData({ version: STORAGE_VERSION, trips: [] })
  },

  async getTripSummaries(limit = 50): Promise<TripSummary[]> {
    const data = getStorageData()
    return data.trips.slice(0, limit).map(tripToSummary)
  },

  async getDailyStats(date: Date): Promise<DailyStats> {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)
    
    const trips = await this.getTripsByDateRange(dayStart, dayEnd)
    const completedTrips = trips.filter(t => t.status === 'completed')
    
    const totalStops = completedTrips.reduce((sum, t) => sum + t.totalStops, 0)
    const completedStops = completedTrips.reduce((sum, t) => sum + t.completedStops.length, 0)
    
    return {
      date: dayStart.toISOString().split('T')[0],
      tripsCompleted: completedTrips.length,
      stopsServed: completedStops,
      totalDistanceKm: completedTrips.reduce((sum, t) => sum + t.totalDistanceKm, 0),
      totalDurationMinutes: completedTrips.reduce((sum, t) => sum + t.totalDurationMinutes, 0),
      distanceSavedKm: completedTrips.reduce((sum, t) => sum + (t.distanceSavedKm || 0), 0),
      timeSavedMinutes: completedTrips.reduce((sum, t) => sum + (t.timeSavedMinutes || 0), 0),
      completionRate: totalStops > 0 ? (completedStops / totalStops) * 100 : 100,
    }
  },

  async getWeeklyStats(weekStart: Date): Promise<WeeklyStats> {
    const start = new Date(weekStart)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    
    const trips = await this.getTripsByDateRange(start, end)
    const completedTrips = trips.filter(t => t.status === 'completed')
    
    const tripsByDay: Record<string, number> = {}
    completedTrips.forEach(t => {
      const day = t.createdAt.split('T')[0]
      tripsByDay[day] = (tripsByDay[day] || 0) + 1
    })
    
    let busiestDay = ''
    let busiestDayTrips = 0
    Object.entries(tripsByDay).forEach(([day, count]) => {
      if (count > busiestDayTrips) {
        busiestDay = day
        busiestDayTrips = count
      }
    })
    
    const totalDuration = completedTrips.reduce((sum, t) => sum + t.totalDurationMinutes, 0)
    
    return {
      weekStart: start.toISOString().split('T')[0],
      weekEnd: end.toISOString().split('T')[0],
      totalTrips: completedTrips.length,
      totalStops: completedTrips.reduce((sum, t) => sum + t.completedStops.length, 0),
      totalDistanceKm: completedTrips.reduce((sum, t) => sum + t.totalDistanceKm, 0),
      totalDurationMinutes: totalDuration,
      distanceSavedKm: completedTrips.reduce((sum, t) => sum + (t.distanceSavedKm || 0), 0),
      timeSavedMinutes: completedTrips.reduce((sum, t) => sum + (t.timeSavedMinutes || 0), 0),
      averageTripDuration: completedTrips.length > 0 ? totalDuration / completedTrips.length : 0,
      busiestDay,
      busiestDayTrips,
    }
  },

  async getTopDestinations(limit = 10): Promise<DestinationStats[]> {
    const data = getStorageData()
    const completedTrips = data.trips.filter(t => t.status === 'completed')
    
    const destinations: Record<string, { count: number; displayName: string; lastVisited: string }> = {}
    
    completedTrips.forEach(trip => {
      trip.stops.forEach(stop => {
        if (stop.status === 'picked_up' || stop.status === 'arrived') {
          const key = stop.address.toLowerCase().trim()
          if (!destinations[key]) {
            destinations[key] = {
              count: 0,
              displayName: stop.displayName || stop.address,
              lastVisited: trip.completedAt || trip.createdAt,
            }
          }
          destinations[key].count++
          if (trip.completedAt && trip.completedAt > destinations[key].lastVisited) {
            destinations[key].lastVisited = trip.completedAt
          }
        }
      })
    })
    
    const totalVisits = Object.values(destinations).reduce((sum, d) => sum + d.count, 0)
    
    return Object.entries(destinations)
      .map(([address, data]) => ({
        address,
        displayName: data.displayName,
        visitCount: data.count,
        percentage: totalVisits > 0 ? (data.count / totalVisits) * 100 : 0,
        lastVisited: data.lastVisited,
      }))
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, limit)
  },

  async getHourlyActivity(): Promise<HourlyActivity[]> {
    const data = getStorageData()
    const completedTrips = data.trips.filter(t => t.status === 'completed')
    
    const hourly: HourlyActivity[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      tripCount: 0,
      stopCount: 0,
    }))
    
    completedTrips.forEach(trip => {
      if (trip.startedAt) {
        const hour = new Date(trip.startedAt).getHours()
        hourly[hour].tripCount++
        hourly[hour].stopCount += trip.completedStops.length
      }
    })
    
    return hourly
  },

  async getDailyStatsRange(startDate: Date, endDate: Date): Promise<DailyStats[]> {
    const stats: DailyStats[] = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      const dailyStats = await this.getDailyStats(current)
      stats.push(dailyStats)
      current.setDate(current.getDate() + 1)
    }
    
    return stats
  },
}

export function subscribeDispatchTrip(cb: () => void): () => void {
  if (!isClient()) return () => {}

  const onCustom = (e: Event) => {
    const ev = e as CustomEvent<{ key?: string }>
    if (ev.detail?.key === EVENT_KEY_DISPATCH) cb()
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === DISPATCH_STORAGE_KEY) cb()
  }

  window.addEventListener('saferoute:repo', onCustom)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('saferoute:repo', onCustom)
    window.removeEventListener('storage', onStorage)
  }
}

export const dispatchTripRepository = {
  async getActiveTrip(): Promise<DispatchTrip | null> {
    const data = getDispatchStorageData()
    return data.activeTrip
  },

  async setActiveTrip(trip: DispatchTrip): Promise<void> {
    setDispatchStorageData({ version: DISPATCH_STORAGE_VERSION, activeTrip: trip })
  },

  async clearActiveTrip(): Promise<void> {
    setDispatchStorageData({ version: DISPATCH_STORAGE_VERSION, activeTrip: null })
  },

  async updateDriverLocation(location: DriverLocation | null): Promise<void> {
    const data = getDispatchStorageData()
    if (!data.activeTrip) return
    const updated: DispatchTrip = { ...data.activeTrip, driverLocation: location }
    setDispatchStorageData({ ...data, activeTrip: updated })
  },

  async markTripStarted(startedAtIso: string = new Date().toISOString()): Promise<void> {
    const data = getDispatchStorageData()
    if (!data.activeTrip) return
    const updated: DispatchTrip = {
      ...data.activeTrip,
      status: 'active',
      startedAt: data.activeTrip.startedAt || startedAtIso,
    }
    setDispatchStorageData({ ...data, activeTrip: updated })
  },

  async markTripCompleted(completedAtIso: string = new Date().toISOString()): Promise<void> {
    const data = getDispatchStorageData()
    if (!data.activeTrip) return
    const updated: DispatchTrip = {
      ...data.activeTrip,
      status: 'completed',
      completedAt: completedAtIso,
    }
    setDispatchStorageData({ ...data, activeTrip: updated })
  },

  async updateStopStatus(stopId: string, status: DispatchStopStatus): Promise<void> {
    const data = getDispatchStorageData()
    if (!data.activeTrip) return
    const at = new Date().toISOString()

    const stops = data.activeTrip.stops.map((s) => {
      if (s.stopId !== stopId) return s
      const next = { ...s, status }
      if (status === 'arrived') next.arrivedAt = next.arrivedAt || at
      if (status === 'picked_up') next.pickedUpAt = next.pickedUpAt || at
      if (status === 'completed') next.completedAt = next.completedAt || at
      if (status === 'cancelled') next.cancelledAt = next.cancelledAt || at
      if (status === 'no_show') next.noShowAt = next.noShowAt || at
      return next
    })

    setDispatchStorageData({
      ...data,
      activeTrip: {
        ...data.activeTrip,
        stops,
      },
    })
  },
}

function tripToSummary(trip: PersistedTrip): TripSummary {
  return {
    tripId: trip.tripId,
    date: trip.createdAt,
    stopsCount: trip.totalStops,
    completedCount: trip.completedStops.length,
    skippedCount: trip.skippedStops.length,
    totalDistanceKm: trip.totalDistanceKm,
    totalDurationMinutes: trip.totalDurationMinutes,
    distanceSavedKm: trip.distanceSavedKm || 0,
    timeSavedMinutes: trip.timeSavedMinutes || 0,
    status: trip.status,
    routeMode: trip.routeMode,
  }
}
