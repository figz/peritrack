'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SymptomTrendChart } from '@/components/charts/SymptomTrendChart'
import { SymptomHeatmap } from '@/components/charts/SymptomHeatmap'
import { BurdenBarChart } from '@/components/charts/BurdenBarChart'
import { WeightTrendChart } from '@/components/charts/WeightTrendChart'
import { PeriodCalendar } from '@/components/charts/PeriodCalendar'
import { BiometricsChart } from '@/components/charts/BiometricsChart'

interface ChartData {
  data: {
    date: string
    symptoms: Record<string, number>
    sideEffects: Record<string, number>
    weight: number | null
    periodPresent: boolean
    flowSeverity: number | null
    biometrics: Record<string, number>
    totalBurden: number
  }[]
  medicationChanges: { date: string; name: string; dose: string | null }[]
  lifeEvents: { date: string; title: string; category: string }[]
  prnMedEvents: { date: string; meds: string[] }[]
}

interface SymptomDef {
  key: string
  label: string
  category: string | null
  isActive: boolean
}

const PRESET_DAYS = [7, 30, 90, 180, 365]

export default function ChartsPage() {
  const [days, setDays] = useState(30)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [symptoms, setSymptoms] = useState<SymptomDef[]>([])
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then(({ symptoms: s }) => {
      const active = (s as SymptomDef[]).filter((x) => x.isActive)
      setSymptoms(active)
      setSelectedSymptoms(active.slice(0, 5).map((x) => x.key))
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ days: String(days) })
    if (selectedSymptoms.length > 0) params.set('symptoms', selectedSymptoms.join(','))
    fetch(`/api/charts?${params}`)
      .then((r) => r.json())
      .then((d) => { setChartData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [days, selectedSymptoms])

  function toggleSymptom(key: string) {
    setSelectedSymptoms((s) => s.includes(key) ? s.filter((k) => k !== key) : [...s, key])
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Charts</h1>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 shrink-0">Date range:</span>
            {PRESET_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${days === d ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {d === 365 ? '1yr' : d === 180 ? '6mo' : `${d}d`}
              </button>
            ))}
          </div>
          <div>
            <span className="text-sm text-gray-600 block mb-2">Symptoms to chart:</span>
            <div className="flex flex-wrap gap-1.5">
              {symptoms.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleSymptom(s.key)}
                  aria-pressed={selectedSymptoms.includes(s.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium min-h-[32px] transition-colors ${selectedSymptoms.includes(s.key) ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="animate-pulse text-gray-400 text-center py-12">Loading chart data…</div>
      ) : !chartData || chartData.data.length === 0 ? (
        <Card><CardContent className="text-center py-12"><p className="text-gray-400">No data available for this period.</p></CardContent></Card>
      ) : (
        <Tabs defaultValue="trend">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="trend">Symptom Trends</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="burden">Daily Burden</TabsTrigger>
            <TabsTrigger value="weight">Weight</TabsTrigger>
            <TabsTrigger value="period">Period Calendar</TabsTrigger>
            <TabsTrigger value="biometrics">Biometrics</TabsTrigger>
          </TabsList>

          <TabsContent value="trend" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Symptom Severity Over Time</CardTitle></CardHeader>
              <CardContent>
                <SymptomTrendChart
                  data={chartData.data}
                  selectedSymptoms={selectedSymptoms}
                  symptomDefs={symptoms}
                  medicationChanges={chartData.medicationChanges}
                  lifeEvents={chartData.lifeEvents}
                  prnMedEvents={chartData.prnMedEvents}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="heatmap" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Symptom Heatmap</CardTitle></CardHeader>
              <CardContent>
                <SymptomHeatmap data={chartData.data} selectedSymptoms={selectedSymptoms} symptomDefs={symptoms} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="burden" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Daily Symptom Burden</CardTitle></CardHeader>
              <CardContent>
                <BurdenBarChart data={chartData.data} medicationChanges={chartData.medicationChanges} lifeEvents={chartData.lifeEvents} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weight" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Weight Trend</CardTitle></CardHeader>
              <CardContent>
                <WeightTrendChart data={chartData.data} medicationChanges={chartData.medicationChanges} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="period" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Period Calendar</CardTitle></CardHeader>
              <CardContent>
                <PeriodCalendar data={chartData.data} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="biometrics" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Biometrics Over Time</CardTitle></CardHeader>
              <CardContent>
                <BiometricsChart data={chartData.data} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
