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

type EnvSnapshot = {
  publicToken: string | undefined
  serverToken: string | undefined
}

function snapshotMapboxEnv(): EnvSnapshot {
  return {
    publicToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    serverToken: process.env.MAPBOX_ACCESS_TOKEN,
  }
}

function restoreMapboxEnv(snapshot: EnvSnapshot): void {
  if (snapshot.publicToken === undefined) delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  else process.env.NEXT_PUBLIC_MAPBOX_TOKEN = snapshot.publicToken

  if (snapshot.serverToken === undefined) delete process.env.MAPBOX_ACCESS_TOKEN
  else process.env.MAPBOX_ACCESS_TOKEN = snapshot.serverToken
}

/**
 * Install a server-only Mapbox token for the duration of a test.
 * Clears the public token so preference behaviour is unambiguous.
 */
export function withMapboxToken(token: string = TEST_MAPBOX_TOKEN): () => void {
  const snapshot = snapshotMapboxEnv()
  process.env.MAPBOX_ACCESS_TOKEN = token
  delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  return () => restoreMapboxEnv(snapshot)
}

/**
 * Install only the public token (development fallback path for server routes).
 */
export function withPublicMapboxTokenOnly(token: string = TEST_MAPBOX_TOKEN): () => void {
  const snapshot = snapshotMapboxEnv()
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN = token
  delete process.env.MAPBOX_ACCESS_TOKEN
  return () => restoreMapboxEnv(snapshot)
}

/** Ensure no Mapbox token is configured (forces the safe fallback path). */
export function withoutMapboxToken(): () => void {
  const snapshot = snapshotMapboxEnv()
  delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  delete process.env.MAPBOX_ACCESS_TOKEN
  return () => restoreMapboxEnv(snapshot)
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
