'use client'

import { useTrip } from '@/context/TripContext'
import { useSettings } from '@/hooks/useSettings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { MetricsCard } from './MetricsCard'

export function RouteComparison() {
  const { routes, selectedRouteType, setSelectedRouteType } = useTrip()
  const { calculateFuelCost } = useSettings()

  if (!routes.fifo || !routes.optimized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Route Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm text-center py-4">
            Add stops and click &quot;Optimize Route&quot; to see comparison
          </p>
        </CardContent>
      </Card>
    )
  }

  const fifoMetrics = {
    ...routes.fifo.metrics,
    estimatedFuelCostAud: calculateFuelCost(routes.fifo.metrics.totalDistanceKm),
  }

  const optimizedMetrics = {
    ...routes.optimized.metrics,
    estimatedFuelCostAud: calculateFuelCost(routes.optimized.metrics.totalDistanceKm),
  }

  // Calculate savings
  const distanceSaved = fifoMetrics.totalDistanceKm - optimizedMetrics.totalDistanceKm
  const distanceSavedPercent = fifoMetrics.totalDistanceKm > 0
    ? (distanceSaved / fifoMetrics.totalDistanceKm) * 100
    : 0

  const timeSaved = fifoMetrics.totalDurationMinutes - optimizedMetrics.totalDurationMinutes
  const timeSavedPercent = fifoMetrics.totalDurationMinutes > 0
    ? (timeSaved / fifoMetrics.totalDurationMinutes) * 100
    : 0

  const costSaved = fifoMetrics.estimatedFuelCostAud - optimizedMetrics.estimatedFuelCostAud

  return (
    <Card>
      <CardHeader>
        <CardTitle>Route Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricsCard
            title="FIFO Route (Original)"
            metrics={fifoMetrics}
            variant="default"
            isSelected={selectedRouteType === 'fifo'}
            onSelect={() => setSelectedRouteType('fifo')}
          />
          <MetricsCard
            title="Optimized Route"
            metrics={optimizedMetrics}
            variant="primary"
            isSelected={selectedRouteType === 'optimized'}
            onSelect={() => setSelectedRouteType('optimized')}
          />
        </div>

        {distanceSaved > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-green-800 mb-2">
              Estimated Savings with Optimized Route
            </h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-green-600">Distance</p>
                <p className="font-medium text-green-800">
                  {distanceSaved.toFixed(1)} km ({distanceSavedPercent.toFixed(0)}%)
                </p>
              </div>
              <div>
                <p className="text-green-600">Time</p>
                <p className="font-medium text-green-800">
                  {Math.round(timeSaved)} min ({timeSavedPercent.toFixed(0)}%)
                </p>
              </div>
              <div>
                <p className="text-green-600">Fuel Cost</p>
                <p className="font-medium text-green-800">
                  ${costSaved.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Note: The optimized route uses a nearest-neighbor heuristic. It typically provides 
          good results but is not guaranteed to be the absolute optimal solution.
        </p>
      </CardContent>
    </Card>
  )
}
