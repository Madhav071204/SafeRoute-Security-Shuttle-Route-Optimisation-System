'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/lib/constants'

const SETTINGS_STORAGE_KEY = 'saferoute_settings'

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSettingsState({ ...DEFAULT_SETTINGS, ...parsed })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
    setIsLoaded(true)
  }, [])

  // Save settings to localStorage
  const setSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettingsState((prev) => {
      const updated = { ...prev, ...newSettings }
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Failed to save settings:', error)
      }
      return updated
    })
  }, [])

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS)
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to reset settings:', error)
    }
  }, [])

  // Calculate fuel cost for a given distance
  const calculateFuelCost = useCallback(
    (distanceKm: number): number => {
      const litersUsed = (distanceKm * settings.fuelConsumptionPer100km) / 100
      return litersUsed * settings.fuelPricePerLiter
    },
    [settings.fuelConsumptionPer100km, settings.fuelPricePerLiter]
  )

  return {
    settings,
    isLoaded,
    setSettings,
    resetSettings,
    calculateFuelCost,
  }
}
