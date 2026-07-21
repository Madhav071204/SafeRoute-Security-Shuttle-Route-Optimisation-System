import { Coordinates } from '@/types'

/**
 * Shared numeric/coordinate validation used by the API routes.
 *
 * These helpers deliberately use `Number.isFinite` and explicit range checks
 * rather than truthiness, so that:
 *  - `0` is accepted as a valid latitude/longitude value,
 *  - numeric strings, `null`, `undefined`, `NaN`, `Infinity`, objects and
 *    arrays are all rejected.
 */

/** True only for a real, finite JavaScript number (rejects NaN, Infinity, strings). */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Valid latitude: finite number within [-90, 90] (0 is valid). */
export function isValidLatitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -90 && value <= 90
}

/** Valid longitude: finite number within [-180, 180] (0 is valid). */
export function isValidLongitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -180 && value <= 180
}

/**
 * True only for an object of the exact shape `{ lat: number; lng: number }`
 * where both values are finite and in range. Rejects null, arrays, missing
 * fields, numeric strings, NaN and Infinity.
 */
export function isValidCoordinates(value: unknown): value is Coordinates {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const coord = value as { lat?: unknown; lng?: unknown }
  return isValidLatitude(coord.lat) && isValidLongitude(coord.lng)
}
