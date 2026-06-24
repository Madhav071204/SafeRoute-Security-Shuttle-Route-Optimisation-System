'use client'

import { useTrip } from '@/context/TripContext'
import { TripPanel } from '@/components/trip/TripPanel'
import { MapView } from '@/components/map/MapView'
import { RouteComparison } from '@/components/results/RouteComparison'
import { ExecutionView } from '@/components/execution/ExecutionView'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function Home() {
  const { trip } = useTrip()

  // Show execution view when trip is executing or completed
  if (trip.status === 'executing' || trip.status === 'completed') {
    return <ExecutionView />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trip Panel - Left Sidebar */}
        <div className="lg:col-span-1">
          <TripPanel />
        </div>

        {/* Map and Results - Right Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map View */}
          <Card>
            <CardHeader>
              <CardTitle>Map View</CardTitle>
            </CardHeader>
            <CardContent>
              <MapView />
            </CardContent>
          </Card>

          {/* Route Comparison */}
          <RouteComparison />
        </div>
      </div>
    </div>
  )
}
