/**
 * Controlled six-scenario Mapbox road-route benchmark against production.
 * Synthetic public Melbourne destinations only. Not for CI.
 *
 * Coordinates are fixed, publicly verifiable landmark positions. Abbreviated
 * Mapbox Geocoding queries (e.g. "Syndal Station VIC") were observed resolving
 * to incorrect Australian matches, so this benchmark measures FIFO vs
 * nearest-neighbour ordering on Mapbox Directions — not geocoding quality.
 *
 * Usage (PowerShell, if local Node TLS interception blocks certs):
 *   $env:NODE_TLS_REJECT_UNAUTHORIZED='0'; node scripts/run-route-benchmark.mjs
 */

import { writeFileSync } from 'node:fs'

const BASE =
  process.env.PRODUCTION_URL ??
  'https://sa-2cf22f7190f04affacba88ff88c8e636.ecs.ap-southeast-2.on.aws'

const ORIGIN = {
  label: 'Monash University Clayton',
  coordinates: { lat: -37.9105, lng: 145.1363 },
}

/** Public landmark coordinates (Melbourne / SE suburbs). */
const PLACES = {
  syndal: {
    label: 'Syndal Station, Glen Waverley VIC',
    coordinates: { lat: -37.8762, lng: 145.1489 },
  },
  glenWaverley: {
    label: 'Glen Waverley Station, Glen Waverley VIC',
    coordinates: { lat: -37.8795, lng: 145.162 },
  },
  mountWaverley: {
    label: 'Mount Waverley Station, Mount Waverley VIC',
    coordinates: { lat: -37.8753, lng: 145.1282 },
  },
  clayton: {
    label: 'Clayton Station, Clayton VIC',
    coordinates: { lat: -37.9248, lng: 145.1205 },
  },
  oakleigh: {
    label: 'Oakleigh Station, Oakleigh VIC',
    coordinates: { lat: -37.9004, lng: 145.0884 },
  },
  huntingdale: {
    label: 'Huntingdale Station, Huntingdale VIC',
    coordinates: { lat: -37.9107, lng: 145.1024 },
  },
  brightonBeach: {
    label: 'Brighton Beach Station, Brighton VIC',
    coordinates: { lat: -37.9265, lng: 144.989 },
  },
  frankston: {
    label: 'Frankston Station, Frankston VIC',
    coordinates: { lat: -38.143, lng: 145.123 },
  },
  dandenongPlaza: {
    label: 'Dandenong Plaza, Dandenong VIC',
    coordinates: { lat: -37.9875, lng: 145.2145 },
  },
  chadstone: {
    label: 'Chadstone Shopping Centre, Chadstone VIC',
    coordinates: { lat: -37.8875, lng: 145.083 },
  },
}

/** Six fixed scenarios (subset of docs/route-benchmark-plan.md). */
const SCENARIOS = [
  {
    id: 'B01',
    planId: 'S08',
    rationale: 'Already near-efficient FIFO order',
    placeKeys: ['syndal', 'glenWaverley', 'mountWaverley', 'clayton', 'oakleigh', 'huntingdale'],
  },
  {
    id: 'B02',
    planId: 'S09',
    rationale: 'Intentionally inefficient FIFO order',
    placeKeys: ['huntingdale', 'oakleigh', 'clayton', 'mountWaverley', 'glenWaverley', 'syndal'],
  },
  {
    id: 'B03',
    planId: 'S02',
    rationale: 'Clustered destinations along one corridor',
    placeKeys: ['glenWaverley', 'mountWaverley', 'syndal'],
  },
  {
    id: 'B04',
    planId: 'S06',
    rationale: 'Destinations distributed around the origin',
    placeKeys: ['glenWaverley', 'mountWaverley', 'syndal', 'clayton', 'oakleigh'],
  },
  {
    id: 'B05',
    planId: 'S04',
    rationale: 'One distant outlier',
    placeKeys: ['brightonBeach', 'frankston', 'dandenongPlaza'],
  },
  {
    id: 'B06',
    planId: 'S05',
    rationale: 'Duplicate destinations (separate passengers)',
    // Two Chadstone stops with distinct IDs (same coordinates)
    placeKeys: ['chadstone', 'chadstone', 'glenWaverley'],
  },
]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function round2(n) {
  return Math.round(n * 100) / 100
}

function pctDiff(baseline, compared) {
  if (baseline === 0) return compared === 0 ? 0 : null
  return ((baseline - compared) / baseline) * 100
}

async function postJson(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  return { status: res.status, json }
}

async function optimize(origin, stops) {
  const { status, json } = await postJson('/api/optimize', { origin, stops })
  if (status !== 200) {
    throw new Error(`optimize failed: ${status} ${JSON.stringify(json)}`)
  }
  return json
}

async function routeOnce(origin, stops, orderedStopIds) {
  const { status, json } = await postJson('/api/route', {
    origin,
    stops,
    orderedStopIds,
  })
  if (status !== 200) {
    throw new Error(`route failed: ${status} ${JSON.stringify(json)}`)
  }
  return json
}

