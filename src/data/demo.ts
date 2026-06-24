import { Stop } from '@/types'

/**
 * Demo data for portfolio demonstrations.
 * These are fictional addresses around the Clayton/Monash area.
 * Street numbers are made up but suburbs are real.
 */
export const DEMO_STOPS: Omit<Stop, 'id' | 'geocodeStatus'>[] = [
  {
    passengerName: 'Alex',
    address: '42 Clayton Road, Clayton VIC 3168',
    coordinates: null,
  },
  {
    passengerName: 'Sam',
    address: '15 Centre Road, Bentleigh VIC 3204',
    coordinates: null,
  },
  {
    passengerName: 'Jordan',
    address: '78 Dandenong Road, Oakleigh VIC 3166',
    coordinates: null,
  },
  {
    passengerName: 'Taylor',
    address: '23 Princes Highway, Dandenong VIC 3175',
    coordinates: null,
  },
  {
    passengerName: 'Morgan',
    address: '156 Springvale Road, Springvale VIC 3171',
    coordinates: null,
  },
  {
    passengerName: 'Casey',
    address: '89 Blackburn Road, Mount Waverley VIC 3149',
    coordinates: null,
  },
  {
    passengerName: 'Riley',
    address: '34 Warrigal Road, Chadstone VIC 3148',
    coordinates: null,
  },
  {
    passengerName: 'Quinn',
    address: '67 Huntingdale Road, Huntingdale VIC 3166',
    coordinates: null,
  },
]

/**
 * Generate a unique ID for a stop.
 */
export function generateStopId(): string {
  return `stop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create demo stops with generated IDs.
 */
export function createDemoStops(): Stop[] {
  return DEMO_STOPS.map((stop) => ({
    ...stop,
    id: generateStopId(),
    geocodeStatus: 'pending' as const,
  }))
}
