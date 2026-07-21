import { NextResponse } from 'next/server'

/**
 * Lightweight liveness endpoint for container and load-balancer health checks.
 * Does not call Mapbox or any external service and returns no secrets.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}
