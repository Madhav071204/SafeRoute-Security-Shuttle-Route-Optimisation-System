'use client'

import { Stop } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

interface CurrentStopProps {
  stop: Stop
  stopNumber: number
  onMarkComplete: () => void
}

export function CurrentStop({ stop, stopNumber, onMarkComplete }: CurrentStopProps) {
  const handleOpenInGoogleMaps = () => {
    if (stop.coordinates) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.coordinates.lat},${stop.coordinates.lng}`
      window.open(url, '_blank')
    }
  }

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(stop.address)
    } catch (error) {
      console.error('Failed to copy address:', error)
    }
  }

  return (
    <Card variant="primary">
      <CardContent className="p-4 space-y-4">
        <div>
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
            Current Stop #{stopNumber}
          </p>
          <h3 className="text-lg font-semibold text-gray-900 mt-1">
            {stop.passengerName || `Passenger ${stopNumber}`}
          </h3>
        </div>

        <div className="bg-white rounded-md p-3 border border-blue-200">
          <p className="text-sm text-gray-700">{stop.address}</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={handleOpenInGoogleMaps}
            className="flex-1"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Open in Maps
          </Button>
          <Button variant="secondary" onClick={handleCopyAddress}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </Button>
        </div>

        <Button
          variant="primary"
          onClick={onMarkComplete}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          Mark Complete & Continue
        </Button>
      </CardContent>
    </Card>
  )
}
