'use client'

import { Stop } from '@/types'
import { Input } from '@/components/ui/Input'

interface StopInputProps {
  stop: Stop
  index: number
  onUpdate: (updates: Partial<Stop>) => void
  onRemove: () => void
  disabled?: boolean
}

export function StopInput({ stop, index, onUpdate, onRemove, disabled }: StopInputProps) {
  const statusIcon = {
    pending: (
      <span className="w-2 h-2 rounded-full bg-gray-400" title="Not geocoded" />
    ),
    success: (
      <span className="w-2 h-2 rounded-full bg-green-500" title="Location found" />
    ),
    failed: (
      <span className="w-2 h-2 rounded-full bg-red-500" title="Location not found" />
    ),
  }

  return (
    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 pt-2">
        <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
        {statusIcon[stop.geocodeStatus]}
      </div>
      
      <div className="flex-1 space-y-2">
        <Input
          placeholder="Passenger name (optional)"
          value={stop.passengerName}
          onChange={(e) => onUpdate({ passengerName: e.target.value })}
          disabled={disabled}
          className="text-sm"
        />
        <Input
          placeholder="Address (required)"
          value={stop.address}
          onChange={(e) => onUpdate({ address: e.target.value, geocodeStatus: 'pending', coordinates: null })}
          disabled={disabled}
          error={stop.geocodeStatus === 'failed' ? stop.geocodeError : undefined}
          className="text-sm"
        />
      </div>

      <button
        onClick={onRemove}
        disabled={disabled}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
        title="Remove stop"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
