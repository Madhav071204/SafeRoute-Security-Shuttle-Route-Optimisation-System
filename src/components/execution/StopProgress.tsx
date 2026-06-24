'use client'

import { Stop } from '@/types'

interface StopProgressProps {
  stops: Stop[]
  orderedStopIds: string[]
  completedStopIds: string[]
  currentStopIndex: number
}

export function StopProgress({
  stops,
  orderedStopIds,
  completedStopIds,
  currentStopIndex,
}: StopProgressProps) {
  const stopMap = new Map(stops.map((s) => [s.id, s]))

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Stop List</h3>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {orderedStopIds.map((stopId, index) => {
          const stop = stopMap.get(stopId)
          if (!stop) return null

          const isCompleted = completedStopIds.includes(stopId)
          const isCurrent = index === currentStopIndex

          return (
            <div
              key={stopId}
              className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                isCurrent
                  ? 'bg-blue-100 border border-blue-300'
                  : isCompleted
                  ? 'bg-green-50'
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex-shrink-0 w-6">
                {isCompleted ? (
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : isCurrent ? (
                  <span className="flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full">
                    {index + 1}
                  </span>
                ) : (
                  <span className="flex items-center justify-center w-5 h-5 bg-gray-300 text-gray-600 text-xs font-bold rounded-full">
                    {index + 1}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                }`}>
                  {stop.passengerName || `Passenger ${index + 1}`}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {stop.address}
                </p>
              </div>

              {isCurrent && (
                <span className="flex-shrink-0 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  Next
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
