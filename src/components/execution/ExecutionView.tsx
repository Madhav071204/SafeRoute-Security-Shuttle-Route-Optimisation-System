'use client'

import { useTrip } from '@/context/TripContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StopProgress } from './StopProgress'
import { CurrentStop } from './CurrentStop'
import { MapView } from '@/components/map/MapView'

export function ExecutionView() {
  const {
    trip,
    routes,
    selectedRouteType,
    executionState,
    markStopComplete,
    endExecution,
  } = useTrip()

  const selectedRoute = selectedRouteType === 'fifo' ? routes.fifo : routes.optimized
  if (!selectedRoute) return null

  const { orderedStopIds } = selectedRoute
  const { currentStopIndex, completedStopIds } = executionState
  const totalStops = orderedStopIds.length
  const completedCount = completedStopIds.length
  const isComplete = trip.status === 'completed'

  const currentStopId = orderedStopIds[currentStopIndex]
  const currentStop = trip.stops.find((s) => s.id === currentStopId)

  if (isComplete) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card variant="success">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Trip Complete!</h2>
            <p className="text-gray-600 mb-6">
              All {totalStops} stops have been completed successfully.
            </p>
            <Button onClick={endExecution} variant="primary" size="lg">
              Start New Trip
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Executing Trip</h1>
          <p className="text-sm text-gray-500">
            {selectedRouteType === 'optimized' ? 'Optimized' : 'FIFO'} route
          </p>
        </div>
        <Button variant="danger" onClick={endExecution}>
          End Trip
        </Button>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <ProgressBar
          value={completedCount}
          max={totalStops}
          label={`${completedCount} of ${totalStops} stops completed`}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel - Stop list and current stop */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Stops</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <StopProgress
                stops={trip.stops}
                orderedStopIds={orderedStopIds}
                completedStopIds={completedStopIds}
                currentStopIndex={currentStopIndex}
              />
            </CardContent>
          </Card>

          {currentStop && (
            <CurrentStop
              stop={currentStop}
              stopNumber={currentStopIndex + 1}
              onMarkComplete={markStopComplete}
            />
          )}
        </div>

        {/* Right panel - Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Route Map</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <MapView />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
