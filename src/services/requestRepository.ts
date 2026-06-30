import { RideRequest, RideRequestStatus } from '@/types/rideRequest'

const STORAGE_KEY = 'saferoute_ride_requests'
const STORAGE_VERSION = 1
const EVENT_KEY = 'ride_requests'

interface StorageData {
  version: number
  requests: RideRequest[]
}

function isClient(): boolean {
  return typeof window !== 'undefined'
}

function nowIso(): string {
  return new Date().toISOString()
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function safeParse(raw: string | null): StorageData {
  if (!raw) return { version: STORAGE_VERSION, requests: [] }
  try {
    const parsed = JSON.parse(raw) as StorageData
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.requests)) {
      return { version: STORAGE_VERSION, requests: [] }
    }
    return parsed
  } catch {
    return { version: STORAGE_VERSION, requests: [] }
  }
}

function getStorageData(): StorageData {
  if (!isClient()) return { version: STORAGE_VERSION, requests: [] }
  return safeParse(localStorage.getItem(STORAGE_KEY))
}

function setStorageData(data: StorageData): void {
  if (!isClient()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  // same-tab pubsub
  window.dispatchEvent(new CustomEvent('saferoute:repo', { detail: { key: EVENT_KEY } }))
}

export function subscribeRideRequests(cb: () => void): () => void {
  if (!isClient()) return () => {}

  const onCustom = (e: Event) => {
    const ev = e as CustomEvent<{ key?: string }>
    if (ev.detail?.key === EVENT_KEY) cb()
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb()
  }

  window.addEventListener('saferoute:repo', onCustom)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('saferoute:repo', onCustom)
    window.removeEventListener('storage', onStorage)
  }
}

function applyStatusTimestamps(
  req: RideRequest,
  nextStatus: RideRequestStatus,
  atIso: string
): RideRequest {
  const next: RideRequest = { ...req, status: nextStatus }

  if (nextStatus === 'assigned') next.assignedAt = next.assignedAt || atIso
  if (nextStatus === 'picked_up') next.pickedUpAt = next.pickedUpAt || atIso
  if (nextStatus === 'completed') next.completedAt = next.completedAt || atIso

  return next
}

export const requestRepository = {
  generateRequestId,

  async create(input: Omit<RideRequest, 'id' | 'createdAt' | 'status'>): Promise<RideRequest> {
    const data = getStorageData()
    const req: RideRequest = {
      ...input,
      id: generateRequestId(),
      status: 'pending',
      createdAt: nowIso(),
    }
    data.requests.unshift(req)
    setStorageData(data)
    return req
  },

  async get(id: string): Promise<RideRequest | null> {
    const data = getStorageData()
    return data.requests.find((r) => r.id === id) || null
  },

  async list(): Promise<RideRequest[]> {
    const data = getStorageData()
    return data.requests
  },

  async update(id: string, updates: Partial<RideRequest>): Promise<RideRequest | null> {
    const data = getStorageData()
    const idx = data.requests.findIndex((r) => r.id === id)
    if (idx < 0) return null
    const updated: RideRequest = { ...data.requests[idx], ...updates }
    data.requests[idx] = updated
    setStorageData(data)
    return updated
  },

  async updateStatus(
    id: string,
    status: RideRequestStatus,
    extras?: Partial<RideRequest>
  ): Promise<RideRequest | null> {
    const data = getStorageData()
    const idx = data.requests.findIndex((r) => r.id === id)
    if (idx < 0) return null

    const atIso = nowIso()
    const withStatus = applyStatusTimestamps(data.requests[idx], status, atIso)
    const updated: RideRequest = { ...withStatus, ...extras }

    data.requests[idx] = updated
    setStorageData(data)
    return updated
  },

  async safeUpdateStatus(
    id: string,
    status: RideRequestStatus,
    extras?: Partial<RideRequest>
  ): Promise<void> {
    await this.updateStatus(id, status, extras)
  },

  async clearAll(): Promise<void> {
    setStorageData({ version: STORAGE_VERSION, requests: [] })
  },
}

