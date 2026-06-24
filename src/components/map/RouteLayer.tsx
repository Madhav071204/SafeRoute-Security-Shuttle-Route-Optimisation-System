'use client'

import { useEffect } from 'react'
import { Route } from '@/types'

interface RouteLayerProps {
  map: mapboxgl.Map | null
  route: Route | null
  isSelected: boolean
}

export function RouteLayer({ map, route, isSelected }: RouteLayerProps) {
  useEffect(() => {
    if (!map || !route?.polyline) return

    const layerId = `route-${route.type}`
    const sourceId = `route-source-${route.type}`

    // Remove existing layer and source
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId)
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId)
    }

    if (!isSelected) return

    // Decode polyline
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

    const coordinates = decodePolyline(route.polyline)

    map.addSource(sourceId, {
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
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': route.type === 'optimized' ? '#2563eb' : '#6b7280',
        'line-width': 4,
        'line-opacity': 0.8,
      },
    })

    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId)
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId)
      }
    }
  }, [map, route, isSelected])

  return null
}
