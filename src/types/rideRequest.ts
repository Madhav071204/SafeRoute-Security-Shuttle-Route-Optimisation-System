import { Coordinates } from '@/types'

export type RideRequestStatus =
  | 'pending'
  | 'assigned'
  | 'driver_on_way'
  | 'arrived'
  | 'picked_up'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface RideLocation {
  label: string
  address: string
  lat: number
  lng: number
}

export interface RideRequest {
  id: string
  passengerName: string
  contact?: string
  pickup: RideLocation
  destination: RideLocation
  notes?: string
  status: RideRequestStatus
  createdAt: string
  assignedTripId?: string
  assignedAt?: string
  pickedUpAt?: string
  completedAt?: string
}

export function rideLocationToCoordinates(loc: RideLocation): Coordinates {
  return { lat: loc.lat, lng: loc.lng }
}