async function routeWithRetry(origin, stops, orderedStopIds) {
  let result = await routeOnce(origin, stops, orderedStopIds)
  if (result.routeSource === 'mapbox' && result.isFallback === false) {
    return { result, retries: 0 }
  }
  await sleep(4000)
  result = await routeOnce(origin, stops, orderedStopIds)
  return { result, retries: 1 }
}

function buildStops(placeKeys) {
  return placeKeys.map((key, i) => {
    const place = PLACES[key]
    return {
      id: `stop_${i + 1}`,
      placeKey: key,
      label: place.label,
      coordinates: place.coordinates,
    }
  })
}

async function runScenario(scenario) {
  const timestamp = new Date().toISOString()
  const notes = []
  try {
    const stops = buildStops(scenario.placeKeys)
    const destinations = stops.map((s) => s.label)
    const fifoOrder = stops.map((s) => s.id)
    const stopPayload = stops.map((s) => ({ id: s.id, coordinates: s.coordinates }))

    const opt = await optimize(ORIGIN.coordinates, stopPayload)
    const nnOrder = opt.orderedStopIds

    await sleep(800)
    const fifoRoute = await routeWithRetry(ORIGIN.coordinates, stopPayload, fifoOrder)
    await sleep(800)
    const nnRoute = await routeWithRetry(ORIGIN.coordinates, stopPayload, nnOrder)

    const fifo = fifoRoute.result
    const nn = nnRoute.result

    if (fifo.routeSource !== 'mapbox' || fifo.isFallback) {
      notes.push(`FIFO unavailable after ${fifoRoute.retries} retry; source=${fifo.routeSource}`)
    }
    if (nn.routeSource !== 'mapbox' || nn.isFallback) {
      notes.push(`NN unavailable after ${nnRoute.retries} retry; source=${nn.routeSource}`)
    }

    const mapboxOk =
      fifo.routeSource === 'mapbox' &&
      !fifo.isFallback &&
      nn.routeSource === 'mapbox' &&
      !nn.isFallback

    if (!mapboxOk) {
      return {
        id: scenario.id,
        planId: scenario.planId,
        rationale: scenario.rationale,
        origin: ORIGIN.label,
        destinations,
        stopCount: stops.length,
        fifoOrder,
        nnOrder,
        available: false,
        timestamp,
        notes: notes.join('; ') || 'Mapbox road routing unavailable',
        fifo,
        nn,
      }
    }

    const absDist = fifo.totalDistanceKm - nn.totalDistanceKm
    const pctDist = pctDiff(fifo.totalDistanceKm, nn.totalDistanceKm)
    const absDur = fifo.totalDurationMinutes - nn.totalDurationMinutes
    const pctDur = pctDiff(fifo.totalDurationMinutes, nn.totalDurationMinutes)

    return {
      id: scenario.id,
      planId: scenario.planId,
      rationale: scenario.rationale,
      origin: ORIGIN.label,
      destinations,
      stopCoordinates: stops.map((s) => ({
        id: s.id,
        label: s.label,
        lat: s.coordinates.lat,
        lng: s.coordinates.lng,
      })),
      stopCount: stops.length,
      fifoOrder,
      nnOrder,
      available: true,
      fifoDistanceKm: fifo.totalDistanceKm,
      nnDistanceKm: nn.totalDistanceKm,
      fifoDurationMin: fifo.totalDurationMinutes,
      nnDurationMin: nn.totalDurationMinutes,
      absDistanceDiffKm: round2(absDist),
      pctDistanceDiff: pctDist === null ? null : round2(pctDist),
      absDurationDiffMin: round2(absDur),
      pctDurationDiff: pctDur === null ? null : round2(pctDur),
      routeSource: 'mapbox',
      timestamp,
      notes: notes.join('; ') || '',
      retries: { fifo: fifoRoute.retries, nn: nnRoute.retries },
    }
  } catch (err) {
    return {
      id: scenario.id,
      planId: scenario.planId,
      rationale: scenario.rationale,
      origin: ORIGIN.label,
      destinations: scenario.placeKeys.map((k) => PLACES[k].label),
      stopCount: scenario.placeKeys.length,
      available: false,
      timestamp,
      notes: String(err?.message ?? err),
    }
  }
}

async function main() {
  console.log(JSON.stringify({ base: BASE, origin: ORIGIN, startedAt: new Date().toISOString() }))
  const results = []
  for (const scenario of SCENARIOS) {
    process.stderr.write(`Running ${scenario.id} (${scenario.planId})...\n`)
    const row = await runScenario(scenario)
    results.push(row)
    console.log(JSON.stringify(row))
    await sleep(1500)
  }
  const outPath = new URL('../docs/route-benchmark-raw.json', import.meta.url)
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        base: BASE,
        origin: ORIGIN,
        coordinateSource:
          'Fixed public landmark coordinates (Mapbox Geocoding abbreviated station queries were unreliable)',
        percentageFormula:
          'percentageDifference = ((FIFO - nearestNeighbour) / FIFO) * 100; positive means NN shorter/faster than FIFO',
        results,
      },
      null,
      2
    )
  )
  process.stderr.write(`Wrote ${outPath.pathname}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
