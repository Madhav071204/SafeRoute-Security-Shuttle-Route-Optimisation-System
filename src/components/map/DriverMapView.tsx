'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTrip } from '@/context/TripContext'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants'
import { DriverLocation, TrackingMode } from '@/types'

interface DriverMapViewProps {
  driverLocation: DriverLocation | null
  trackingMode: TrackingMode
  onTrackingModeChange: (mode: TrackingMode) => void
  currentStopIndex: number
  completedStopIds: string[]
}

export function DriverMapView({
  driverLocation,
  trackingMode,
  onTrackingModeChange,
  currentStopIndex,
  completedStopIds,
}: DriverMapViewProps) {
  const { trip, routes, selectedRouteType } = useTrip()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  const selectedRoute = selectedRouteType === 'fifo' ? routes.fifo : routes.optimized
  const orderedStopIds = selectedRoute?.orderedStopIds || []

  // Initialize map
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
        await import('mapbox-gl/dist/mapbox-gl.css')

        mapboxgl.accessToken = token

        const initialCenter = driverLocation
          ? [driverLocation.coordinates.lng, driverLocation.coordinates.lat]
          : [DEFAULT_MAP_CENTER.lng, DEFAULT_MAP_CENTER.lat]

        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: initialCenter as [number, number],
          zoom: 15,
        })

        map.addControl(new mapboxgl.NavigationControl(), 'top-right')

        map.on('load', () => {
          setIsMapLoaded(true)
        })

        mapRef.current = map
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

  // Update driver marker
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return

    const updateDriverMarker = async () => {
      const mapboxgl = (await import('mapbox-gl')).default

      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove()
        driverMarkerRef.current = null
      }

      if (driverLocation) {
        const el = document.createElement('div')
        el.className = 'driver-marker'
        el.innerHTML = `
          <div style="
            width: 24px;
            height: 24px;
            background-color: #3b82f6;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 0 2px #3b82f6, 0 2px 8px rgba(0,0,0,0.3);
            position: relative;
          ">
            <div style="
              position: absolute;
              inset: 3px;
              background-color: #60a5fa;
              border-radius: 50%;
              animation: pulse 2s infinite;
            "></div>
          </div>
        `

        const style = document.createElement('style')
        style.textContent = `
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.8); }
          }
        `
        if (!document.querySelector('style[data-driver-pulse]')) {
          style.setAttribute('data-driver-pulse', 'true')
          document.head.appendChild(style)
        }

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([driverLocation.coordinates.lng, driverLocation.coordinates.lat])
          .addTo(mapRef.current!)

        driverMarkerRef.current = marker

        if (trackingMode === 'follow') {
          mapRef.current!.easeTo({
            center: [driverLocation.coordinates.lng, driverLocation.coordinates.lat],
            duration: 500,
          })
        }
      }
    }

    updateDriverMarker()
  }, [driverLocation, isMapLoaded, trackingMode])

  // Update stop markers with execution state
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return

    const updateMarkers = async () => {
      const mapboxgl = (await import('mapbox-gl')).default

      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      const originMarker = new mapboxgl.Marker({ color: '#16a34a' })
        .setLngLat([trip.origin.coordinates.lng, trip.origin.coordinates.lat])
        .setPopup(new mapboxgl.Popup().setText('Origin: ' + trip.origin.address))
        .addTo(mapRef.current!)
      markersRef.current.push(originMarker)

      const geocodedStops = trip.stops.filter((s) => s.coordinates)
      geocodedStops.forEach((stop) => {
        const orderIndex = orderedStopIds.indexOf(stop.id)
        const displayNumber = orderIndex >= 0 ? orderIndex + 1 : '?'
        const isCompleted = completedStopIds.includes(stop.id)
        const isCurrent = orderIndex === currentStopIndex

        const el = document.createElement('div')
        el.className = 'stop-marker'

        if (isCompleted) {
          el.style.cssText = `
            width: 20px;
            height: 20px;
            background-color: #9ca3af;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 10px;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            opacity: 0.7;
          `
          el.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `
        } else if (isCurrent) {
          el.style.cssText = `
            width: 36px;
            height: 36px;
            background-color: #2563eb;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            font-weight: bold;
            border: 3px solid white;
            box-shadow: 0 0 0 3px #2563eb, 0 4px 12px rgba(37,99,235,0.4);
            animation: currentPulse 2s infinite;
          `
          el.textContent = String(displayNumber)

          const style = document.createElement('style')
          style.textContent = `
            @keyframes currentPulse {
              0%, 100% { box-shadow: 0 0 0 3px #2563eb, 0 4px 12px rgba(37,99,235,0.4); }
              50% { box-shadow: 0 0 0 6px rgba(37,99,235,0.3), 0 4px 12px rgba(37,99,235,0.4); }
            }
          `
          if (!document.querySelector('style[data-current-pulse]')) {
            style.setAttribute('data-current-pulse', 'true')
            document.head.appendChild(style)
          }
        } else {
          el.style.cssText = `
            width: 28px;
            height: 28px;
            background-color: #6b7280;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            font-weight: bold;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          `
          el.textContent = String(displayNumber)
        }

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([stop.coordinates!.lng, stop.coordinates!.lat])
          .setPopup(
            new mapboxgl.Popup().setHTML(
              `<strong>${stop.passengerName || 'Stop ' + displayNumber}</strong><br/>${stop.address}${isCompleted ? '<br/><span style="color: #16a34a;">✓ Completed</span>' : ''}`
            )
          )
          .addTo(mapRef.current!)
        markersRef.current.push(marker)
      })
    }

    updateMarkers()
  }, [trip.stops, trip.origin, orderedStopIds, completedStopIds, currentStopIndex, isMapLoaded])

  // Update route polyline
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return

    const map = mapRef.current

    if (map.getLayer('route')) {
      map.removeLayer('route')
    }
    if (map.getSource('route')) {
      map.removeSource('route')
    }

    if (selectedRoute?.polyline) {
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
          'line-color': '#2563eb',
          'line-width': 4,
          'line-opacity': 0.8,
        },
      })
    }
  }, [selectedRoute, isMapLoaded])

  // Handle tracking mode changes
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

    mapRef.current.easeTo({
      center: [driverLocation.coordinates.lng, driverLocation.coordinates.lat],
      zoom: 15,
      duration: 500,
    })
    onTrackingModeChange('follow')
  }, [driverLocation, onTrackingModeChange])

  const handleShowOverview = useCallback(() => {
    handleFitBounds()
    onTrackingModeChange('overview')
  }, [handleFitBounds, onTrackingModeChange])

  if (mapError) {
    return (
      <div className="bg-gray-100 rounded-lg h-full min-h-[400px] flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-600 font-medium">{mapError}</p>
          <p className="text-gray-500 text-sm mt-2">
            Get a free API key at{' '}
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              mapbox.com
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-[400px]">
      <div
        ref={mapContainerRef}
        className="absolute inset-0 rounded-lg"
      />

      {/* Map controls overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <button
          onClick={handleRecenter}
          disabled={!driverLocation}
          className={`
            px-3 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2
            ${trackingMode === 'follow' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-50'}
            ${!driverLocation ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Follow Me
        </button>
        <button
          onClick={handleShowOverview}
          className={`
            px-3 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2
            ${trackingMode === 'overview' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-50'}
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Full Route
        </button>
      </div>
    </div>
  )
}
