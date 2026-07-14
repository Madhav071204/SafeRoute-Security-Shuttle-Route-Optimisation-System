import { NextRequest } from 'next/server'
import { vi } from 'vitest'

/** Build a POST NextRequest with a JSON body, exercising the real handler contract. */
export function postJson(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** A dummy token that passes getMapboxToken()'s placeholder check. */
export const TEST_MAPBOX_TOKEN = 'pk.test-token-value-not-real'

/**
 * Install a token in the environment for the duration of a test. Returns a
 * restore function. Kept out of committed .env files — this only mutates the
 * in-memory process env for the test run.
 */
export function withMapboxToken(token: string = TEST_MAPBOX_TOKEN): () => void {
  const original = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN = token
  return () => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    else process.env.NEXT_PUBLIC_MAPBOX_TOKEN = original
  }
}

/** Ensure no Mapbox token is configured (forces the safe fallback path). */
export function withoutMapboxToken(): () => void {
  const original = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  return () => {
    if (original !== undefined) process.env.NEXT_PUBLIC_MAPBOX_TOKEN = original
  }
}

/** Build a mock `fetch` Response-like object. */
export function mockFetchResponse(options: {
  ok?: boolean
  status?: number
  json?: unknown
}) {
  const { ok = true, status = 200, json = {} } = options
  return {
    ok,
    status,
    json: async () => json,
  } as unknown as Response
}

/** Stub global fetch with a vi mock; caller supplies the implementation. */
export function stubFetch(impl: (input: unknown) => Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}
