'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { MapView } from '@/components/map/MapView'

export function RoutePreviewPanel() {
  return (
    <Card variant="glass" className="min-w-0">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Route preview</CardTitle>
            <CardDescription>Stops, origin, and the selected route polyline.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400">
              <span className="w-3 h-0.5 bg-surface-400 rounded" />
              FIFO
            </div>
            <div className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400">
              <span className="w-3 h-0.5 bg-primary-500 rounded" />
              Optimized
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="h-[340px] sm:h-[380px] lg:h-[420px] xl:h-[440px]">
          <MapView />
        </div>
      </CardContent>
    </Card>
  )
}

