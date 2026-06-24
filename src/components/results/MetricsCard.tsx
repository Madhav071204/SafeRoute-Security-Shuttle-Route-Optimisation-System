'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { RouteMetrics } from '@/types'

interface MetricsCardProps {
  title: string
  metrics: RouteMetrics
  variant?: 'default' | 'primary' | 'success'
  isSelected?: boolean
  onSelect?: () => void
}

export function MetricsCard({
  title,
  metrics,
  variant = 'default',
  isSelected,
  onSelect,
}: MetricsCardProps) {
  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)} m`
    return `${km.toFixed(1)} km`
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(2)}`
  }

  return (
    <Card
      variant={variant}
      className={`cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary-500 ring-offset-2' : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          {isSelected && (
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
              Selected
            </span>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Distance</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDistance(metrics.totalDistanceKm)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Time</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDuration(metrics.totalDurationMinutes)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Fuel Cost</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCost(metrics.estimatedFuelCostAud)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
