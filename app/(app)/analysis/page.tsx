'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

interface MedImpactResult {
  medicationId: string
  medicationName: string
  periodId: string
  startDate: string
  doseAtStart: string | null
  beforeCount: number
  afterCount: number
  symptoms: {
    symptomKey: string
    symptomLabel: string
    beforeAvg: number
    afterAvg: number
    delta: number
    direction: 'improved' | 'worsened' | 'no_change'
    pValue: number
    significant: boolean
  }[]
}

interface TrendResult {
  key: string
  label: string
  category: string | null
  direction: 'improving' | 'stable' | 'worsening'
  persistent: boolean
  currentAvg: number
  rolling7: number[]
}

interface CorrelationResult {
  matrix: Record<string, Record<string, number>>
  keys: string[]
  labels: Record<string, string>
}

function DirIcon({ dir }: { dir: string }) {
  if (dir === 'improved') return <ArrowDown className="w-4 h-4 text-green-600" aria-label="Improved" />
  if (dir === 'worsened') return <ArrowUp className="w-4 h-4 text-red-500" aria-label="Worsened" />
  return <Minus className="w-4 h-4 text-gray-400" aria-label="No change" />
}

function CorrCell({ value }: { value: number }) {
  const abs = Math.abs(value)
  const positive = value > 0
  if (abs < 0.2) return <td className="text-center p-1 text-xs text-gray-400">—</td>
  const intensity = abs < 0.4 ? '100' : abs < 0.6 ? '200' : abs < 0.8 ? '300' : '400'
  const color = positive ? `bg-blue-${intensity} text-blue-900` : `bg-orange-${intensity} text-orange-900`
  return (
    <td className={`text-center p-1 text-xs font-medium rounded ${color}`} title={`r = ${value}`}>
      {value.toFixed(2)}
    </td>
  )
}

