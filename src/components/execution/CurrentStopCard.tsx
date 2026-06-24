'use client'

import { Stop, DriverLocation, RouteLeg } from '@/types'
import { Button } from '@/components/ui/Button'
import { formatDistance, formatDuration, getDistanceAndETA } from '@/lib/distance'

interface CurrentStopCardProps {
  stop: Stop
  stopNumber: number
  totalStops: number
  driverLocation: DriverLocation | null
  leg?: RouteLeg
  onMarkComplete: () => void
}

export function CurrentStopCard({
  stop,
  stopNumber,
  totalStops,
  driverLocation,
  leg,
  onMarkComplete,
}: CurrentStopCardProps) {
  const { distance, eta } = getDistanceAndETA(
    driverLocation,
    stop.coordinates,
    leg?.durationMinutes
  )

  const handleOpenInGoogleMaps = () => {
    if (stop.coordinates) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.coordinates.lat},${stop.coordinates.lng}`
      window.open(url, '_blank')
    }
  }

  const handleOpenInAppleMaps = () => {
    if (stop.coordinates) {
      const url = `http://maps.apple.com/?daddr=${stop.coordinates.lat},${stop.coordinates.lng}`
      window.open(url, '_blank')
    }
  }

  return (
    <div className="bg-white rounded-t-2xl shadow-lg border-t border-gray-200">
      {/* Stop indicator */}
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            Stop {stopNumber} of {totalStops}
          </span>
          {distance !== null && eta !== null && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-600 font-medium">{formatDistance(distance)}</span>
              <span className="text-gray-400">•</span>
              <span className="text-blue-600 font-semibold">~{formatDuration(eta)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Passenger info */}
      <div className="px-4 py-3">
        <h3 className="text-xl font-bold text-gray-900">
          {stop.passengerName || `Passenger ${stopNumber}`}
        </h3>
        <p className="text-gray-600 mt-1 text-sm leading-relaxed">{stop.address}</p>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 space-y-3">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleOpenInGoogleMaps}
            className="flex-1 text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Open in Maps
          </Button>
          <Button
            variant="secondary"
            onClick={handleOpenInAppleMaps}
            className="px-3"
            title="Open in Apple Maps"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </Button>
        </div>

        <Button
          variant="primary"
          onClick={onMarkComplete}
          className="w-full py-3 text-base font-semibold bg-green-600 hover:bg-green-700"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Mark Arrived & Complete
        </Button>
      </div>
    </div>
  )
}
