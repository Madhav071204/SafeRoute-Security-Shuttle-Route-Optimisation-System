'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSettings } from '@/hooks/useSettings'
import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import clsx from 'clsx'

export default function SettingsPage() {
  const { settings, isLoaded, setSettings, resetSettings } = useSettings()
  const { theme, setTheme } = useTheme()
  const [fuelConsumption, setFuelConsumption] = useState('')
  const [fuelPrice, setFuelPrice] = useState('')
  const [originAddress, setOriginAddress] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (isLoaded) {
      setFuelConsumption(String(settings.fuelConsumptionPer100km))
      setFuelPrice(String(settings.fuelPricePerLiter))
      setOriginAddress(settings.originAddress)
    }
  }, [isLoaded, settings])

  const handleSave = () => {
    setSettings({
      fuelConsumptionPer100km: parseFloat(fuelConsumption) || 12,
      fuelPricePerLiter: parseFloat(fuelPrice) || 1.80,
      originAddress: originAddress || settings.originAddress,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    resetSettings()
    setFuelConsumption('12')
    setFuelPrice('1.80')
    setOriginAddress('Monash University, Wellington Rd, Clayton VIC 3800')
  }

  if (!isLoaded) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-10 w-1/3 mb-8" />
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-mesh-light dark:bg-mesh-dark">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-surface-900 dark:text-white">Settings</h1>
          <p className="text-surface-600 dark:text-surface-400 mt-2">
            Customize SafeRoute to match your preferences
          </p>
        </div>
        
        <div className="space-y-6">
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize how SafeRoute looks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={clsx(
                        'p-4 rounded-xl border-2 transition-all text-center',
                        theme === t
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center mx-auto mb-2">
                        {t === 'light' && (
                          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="5" />
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                          </svg>
                        )}
                        {t === 'dark' && (
                          <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                          </svg>
                        )}
                        {t === 'system' && (
                          <svg className="w-5 h-5 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <span className={clsx(
                        'text-sm font-medium capitalize',
                        theme === t 
                          ? 'text-primary-700 dark:text-primary-300' 
                          : 'text-surface-600 dark:text-surface-400'
                      )}>
                        {t}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <CardTitle>Fuel Cost Settings</CardTitle>
                  <CardDescription>Configure fuel consumption and pricing</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Fuel Consumption (L/100km)"
                  type="number"
                  step="0.1"
                  value={fuelConsumption}
                  onChange={(e) => setFuelConsumption(e.target.value)}
                  hint="Typical shuttle van: 10-15 L/100km"
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                />
                <Input
                  label="Fuel Price ($/L)"
                  type="number"
                  step="0.01"
                  value={fuelPrice}
                  onChange={(e) => setFuelPrice(e.target.value)}
                  hint="Current fuel price per liter"
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
              </div>

              <div className="pt-4 border-t border-surface-200 dark:border-surface-700">
                <Input
                  label="Default Starting Address"
                  type="text"
                  value={originAddress}
                  onChange={(e) => setOriginAddress(e.target.value)}
                  hint="The shuttle's starting location for all trips"
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                />
              </div>

              <div className="pt-4 border-t border-surface-200 dark:border-surface-700 flex gap-3">
                <Button onClick={handleSave} variant="primary">
                  {saved ? (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Saved!
                    </>
                  ) : 'Save Settings'}
                </Button>
                <Button variant="secondary" onClick={handleReset}>
                  Reset to Defaults
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="p-4 rounded-xl bg-surface-100 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-white">Data storage</p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                  Settings, trip history, ride requests, and the active dispatch trip are saved in your browser and may
                  remain after you close it. This is a proof-of-concept, so avoid entering real passenger details, and
                  clear saved data using your browser storage controls.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
