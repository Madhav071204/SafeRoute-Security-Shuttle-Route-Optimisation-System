'use client'

import { useState, useEffect } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function SettingsPage() {
  const { settings, isLoaded, setSettings, resetSettings } = useSettings()
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Fuel Cost Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Input
              label="Fuel Consumption (L/100km)"
              type="number"
              step="0.1"
              value={fuelConsumption}
              onChange={(e) => setFuelConsumption(e.target.value)}
              hint="Typical shuttle van: 10-15 L/100km"
            />
            <Input
              label="Fuel Price ($/L)"
              type="number"
              step="0.01"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(e.target.value)}
              hint="Current fuel price per liter"
            />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <Input
              label="Default Starting Address"
              type="text"
              value={originAddress}
              onChange={(e) => setOriginAddress(e.target.value)}
              hint="The shuttle's starting location"
            />
          </div>

          <div className="border-t border-gray-200 pt-6 flex gap-3">
            <Button onClick={handleSave}>
              {saved ? 'Saved!' : 'Save Settings'}
            </Button>
            <Button variant="secondary" onClick={handleReset}>
              Reset to Defaults
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            Settings are saved to your browser and will persist across sessions.
            Trip data (addresses) is not saved.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
