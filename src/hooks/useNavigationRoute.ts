'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Coordinates,
  DirectionRoute,
  ActiveNavigationState,
  NavigationConfig,
  DriverLocation,
} from '@/types'
import {
  fetchDirections,
  calculateDistanceToPoint,
  findCurrentStepIndex,
  isOffRoute,
  getRemainingDistance,
  getRemainingDuration,
} from '@/lib/directions'

const DEFAULT_CONFIG: NavigationConfig = {
  maneuverThresholdMeters: 30,
  offRouteThresholdMeters: 50,
  recalculationCooldownMs: 5000,
}

interface UseNavigationRouteProps {
  driverLocation: DriverLocation | null
  destination: Coordinates | null
  destinationStopId: string | null
  isActive: boolean
  config?: Partial<NavigationConfig>
  onArrival?: () => void
}

interface UseNavigationRouteReturn {
  navigation: ActiveNavigationState
  fetchRoute: () => Promise<void>
  clearNavigation: () => void
  error: string | null
}

const initialNavigationState: ActiveNavigationState = {
  isNavigating: false,
  currentStepIndex: 0,
  currentLegIndex: 0,
  route: null,
  destinationStopId: null,
  distanceToNextManeuver: null,
  distanceToDestination: null,
  etaToDestination: null,
  isRecalculating: false,
  isOffRoute: false,
  lastRecalculatedAt: null,
}

export function useNavigationRoute({
  driverLocation,
  destination,
  destinationStopId,
  isActive,
  config = {},
  onArrival,
}: UseNavigationRouteProps): UseNavigationRouteReturn {
  const [navigation, setNavigation] = useState<ActiveNavigationState>(
    initialNavigationState
  )
  const [error, setError] = useState<string | null>(null)

  const mergedConfig: NavigationConfig = { ...DEFAULT_CONFIG, ...config }
  const lastFetchRef = useRef<number>(0)
  const isFetchingRef = useRef<boolean>(false)

  const fetchRoute = useCallback(async () => {
    if (!driverLocation || !destination) {
      setError('Driver location or destination not available')
      return
    }

    if (isFetchingRef.current) return

    const now = Date.now()
    if (
      navigation.lastRecalculatedAt &&
      now - navigation.lastRecalculatedAt < mergedConfig.recalculationCooldownMs
    ) {
      return
    }

    isFetchingRef.current = true
    setNavigation((prev) => ({ ...prev, isRecalculating: true }))
    setError(null)

    try {
      const origin: Coordinates = driverLocation.coordinates
      const response = await fetchDirections(origin, destination)

      if (!response.success || !response.route) {
        setError(response.error || 'Failed to fetch directions')
        setNavigation((prev) => ({
          ...prev,
          isRecalculating: false,
          isOffRoute: false,
        }))
        return
      }

      lastFetchRef.current = now

      setNavigation({
        isNavigating: true,
        currentStepIndex: 0,
        currentLegIndex: 0,
        route: response.route,
        destinationStopId,
        distanceToNextManeuver:
          response.route.steps.length > 0
            ? calculateDistanceToPoint(origin, response.route.steps[0].location)
            : null,
        distanceToDestination: response.route.distance,
        etaToDestination: response.route.duration,
        isRecalculating: false,
        isOffRoute: false,
        lastRecalculatedAt: now,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
      setNavigation((prev) => ({
        ...prev,
        isRecalculating: false,
      }))
    } finally {
      isFetchingRef.current = false
    }
  }, [
    driverLocation,
    destination,
    destinationStopId,
    mergedConfig.recalculationCooldownMs,
    navigation.lastRecalculatedAt,
  ])

  const clearNavigation = useCallback(() => {
    setNavigation(initialNavigationState)
    setError(null)
    lastFetchRef.current = 0
  }, [])

  // Update navigation state based on driver location
  useEffect(() => {
    if (!isActive || !navigation.isNavigating || !navigation.route || !driverLocation) {
      return
    }

    const currentPos = driverLocation.coordinates

    // Check if driver is off route
    const offRoute = isOffRoute(
      currentPos,
      navigation.route,
      mergedConfig.offRouteThresholdMeters
    )

    if (offRoute && !navigation.isRecalculating) {
      setNavigation((prev) => ({ ...prev, isOffRoute: true }))
      fetchRoute()
      return
    }

    // Find current step and distance
    const { stepIndex, distanceToManeuver } = findCurrentStepIndex(
      currentPos,
      navigation.route.steps,
      navigation.currentStepIndex
    )

    // Calculate remaining distance and ETA
    const remainingDistance = getRemainingDistance(navigation.route, stepIndex)
    const remainingDuration = getRemainingDuration(navigation.route, stepIndex)

    // Check if arrived at destination (within 30m of final step)
    const lastStep = navigation.route.steps[navigation.route.steps.length - 1]
    if (lastStep) {
      const distanceToEnd = calculateDistanceToPoint(currentPos, lastStep.location)
      if (distanceToEnd < 30 && onArrival) {
        onArrival()
        return
      }
    }

    setNavigation((prev) => ({
      ...prev,
      currentStepIndex: stepIndex,
      distanceToNextManeuver: distanceToManeuver,
      distanceToDestination: remainingDistance,
      etaToDestination: remainingDuration,
      isOffRoute: false,
    }))
  }, [
    driverLocation,
    isActive,
    navigation.isNavigating,
    navigation.route,
    navigation.currentStepIndex,
    navigation.isRecalculating,
    mergedConfig.offRouteThresholdMeters,
    fetchRoute,
    onArrival,
  ])

  // Fetch initial route when destination changes
  useEffect(() => {
    if (isActive && destination && driverLocation && !navigation.route) {
      fetchRoute()
    }
  }, [isActive, destination, driverLocation, navigation.route, fetchRoute])

  // Clear navigation when becoming inactive
  useEffect(() => {
    if (!isActive && navigation.isNavigating) {
      clearNavigation()
    }
  }, [isActive, navigation.isNavigating, clearNavigation])

  return {
    navigation,
    fetchRoute,
    clearNavigation,
    error,
  }
}
