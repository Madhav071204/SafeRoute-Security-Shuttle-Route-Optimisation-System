'use client'

import { useEffect, useRef, useState } from 'react'
import { useTrip } from '@/context/TripContext'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants'

export function MapView() {
  const { trip, routes, selectedRouteType } = useTrip()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [mapError, setMapError] = useState<string | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

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

        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [DEFAULT_MAP_CENTER.lng, DEFAULT_MAP_CENTER.lat],
          zoom: DEFAULT_MAP_ZOOM,
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

  // Update markers when stops change
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return

    const updateMarkers = async () => {
      const mapboxgl = (await import('mapbox-gl')).default

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      // Add origin marker
      const originMarker = new mapboxgl.Marker({ color: '#16a34a' })
        .setLngLat([trip.origin.coordinates.lng, trip.origin.coordinates.lat])
        .setPopup(new mapboxgl.Popup().setText('Origin: ' + trip.origin.address))
        .addTo(mapRef.current!)
      markersRef.current.push(originMarker)

      // Get the selected route order
      const selectedRoute = selectedRouteType === 'fifo' ? routes.fifo : routes.optimized
      const orderedIds = selectedRoute?.orderedStopIds || trip.stops.map((s) => s.id)

      // Add stop markers
      const geocodedStops = trip.stops.filter((s) => s.coordinates)
      geocodedStops.forEach((stop) => {
        const orderIndex = orderedIds.indexOf(stop.id)
        const displayNumber = orderIndex >= 0 ? orderIndex + 1 : '?'

        const el = document.createElement('div')
        el.className = 'marker'
        el.style.cssText = `
          width: 28px;
          height: 28px;
          background-color: #2563eb;
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

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([stop.coordinates!.lng, stop.coordinates!.lat])
          .setPopup(
            new mapboxgl.Popup().setHTML(
              `<strong>${stop.passengerName || 'Stop ' + displayNumber}</strong><br/>${stop.address}`
            )
          )
          .addTo(mapRef.current!)
        markersRef.current.push(marker)
      })

      // Fit bounds if we have markers
      if (geocodedStops.length > 0) {
        const bounds = new mapboxgl.LngLatBounds()
        bounds.extend([trip.origin.coordinates.lng, trip.origin.coordinates.lat])
        geocodedStops.forEach((stop) => {
          bounds.extend([stop.coordinates!.lng, stop.coordinates!.lat])
        })
        mapRef.current!.fitBounds(bounds, { padding: 50 })
      }
    }

    updateMarkers()
  }, [trip.stops, trip.origin, routes, selectedRouteType, isMapLoaded])

  // Update route polyline
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return

    const map = mapRef.current
    const selectedRoute = selectedRouteType === 'fifo' ? routes.fifo : routes.optimized

    // Remove existing route layer
    if (map.getLayer('route')) {
      map.removeLayer('route')
    }
    if (map.getSource('route')) {
      map.removeSource('route')
    }

    // Add new route if we have a polyline
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
          'line-color': selectedRouteType === 'optimized' ? '#2563eb' : '#6b7280',
          'line-width': 4,
          'line-opacity': 0.8,
        },
      })
    }
  }, [routes, selectedRouteType, isMapLoaded])

  if (mapError) {
    return (
      <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-600 font-medium">{mapError}</p>
          <p className="text-gray-500 text-sm mt-2">
            Get a free API key at{' '}
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 underline"
            >
              mapbox.com
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={mapContainerRef}
      className="rounded-lg h-96 w-full"
      style={{ minHeight: '400px' }}
    />
  )
}
