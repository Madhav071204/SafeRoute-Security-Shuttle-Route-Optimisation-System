'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Coordinates, DriverLocation } from '@/types'

interface TrackingMapViewProps {
  pickup: Coordinates
  destination?: Coordinates
  driverLocation?: DriverLocation | null
}

export function TrackingMapView({ pickup, destination, driverLocation }: TrackingMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [mapError, setMapError] = useState<string | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  const points = useMemo(() => {
    const out: { key: string; coords: Coordinates; color: string; label: string }[] = [
      { key: 'pickup', coords: pickup, color: '#2563eb', label: 'Pickup' },
    ]
    if (destination) out.push({ key: 'destination', coords: destination, color: '#9333ea', label: 'Destination' })
    if (driverLocation) out.push({ key: 'driver', coords: driverLocation.coordinates, color: '#3b82f6', label: 'Shuttle' })
    return out
  }, [pickup, destination, driverLocation])

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
          center: [pickup.lng, pickup.lat],
          zoom: 14,
        })

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

        map.on('load', () => setIsMapLoaded(true))
        mapRef.current = map
      } catch (e) {
        setMapError(e instanceof Error ? e.message : 'Failed to initialize map')
      }
    }

    initMap()

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return
    const map = mapRef.current

    const update = async () => {
      const mapboxgl = (await import('mapbox-gl')).default

      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      points.forEach((p) => {
        const marker = new mapboxgl.Marker({ color: p.color })
          .setLngLat([p.coords.lng, p.coords.lat])
          .setPopup(new mapboxgl.Popup().setText(p.label))
          .addTo(map)
        markersRef.current.push(marker)
      })

      if (points.length >= 2) {
        const bounds = new mapboxgl.LngLatBounds()
        points.forEach((p) => bounds.extend([p.coords.lng, p.coords.lat]))
        map.fitBounds(bounds, { padding: 60, duration: 400 })
      } else {
        map.easeTo({ center: [pickup.lng, pickup.lat], zoom: 15, duration: 300 })
      }
    }

    update()
  }, [points, pickup, isMapLoaded])

  if (mapError) {
    return (
      <div className="bg-surface-100 dark:bg-surface-800 rounded-xl h-full min-h-[320px] flex items-center justify-center">
        <div className="text-center p-6">
          <p className="text-danger-600 dark:text-danger-400 font-medium">{mapError}</p>
        </div>
      </div>
    )
  }

  return <div ref={mapContainerRef} className="rounded-xl h-full w-full overflow-hidden" style={{ minHeight: '320px' }} />
}

