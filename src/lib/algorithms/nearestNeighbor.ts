import { Coordinates } from '@/types'
import { haversineDistance } from './haversine'

interface StopWithCoordinates {
  id: string
  coordinates: Coordinates
}

/**
 * Nearest-neighbor heuristic for route optimization.
 * 
 * This is a greedy algorithm that builds a route by always visiting
 * the closest unvisited stop. It does NOT guarantee the optimal solution,
 * but typically produces routes within 10-25% of optimal.
 * 
 * Time complexity: O(n²)
 * 
 * @param origin - Starting coordinates
 * @param stops - Array of stops with their coordinates
 * @returns Ordered array of stop IDs representing the optimized route
 */
export function nearestNeighborRoute(
  origin: Coordinates,
  stops: StopWithCoordinates[]
): string[] {
  if (stops.length === 0) return []
  if (stops.length === 1) return [stops[0].id]

  const orderedIds: string[] = []
  const unvisited = new Set(stops.map((s) => s.id))
  const stopMap = new Map(stops.map((s) => [s.id, s]))

  let currentPosition = origin

  while (unvisited.size > 0) {
    let nearestId: string | null = null
    let nearestDistance = Infinity

    // Find the closest unvisited stop
    for (const id of unvisited) {
      const stop = stopMap.get(id)!
      const distance = haversineDistance(currentPosition, stop.coordinates)

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestId = id
      }
    }

    if (nearestId) {
      orderedIds.push(nearestId)
      unvisited.delete(nearestId)
      currentPosition = stopMap.get(nearestId)!.coordinates
    }
  }

  return orderedIds
}

/**
 * FIFO route - returns stops in the order they were provided.
 * This is the baseline for comparison.
 */
export function fifoRoute(stops: StopWithCoordinates[]): string[] {
  return stops.map((s) => s.id)
}

/**
 * Calculate the total distance for a given route order.
 */
export function calculateTotalDistance(
  origin: Coordinates,
  stops: StopWithCoordinates[],
  orderedIds: string[]
): number {
  if (orderedIds.length === 0) return 0

  const stopMap = new Map(stops.map((s) => [s.id, s]))
  let totalDistance = 0
  let currentPosition = origin

  for (const id of orderedIds) {
    const stop = stopMap.get(id)
    if (stop) {
      totalDistance += haversineDistance(currentPosition, stop.coordinates)
      currentPosition = stop.coordinates
    }
  }

  return totalDistance
}
