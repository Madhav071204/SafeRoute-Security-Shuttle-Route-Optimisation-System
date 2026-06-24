'use client'

import { useTrip } from '@/context/TripContext'
import { StopInput } from './StopInput'
import { MAX_STOPS } from '@/lib/constants'

interface StopListProps {
  disabled?: boolean
}

export function StopList({ disabled }: StopListProps) {
  const { trip, updateStop, removeStop } = useTrip()

  if (trip.stops.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        <p>No stops added yet.</p>
        <p className="mt-1">Click &quot;Add Stop&quot; to begin.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
        <span>Stops ({trip.stops.length}/{MAX_STOPS})</span>
        {trip.stops.length >= MAX_STOPS && (
          <span className="text-amber-600">Maximum reached</span>
        )}
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {trip.stops.map((stop, index) => (
          <StopInput
            key={stop.id}
            stop={stop}
            index={index}
            onUpdate={(updates) => updateStop(stop.id, updates)}
            onRemove={() => removeStop(stop.id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  )
}
