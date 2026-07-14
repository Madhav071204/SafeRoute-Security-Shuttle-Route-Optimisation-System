import { describe, it, expect } from 'vitest'
import {
  isFiniteNumber,
  isValidLatitude,
  isValidLongitude,
  isValidCoordinates,
} from '@/lib/validation'
import {
  MAX_DESTINATIONS,
  MAX_STOPS,
  MAX_ADDRESS_LENGTH,
} from '@/lib/constants'

describe('isFiniteNumber', () => {
  it('accepts real finite numbers including zero and negatives', () => {
    expect(isFiniteNumber(0)).toBe(true)
    expect(isFiniteNumber(-0)).toBe(true)
    expect(isFiniteNumber(42.5)).toBe(true)
    expect(isFiniteNumber(-42.5)).toBe(true)
  })

  it('rejects non-finite and non-number values', () => {
    expect(isFiniteNumber('0')).toBe(false)
    expect(isFiniteNumber(null)).toBe(false)
    expect(isFiniteNumber(undefined)).toBe(false)
    expect(isFiniteNumber(NaN)).toBe(false)
    expect(isFiniteNumber(Infinity)).toBe(false)
    expect(isFiniteNumber(-Infinity)).toBe(false)
    expect(isFiniteNumber([])).toBe(false)
    expect(isFiniteNumber({})).toBe(false)
  })
})

describe('isValidLatitude', () => {
  it('accepts zero, boundaries and ordinary values', () => {
    expect(isValidLatitude(0)).toBe(true)
    expect(isValidLatitude(-90)).toBe(true)
    expect(isValidLatitude(90)).toBe(true)
    expect(isValidLatitude(-37.9105)).toBe(true)
    expect(isValidLatitude(37.9105)).toBe(true)
  })

  it('rejects out-of-range and non-number latitudes', () => {
    expect(isValidLatitude(90.0001)).toBe(false)
    expect(isValidLatitude(-90.0001)).toBe(false)
    expect(isValidLatitude('45')).toBe(false)
    expect(isValidLatitude(NaN)).toBe(false)
    expect(isValidLatitude(Infinity)).toBe(false)
  })
})

describe('isValidLongitude', () => {
  it('accepts zero, boundaries and ordinary values', () => {
    expect(isValidLongitude(0)).toBe(true)
    expect(isValidLongitude(-180)).toBe(true)
    expect(isValidLongitude(180)).toBe(true)
    expect(isValidLongitude(145.1363)).toBe(true)
    expect(isValidLongitude(-145.1363)).toBe(true)
  })

  it('rejects out-of-range and non-number longitudes', () => {
    expect(isValidLongitude(180.0001)).toBe(false)
    expect(isValidLongitude(-180.0001)).toBe(false)
    expect(isValidLongitude('90')).toBe(false)
    expect(isValidLongitude(NaN)).toBe(false)
    expect(isValidLongitude(-Infinity)).toBe(false)
  })
})

describe('isValidCoordinates', () => {
  it('accepts { lat, lng } with valid finite values, including zeros and boundaries', () => {
    expect(isValidCoordinates({ lat: 0, lng: 0 })).toBe(true)
    expect(isValidCoordinates({ lat: -90, lng: -180 })).toBe(true)
    expect(isValidCoordinates({ lat: 90, lng: 180 })).toBe(true)
    expect(isValidCoordinates({ lat: -37.9105, lng: 145.1363 })).toBe(true)
  })

  it('rejects numeric-string coordinates', () => {
    expect(isValidCoordinates({ lat: '0', lng: '0' })).toBe(false)
    expect(isValidCoordinates({ lat: '10', lng: 20 })).toBe(false)
  })

  it('rejects null, undefined, arrays and non-objects', () => {
    expect(isValidCoordinates(null)).toBe(false)
    expect(isValidCoordinates(undefined)).toBe(false)
    expect(isValidCoordinates([0, 0])).toBe(false)
    expect(isValidCoordinates('0,0')).toBe(false)
    expect(isValidCoordinates(42)).toBe(false)
  })

  it('rejects NaN and infinite coordinate components', () => {
    expect(isValidCoordinates({ lat: NaN, lng: 0 })).toBe(false)
    expect(isValidCoordinates({ lat: 0, lng: NaN })).toBe(false)
    expect(isValidCoordinates({ lat: Infinity, lng: 0 })).toBe(false)
    expect(isValidCoordinates({ lat: 0, lng: -Infinity })).toBe(false)
  })

  it('rejects out-of-range latitude or longitude', () => {
    expect(isValidCoordinates({ lat: 91, lng: 0 })).toBe(false)
    expect(isValidCoordinates({ lat: 0, lng: 181 })).toBe(false)
    expect(isValidCoordinates({ lat: -91, lng: 0 })).toBe(false)
    expect(isValidCoordinates({ lat: 0, lng: -181 })).toBe(false)
  })

  it('rejects objects missing latitude or longitude', () => {
    expect(isValidCoordinates({ lng: 10 })).toBe(false)
    expect(isValidCoordinates({ lat: 10 })).toBe(false)
    expect(isValidCoordinates({})).toBe(false)
  })
})

describe('destination-limit constants', () => {
  it('caps destinations at 15 with a single source of truth', () => {
    expect(MAX_DESTINATIONS).toBe(15)
    expect(MAX_STOPS).toBe(MAX_DESTINATIONS)
  })

  it('defines a positive maximum address length', () => {
    expect(MAX_ADDRESS_LENGTH).toBeGreaterThan(0)
    expect(Number.isInteger(MAX_ADDRESS_LENGTH)).toBe(true)
  })
})
