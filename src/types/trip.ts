import { Coordinates, OriginSource } from './index'

export type TripStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled'
export type RouteMode = 'fifo' | 'optimized'
export type PersistedStopStatus = 'pending' | 'arrived' | 'picked_up' | 'skipped'

export interface PersistedStop {
  stopId: string
  passengerName: string
  address: string
  displayName?: string
  coordinates: Coordinates
  orderIndex: number
  status: PersistedStopStatus
  arrivedAt?: string
  pickedUpAt?: string
  skippedAt?: string
}

export interface PersistedTrip {
  tripId: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  
  origin: {
    coordinates: Coordinates
    label: string
  }
  originSource: OriginSource
  
  routeMode: RouteMode
  
  stops: PersistedStop[]
  completedStops: string[]
  skippedStops: string[]
  
  totalStops: number
  totalPassengers: number
  
  totalDistanceKm: number
  totalDurationMinutes: number
  
  optimizedDistanceKm?: number
  fifoDistanceKm?: number
  distanceSavedKm?: number
  timeSavedMinutes?: number
  
  driverLocationAvailable: boolean
  status: TripStatus
}

export interface TripSummary {
  tripId: string
  date: string
  stopsCount: number
  completedCount: number
  skippedCount: number
  totalDistanceKm: number
  totalDurationMinutes: number
  distanceSavedKm: number
  timeSavedMinutes: number
  status: TripStatus
  routeMode: RouteMode
}

export interface DailyStats {
  date: string
  tripsCompleted: number
  stopsServed: number
  totalDistanceKm: number
  totalDurationMinutes: number
  distanceSavedKm: number
  timeSavedMinutes: number
  completionRate: number
}

export interface WeeklyStats {
  weekStart: string
  weekEnd: string
  totalTrips: number
  totalStops: number
  totalDistanceKm: number
  totalDurationMinutes: number
  distanceSavedKm: number
  timeSavedMinutes: number
  averageTripDuration: number
  busiestDay: string
  busiestDayTrips: number
}

export interface DestinationStats {
  address: string
  displayName: string
  visitCount: number
  percentage: number
  lastVisited: string
}

export interface HourlyActivity {
  hour: number
  tripCount: number
  stopCount: number
}

export interface AnalyticsSummary {
  today: DailyStats
  thisWeek: WeeklyStats
  topDestinations: DestinationStats[]
  hourlyActivity: HourlyActivity[]
  recentTrips: TripSummary[]
}
