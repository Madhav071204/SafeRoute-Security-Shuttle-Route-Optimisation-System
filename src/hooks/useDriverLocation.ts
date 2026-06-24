'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { DriverLocation, Coordinates } from '@/types'

interface UseDriverLocationReturn {
  location: DriverLocation | null
  error: string | null
  isTracking: boolean
  hasPermission: boolean | null
  requestPermission: () => void
  startTracking: () => void
  stopTracking: () => void
}

export function useDriverLocation(): UseDriverLocationReturn {
  const [location, setLocation] = useState<DriverLocation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const watchIdRef = useRef<number | null>(null)

  const handlePositionSuccess = useCallback((position: GeolocationPosition) => {
    const newLocation: DriverLocation = {
      coordinates: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      },
      heading: position.coords.heading,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    }
    setLocation(newLocation)
    setError(null)
    setHasPermission(true)
  }, [])

  const handlePositionError = useCallback((err: GeolocationPositionError) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setError('Location permission denied. Please enable location access.')
        setHasPermission(false)
        break
      case err.POSITION_UNAVAILABLE:
        setError('Location information is unavailable.')
        break
      case err.TIMEOUT:
        setError('Location request timed out.')
        break
      default:
        setError('An unknown error occurred.')
    }
  }, [])

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      setHasPermission(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handlePositionSuccess(position)
        startTracking()
      },
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }, [handlePositionSuccess, handlePositionError])

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    if (watchIdRef.current !== null) {
      return
    }

    setIsTracking(true)
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    )
  }, [handlePositionSuccess, handlePositionError])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
  }, [])

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return {
    location,
    error,
    isTracking,
    hasPermission,
    requestPermission,
    startTracking,
    stopTracking,
  }
}