export default function AnalysisPage() {
  const [medImpact, setMedImpact] = useState<MedImpactResult[]>([])
  const [trends, setTrends] = useState<TrendResult[]>([])
  const [correlation, setCorrelation] = useState<CorrelationResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/analysis?type=medication-impact').then((r) => r.json()),
      fetch('/api/analysis?type=trends').then((r) => r.json()),
      fetch('/api/analysis?type=correlation&days=90').then((r) => r.json()),
    ]).then(([mi, tr, co]) => {
      setMedImpact(mi)
      setTrends(tr)
      setCorrelation(co)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="animate-pulse text-gray-400 text-center py-12">Analyzing your data…</div>

  const persistentSymptoms = trends.filter((t) => t.persistent)
  const worseningSymptoms = trends.filter((t) => t.direction === 'worsening' && !t.persistent)
  const improvingSymptoms = trends.filter((t) => t.direction === 'improving')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analysis & Insights</h1>
        <p className="text-sm text-gray-500 mt-0.5">Statistical analysis to help inform conversations with your healthcare provider.</p>
      </div>

      <Tabs defaultValue="trends">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="trends">Trend Detection</TabsTrigger>
          <TabsTrigger value="medication">Medication Impact</TabsTrigger>
          <TabsTrigger value="correlation">Correlation Matrix</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="mt-4 space-y-4">
          {persistentSymptoms.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Persistent Symptoms (≥2 severity on 5+ of last 7 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {persistentSymptoms.map((t) => (
                    <Badge key={t.key} className="bg-red-100 text-red-700 border border-red-200">
                      {t.label} (avg {t.currentAvg.toFixed(1)})
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-red-600 mt-2">Consider discussing these with your healthcare provider.</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trends.filter((t) => t.currentAvg > 0 || t.direction !== 'stable').map((t) => (
              <Card key={t.key} className={t.persistent ? 'border-red-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.label}</p>
                      {t.category && <p className="text-xs text-gray-400">{t.category}</p>}
                    </div>
                    {t.direction === 'worsening' && <TrendingUp className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                    {t.direction === 'improving' && <TrendingDown className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />}
                    {t.direction === 'stable' && <Minus className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">{t.currentAvg.toFixed(1)}</span>
                    <span className="text-xs text-gray-400">/ 3 avg</span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ml-auto ${
                        t.direction === 'worsening' ? 'bg-red-100 text-red-700' :
                        t.direction === 'improving' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {t.direction}
                    </Badge>
                  </div>
                  {t.persistent && (
                    <Badge className="mt-1 bg-red-100 text-red-700 text-xs w-full justify-center">Persistent</Badge>
                  )}
                  {/* Mini sparkline */}
                  <div className="mt-2 flex items-end gap-0.5 h-8">
                    {t.rolling7.map((v, i) => (
                      <div
                        key={i}
                        style={{ height: `${Math.max(4, (v / 3) * 32)}px`, flex: 1 }}
                        className="bg-rose-300 rounded-sm"
                        title={`Day ${i + 1}: ${v}`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 text-right">last 7 days</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {trends.every((t) => t.currentAvg === 0) && (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-400">No symptom data from the last 30 days to analyze.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Medication Impact Tab */}
        <TabsContent value="medication" className="mt-4 space-y-4">
          {medImpact.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-400">Add medications with start dates to see impact analysis.</p>
              </CardContent>
            </Card>
          ) : medImpact.map((result) => (
            <Card key={result.periodId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  {result.medicationName}
                  {result.doseAtStart && <span className="text-sm font-normal text-gray-500 ml-2">{result.doseAtStart}</span>}
                </CardTitle>
                <p className="text-xs text-gray-400">
                  Started {new Date(result.startDate).toLocaleDateString()} ·
                  {result.beforeCount} days before · {result.afterCount} days after
                </p>
              </CardHeader>
              <CardContent>
                {result.beforeCount < 3 || result.afterCount < 3 ? (
                  <p className="text-sm text-gray-400">Not enough data for analysis (need at least 3 days before and after).</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 text-xs text-gray-500 font-medium">Symptom</th>
                          <th className="text-center py-2 text-xs text-gray-500 font-medium">Before</th>
                          <th className="text-center py-2 text-xs text-gray-500 font-medium">After</th>
                          <th className="text-center py-2 text-xs text-gray-500 font-medium">Change</th>
                          <th className="text-center py-2 text-xs text-gray-500 font-medium">Dir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.symptoms
                          .filter((s) => s.beforeAvg > 0 || s.afterAvg > 0)
                          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                          .slice(0, 15)
                          .map((s) => (
                            <tr key={s.symptomKey} className="border-b border-gray-50">
                              <td className="py-1.5 text-gray-700">
                                {s.symptomLabel}
                                {s.significant && <span className="text-xs text-purple-500 ml-1" title={`p=${s.pValue}`}>*</span>}
                              </td>
                              <td className="text-center py-1.5 text-gray-500">{s.beforeAvg.toFixed(2)}</td>
                              <td className="text-center py-1.5 text-gray-500">{s.afterAvg.toFixed(2)}</td>
                              <td className={`text-center py-1.5 font-medium ${s.delta < -0.1 ? 'text-green-600' : s.delta > 0.1 ? 'text-red-500' : 'text-gray-400'}`}>
                                {s.delta > 0 ? '+' : ''}{s.delta.toFixed(2)}
                              </td>
                              <td className="text-center py-1.5">
                                <DirIcon dir={s.direction} />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-400 mt-2">* p &lt; 0.05 (statistically significant). Negative change = improvement.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Correlation Tab */}
        <TabsContent value="correlation" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Symptom Correlation Matrix (last 90 days)</CardTitle>
              <p className="text-xs text-gray-500">Pearson correlation coefficients between symptoms. Blue = positive, orange = negative.</p>
            </CardHeader>
            <CardContent>
              {!correlation || correlation.keys.length === 0 ? (
                <p className="text-gray-400 text-sm">No data available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="p-1 min-w-[120px]" />
                        {correlation.keys.map((k) => (
                          <th key={k} className="p-1 text-center max-w-[60px]">
                            <span className="writing-mode-vertical block truncate text-gray-500 text-[10px]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 60 }}>
                              {correlation.labels[k]}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {correlation.keys.map((rowKey) => (
                        <tr key={rowKey}>
                          <td className="p-1 text-xs text-gray-600 text-right pr-2 font-medium">{correlation.labels[rowKey]}</td>
                          {correlation.keys.map((colKey) => (
                            rowKey === colKey
                              ? <td key={colKey} className="p-1 text-center text-xs bg-gray-100 text-gray-300">1.00</td>
                              : <CorrCell key={colKey} value={correlation.matrix[rowKey][colKey]} />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-gray-400 text-center">This is not medical advice. Discuss these insights with your healthcare provider.</p>
    </div>
  )
}
