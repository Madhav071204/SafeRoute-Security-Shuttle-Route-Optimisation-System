'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTrip } from '@/context/TripContext'
import { DEFAULT_MAP_CENTER } from '@/lib/constants'
import { DriverLocation, TrackingMode, DirectionRoute, Coordinates } from '@/types'
import clsx from 'clsx'

interface DriverMapViewProps {
  driverLocation: DriverLocation | null
  trackingMode: TrackingMode
  onTrackingModeChange: (mode: TrackingMode) => void
  currentStopIndex: number
  completedStopIds: string[]
  navigationRoute?: DirectionRoute | null
  currentDestination?: Coordinates | null
}

export function DriverMapView({
  driverLocation,
  trackingMode,
  onTrackingModeChange,
  currentStopIndex,
  completedStopIds,
  navigationRoute,
  currentDestination,
}: DriverMapViewProps) {
  const { trip, routes, selectedRouteType } = useTrip()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const userInteractedRef = useRef(false)

  const selectedRoute = selectedRouteType === 'fifo' ? routes.fifo : routes.optimized
  const orderedStopIds = selectedRoute?.orderedStopIds || []

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token || token === 'your_mapbox_public_token_here') {
      setMapError('Mapbox token not configured. Add your token to .env.local')
      return
    }

    const initMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default

        mapboxgl.accessToken = token

        const initialCenter = driverLocation
          ? [driverLocation.coordinates.lng, driverLocation.coordinates.lat]
          : [DEFAULT_MAP_CENTER.lng, DEFAULT_MAP_CENTER.lat]

        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: initialCenter as [number, number],
          zoom: 15,
          attributionControl: false,
        })

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
        map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')

        map.on('load', () => {
          setIsMapLoaded(true)
          setTimeout(() => map.resize(), 0)
        })

        mapRef.current = map

        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.resize()
          }
        }, 100)
      } catch (error) {
        console.error('Map initialization error:', error)
        setMapError('Failed to initialize map')
      }
    }

    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return

    const updateDriverMarker = async () => {
      const mapboxgl = (await import('mapbox-gl')).default

      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove()
        driverMarkerRef.current = null
      }

      if (driverLocation) {
        const hasHeading = driverLocation.heading !== null && !isNaN(driverLocation.heading)
        
        const el = document.createElement('div')
        el.className = 'driver-location-marker'
        
        if (hasHeading) {
          // Navigation arrow when heading is available
          el.innerHTML = `
            <div class="driver-marker-nav" style="transform: rotate(${driverLocation.heading}deg);">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" fill="#3b82f6" stroke="white" stroke-width="3"/>
                <path d="M16 8L20 18H12L16 8Z" fill="white"/>
              </svg>
            </div>
          `
        } else {
          // Standard dot marker
          el.innerHTML = `
            <div class="driver-marker-outer">
              <div class="driver-marker-inner"></div>
            </div>
          `
        }

        const style = document.createElement('style')
        style.textContent = `
          .driver-marker-outer {
            width: 22px;
            height: 22px;
            background-color: #3b82f6;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25), 0 0 0 2px rgba(59,130,246,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            animation: driverPulse 2s ease-in-out infinite;
          }
          .driver-marker-inner {
            width: 8px;
            height: 8px;
            background-color: #93c5fd;
            border-radius: 50%;
          }
          .driver-marker-nav {
            width: 32px;
            height: 32px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            transition: transform 0.3s ease-out;
          }
          @keyframes driverPulse {
            0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.25), 0 0 0 2px rgba(59,130,246,0.3); }
            50% { box-shadow: 0 2px 8px rgba(0,0,0,0.25), 0 0 0 6px rgba(59,130,246,0.15); }
          }
        `
        if (!document.querySelector('style[data-driver-marker]')) {
          style.setAttribute('data-driver-marker', 'true')
          document.head.appendChild(style)
        }

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([driverLocation.coordinates.lng, driverLocation.coordinates.lat])
          .addTo(mapRef.current!)

        driverMarkerRef.current = marker

        // Navigation follow mode with bearing
        if (trackingMode === 'follow' && !userInteractedRef.current) {
          const options: {
            center: [number, number]
            zoom: number
            duration: number
            bearing?: number
            pitch?: number
          } = {
            center: [driverLocation.coordinates.lng, driverLocation.coordinates.lat],
            zoom: 16,
            duration: 500,
          }
          
          // Add bearing for navigation-like experience if heading is available
          if (hasHeading) {
            options.bearing = driverLocation.heading!
            options.pitch = 45
          }
          
          mapRef.current!.easeTo(options)
        }
      }
    }

    updateDriverMarker()
  }, [driverLocation, isMapLoaded, trackingMode])

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return

    const updateMarkers = async () => {
      const mapboxgl = (await import('mapbox-gl')).default

      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      const createOriginMarker = () => {
        const el = document.createElement('div')
        el.innerHTML = `
          <div style="
            width: 26px;
            height: 26px;
            background: linear-gradient(135deg, #16a34a, #15803d);
            border-radius: 50%;
            border: 2.5px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
          </div>
        `
        return el
      }

      const originMarker = new mapboxgl.Marker({ element: createOriginMarker() })
        .setLngLat([trip.origin.coordinates.lng, trip.origin.coordinates.lat])
        .addTo(mapRef.current!)
      markersRef.current.push(originMarker)

      const geocodedStops = trip.stops.filter((s) => s.coordinates)
      geocodedStops.forEach((stop) => {
        const orderIndex = orderedStopIds.indexOf(stop.id)
        const displayNumber = orderIndex >= 0 ? orderIndex + 1 : '?'
        const isCompleted = completedStopIds.includes(stop.id)
        const isCurrent = orderIndex === currentStopIndex

        const el = document.createElement('div')
        el.className = 'stop-marker-element'

        if (isCompleted) {
          el.innerHTML = `
            <div style="
              width: 22px;
              height: 22px;
              background-color: #9ca3af;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
              box-shadow: 0 1px 4px rgba(0,0,0,0.15);
              opacity: 0.75;
            ">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          `
        } else if (isCurrent) {
          el.innerHTML = `
            <div style="
              width: 34px;
              height: 34px;
              background: linear-gradient(135deg, #3b82f6, #2563eb);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 14px;
              font-weight: 700;
              border: 3px solid white;
              box-shadow: 0 0 0 3px rgba(59,130,246,0.3), 0 4px 12px rgba(37,99,235,0.35);
            " class="marker-pulse">
              ${displayNumber}
            </div>
          `

          const style = document.createElement('style')
          style.textContent = `
            @keyframes currentMarkerPulse {
              0%, 100% { box-shadow: 0 0 0 3px rgba(59,130,246,0.3), 0 4px 12px rgba(37,99,235,0.35); }
              50% { box-shadow: 0 0 0 8px rgba(59,130,246,0.15), 0 4px 12px rgba(37,99,235,0.35); }
            }
            .marker-pulse {
              animation: currentMarkerPulse 2s ease-in-out infinite;
            }
          `
          if (!document.querySelector('style[data-current-marker]')) {
            style.setAttribute('data-current-marker', 'true')
            document.head.appendChild(style)
          }
        } else {
          el.innerHTML = `
            <div style="
              width: 26px;
              height: 26px;
              background-color: #64748b;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 11px;
              font-weight: 600;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            ">
              ${displayNumber}
            </div>
          `
        }

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([stop.coordinates!.lng, stop.coordinates!.lat])
          .addTo(mapRef.current!)
        markersRef.current.push(marker)
      })
    }

    updateMarkers()
  }, [trip.stops, trip.origin, orderedStopIds, completedStopIds, currentStopIndex, isMapLoaded])

  // Handle map interaction to exit follow mode
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return

    const map = mapRef.current

    const handleUserInteraction = () => {
      if (trackingMode === 'follow') {
        userInteractedRef.current = true
        onTrackingModeChange('overview')
      }
    }

    map.on('dragstart', handleUserInteraction)
    map.on('zoomstart', (e: unknown) => {
      // Only trigger if user initiated the zoom (not programmatic)
      const event = e as { originalEvent?: unknown }
      if (event.originalEvent) {
        handleUserInteraction()
      }
    })

    return () => {
      map.off('dragstart', handleUserInteraction)
      map.off('zoomstart', handleUserInteraction)
    }
  }, [isMapLoaded, trackingMode, onTrackingModeChange])

  // Render navigation route (priority) or fallback to selected route polyline
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return

    const map = mapRef.current

    // Remove existing layers
    if (map.getLayer('navigation-route')) {
      map.removeLayer('navigation-route')
    }
    if (map.getSource('navigation-route')) {
      map.removeSource('navigation-route')
    }
    if (map.getLayer('route')) {
      map.removeLayer('route')
    }
    if (map.getSource('route')) {
      map.removeSource('route')
    }

    // Prefer navigation route if available (real-time directions from current location)
    if (navigationRoute?.geometry) {
      map.addSource('navigation-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: navigationRoute.geometry,
        },
      })

      // Add a wider background line for better visibility
      map.addLayer({
        id: 'navigation-route',
        type: 'line',
        source: 'navigation-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 6,
          'line-opacity': 0.85,
        },
      })
    } else if (selectedRoute?.polyline) {
      // Fallback to encoded polyline from original route
      const decodePolyline = (encoded: string): [number, number][] => {
        const points: [number, number][] = []
        let index = 0
        let lat = 0
        let lng = 0

        while (index < encoded.length) {
          let shift = 0
          let result = 0
          let byte

          do {
            byte = encoded.charCodeAt(index++) - 63
            result |= (byte & 0x1f) << shift
            shift += 5
          } while (byte >= 0x20)

          const dlat = result & 1 ? ~(result >> 1) : result >> 1
          lat += dlat

          shift = 0
          result = 0

          do {
            byte = encoded.charCodeAt(index++) - 63
            result |= (byte & 0x1f) << shift
            shift += 5
          } while (byte >= 0x20)

          const dlng = result & 1 ? ~(result >> 1) : result >> 1
          lng += dlng

          points.push([lng / 1e5, lat / 1e5])
        }

        return points
      }

      const coordinates = decodePolyline(selectedRoute.polyline)

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      })

      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#94a3b8',
          'line-width': 4,
          'line-opacity': 0.6,
        },
      })
    }
  }, [navigationRoute, selectedRoute, isMapLoaded])

  const handleFitBounds = useCallback(async () => {
    if (!mapRef.current || !isMapLoaded) return

    const mapboxgl = (await import('mapbox-gl')).default
    const bounds = new mapboxgl.LngLatBounds()

    if (driverLocation) {
      bounds.extend([driverLocation.coordinates.lng, driverLocation.coordinates.lat])
    }

    bounds.extend([trip.origin.coordinates.lng, trip.origin.coordinates.lat])

    const geocodedStops = trip.stops.filter((s) => s.coordinates)
    geocodedStops.forEach((stop) => {
      bounds.extend([stop.coordinates!.lng, stop.coordinates!.lat])
    })

    mapRef.current.fitBounds(bounds, { padding: 60, duration: 500 })
  }, [driverLocation, trip.origin, trip.stops, isMapLoaded])

  const handleRecenter = useCallback(() => {
    if (!mapRef.current || !driverLocation) return

    userInteractedRef.current = false
    
    const hasHeading = driverLocation.heading !== null && !isNaN(driverLocation.heading)
    
    const options: {
      center: [number, number]
      zoom: number
      duration: number
      bearing?: number
      pitch?: number
    } = {
      center: [driverLocation.coordinates.lng, driverLocation.coordinates.lat],
      zoom: 16,
      duration: 500,
    }
    
    if (hasHeading) {
      options.bearing = driverLocation.heading!
      options.pitch = 45
    } else {
      options.bearing = 0
      options.pitch = 0
    }
    
    mapRef.current.easeTo(options)
    onTrackingModeChange('follow')
  }, [driverLocation, onTrackingModeChange])

  const handleShowOverview = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.easeTo({ bearing: 0, pitch: 0, duration: 300 })
    }
    handleFitBounds()
    onTrackingModeChange('overview')
  }, [handleFitBounds, onTrackingModeChange])

  useEffect(() => {
    if (mapRef.current && isMapLoaded) {
      setTimeout(() => {
        mapRef.current?.resize()
      }, 100)
    }
  }, [driverLocation, isMapLoaded])

  if (mapError) {
    return (
      <div className="absolute inset-0 bg-surface-100 dark:bg-surface-900 flex items-center justify-center">
        <div className="text-center p-6 max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-danger-600 dark:text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-danger-600 dark:text-danger-400 font-medium mb-2">{mapError}</p>
          <p className="text-surface-500 dark:text-surface-400 text-sm">
            Get a free API key at{' '}
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 underline hover:no-underline"
            >
              mapbox.com
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0">
      <div
        ref={mapContainerRef}
        className="absolute inset-0"
      />

      {/* Glass-style map controls */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute top-3 left-3 flex flex-col gap-2 z-10"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRecenter}
          disabled={!driverLocation}
          className={clsx(
            'glass-button flex items-center gap-2',
            trackingMode === 'follow' && 'active',
            !driverLocation && 'opacity-50 cursor-not-allowed'
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="hidden sm:inline">Follow Me</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleShowOverview}
          className={clsx(
            'glass-button flex items-center gap-2',
            trackingMode === 'overview' && 'active'
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="hidden sm:inline">Full Route</span>
        </motion.button>
      </motion.div>
    </div>
  )
}
