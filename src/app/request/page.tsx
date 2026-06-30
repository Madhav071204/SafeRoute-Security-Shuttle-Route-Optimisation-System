'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AddressSearchInput } from '@/components/stops/AddressSearchInput'
import { SearchSuggestion } from '@/types/location'
import { requestRepository } from '@/services/requestRepository'
import { RideLocation } from '@/types/rideRequest'

function suggestionToRideLocation(s: SearchSuggestion): RideLocation {
  return {
    label: s.displayName,
    address: s.fullAddress || s.displayName,
    lat: s.coordinates.lat,
    lng: s.coordinates.lng,
  }
}

export default function RequestPage() {
  const [passengerName, setPassengerName] = useState('')
  const [contact, setContact] = useState('')
  const [notes, setNotes] = useState('')

  const [pickupQuery, setPickupQuery] = useState('')
  const [pickup, setPickup] = useState<RideLocation | null>(null)
  const [destQuery, setDestQuery] = useState('')
  const [destination, setDestination] = useState<RideLocation | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return passengerName.trim().length > 0 && !!pickup && !!destination && !submitting
  }, [passengerName, pickup, destination, submitting])

  const handleSubmit = async () => {
    setError(null)
    if (!canSubmit || !pickup || !destination) return

    setSubmitting(true)
    try {
      const req = await requestRepository.create({
        passengerName: passengerName.trim(),
        contact: contact.trim() || undefined,
        pickup,
        destination,
        notes: notes.trim() || undefined,
      })
      setCreatedId(req.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  if (createdId) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Request submitted</CardTitle>
            <CardDescription>
              Your ride request has been received. Keep this ID for tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white/70 dark:bg-surface-900/30 p-4">
              <p className="text-xs uppercase tracking-wider text-surface-500 dark:text-surface-400 font-semibold">
                Request ID
              </p>
              <p className="mt-1 font-mono text-sm text-surface-900 dark:text-white">
                {createdId}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Link href={`/track/${createdId}`} className="flex-1">
                <Button variant="primary" size="lg" fullWidth>
                  Track my request
                </Button>
              </Link>
              <Link href="/request" className="flex-1">
                <Button variant="ghost" size="lg" fullWidth>
                  Submit another
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Request a security shuttle</CardTitle>
          <CardDescription>
            Enter your pickup and destination. A dispatcher will assign a shuttle shortly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Passenger name <span className="text-danger-500">*</span>
            </label>
            <input
              value={passengerName}
              onChange={(e) => setPassengerName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full px-4 py-2.5 rounded-lg text-sm bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-600 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Pickup location <span className="text-danger-500">*</span>
            </label>
            <AddressSearchInput
              value={pickupQuery}
              onChange={(v) => {
                setPickupQuery(v)
                setPickup(null)
              }}
              onSelect={(s: SearchSuggestion) => {
                setPickupQuery(s.fullAddress || s.displayName)
                setPickup(suggestionToRideLocation(s))
              }}
              placeholder="Search pickup address, place, or landmark..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Destination <span className="text-danger-500">*</span>
            </label>
            <AddressSearchInput
              value={destQuery}
              onChange={(v) => {
                setDestQuery(v)
                setDestination(null)
              }}
              onSelect={(s: SearchSuggestion) => {
                setDestQuery(s.fullAddress || s.displayName)
                setDestination(suggestionToRideLocation(s))
              }}
              placeholder="Search destination address, place, or landmark..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                Phone / email (optional)
              </label>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. 04xx xxx xxx or name@domain"
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-600 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                Notes (optional)
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Near building entrance"
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-600 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={submitting}
          >
            Submit request
          </Button>

          <p className="text-xs text-surface-500 dark:text-surface-400">
            After submitting, you’ll get a request ID and a tracking link.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

