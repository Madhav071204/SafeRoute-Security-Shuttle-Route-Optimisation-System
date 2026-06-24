'use client'

import { useState } from 'react'
import { Stop } from '@/types'

interface UpcomingStopsDrawerProps {
  stops: Stop[]
  orderedStopIds: string[]
  completedStopIds: string[]
  currentStopIndex: number
}

export function UpcomingStopsDrawer({
  stops,
  orderedStopIds,
  completedStopIds,
  currentStopIndex,
}: UpcomingStopsDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const upcomingCount = orderedStopIds.length - currentStopIndex - 1
  const completedCount = completedStopIds.length

  const getStopStatus = (stopId: string, index: number) => {
    if (completedStopIds.includes(stopId)) return 'completed'
    if (index === currentStopIndex) return 'current'
    return 'upcoming'
  }

  return (
    <div className="bg-gray-50 border-t border-gray-200">
      {/* Drawer header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            {upcomingCount > 0 
              ? `${upcomingCount} stop${upcomingCount !== 1 ? 's' : ''} remaining`
              : 'No more stops'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">
            {completedCount}/{orderedStopIds.length} completed
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto border-t border-gray-200">
          <div className="px-4 py-2 space-y-1">
            {orderedStopIds.map((stopId, index) => {
              const stop = stops.find((s) => s.id === stopId)
              if (!stop) return null

              const status = getStopStatus(stopId, index)
              const displayNumber = index + 1

              return (
                <div
                  key={stopId}
                  className={`
                    flex items-center gap-3 py-2 px-2 rounded-lg
                    ${status === 'current' ? 'bg-blue-50' : ''}
                    ${status === 'completed' ? 'opacity-60' : ''}
                  `}
                >
                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    {status === 'completed' ? (
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : status === 'current' ? (
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{displayNumber}</span>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600 text-xs font-medium">{displayNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Stop info */}
                  <div className="flex-1 min-w-0">
                    <p className={`
                      text-sm font-medium truncate
                      ${status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}
                    `}>
                      {stop.passengerName || `Passenger ${displayNumber}`}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{stop.address}</p>
                  </div>

                  {/* Status badge */}
                  {status === 'current' && (
                    <span className="flex-shrink-0 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
