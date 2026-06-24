'use client'

import { useTrip } from '@/context/TripContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { DriverModeView } from './DriverModeView'

export function ExecutionView() {
  const {
    trip,
    routes,
    selectedRouteType,
    executionState,
    endExecution,
  } = useTrip()

  const selectedRoute = selectedRouteType === 'fifo' ? routes.fifo : routes.optimized
  if (!selectedRoute) return null

  const { orderedStopIds } = selectedRoute
  const totalStops = orderedStopIds.length
  const isComplete = trip.status === 'completed'

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

  return <DriverModeView />
}
