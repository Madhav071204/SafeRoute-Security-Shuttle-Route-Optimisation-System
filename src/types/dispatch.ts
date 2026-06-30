import { DriverLocation, Route, Trip } from '@/types'
import { RideRequestStatus } from '@/types/rideRequest'

export type DispatchTripStatus = 'draft' | 'active' | 'completed' | 'cancelled'

export type DispatchStopStatus = Extract<
  RideRequestStatus,
  | 'assigned'
  | 'driver_on_way'
  | 'arrived'
  | 'picked_up'
  | 'completed'
  | 'cancelled'
  | 'no_show'
>

export interface DispatchStopState {
  stopId: string // for dispatch trips we use RideRequest.id as Stop.id
  status: DispatchStopStatus
  arrivedAt?: string
  pickedUpAt?: string
  completedAt?: string
  cancelledAt?: string
  noShowAt?: string
}

export interface DispatchTrip {
  id: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  status: DispatchTripStatus

  trip: Trip
  routes: { fifo: Route | null; optimized: Route | null }
  selectedRouteType: 'fifo' | 'optimized'

  driverLocation?: DriverLocation | null
  stops: DispatchStopState[]
}

