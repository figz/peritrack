'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown, AlertTriangle, Brain, Loader2 } from 'lucide-react'

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

interface RegressionPredictor {
  name: string
  key: string
  coefficient: number
  tStat: number
  pValue: number
  significant: boolean
  interpretation: string
}

interface RegressionResult {
  target: { key: string; label: string }
  r2: number
  adjustedR2: number
  n: number
  predictors: RegressionPredictor[]
  symptoms: { key: string; label: string }[]
}

interface InsightsResult {
  insights: string
  generatedAt: string
  dataRange: { days: number; entries: number }
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

  // Regression state
  const [regressionSymptoms, setRegressionSymptoms] = useState<{ key: string; label: string }[]>([])
  const [regressionTarget, setRegressionTarget] = useState('')
  const [regressionDays, setRegressionDays] = useState(90)
  const [regressionResult, setRegressionResult] = useState<RegressionResult | null>(null)
  const [regressionLoading, setRegressionLoading] = useState(false)
  const [regressionError, setRegressionError] = useState('')

  // AI Insights state
  const [insights, setInsights] = useState<InsightsResult | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState('')
  const [insightsDays, setInsightsDays] = useState(90)

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

    // Load symptom list for regression target selector
    fetch('/api/analysis?type=correlation&days=90')
      .then(r => r.json())
      .then((co: CorrelationResult) => {
        if (co?.keys?.length) {
          const syms = co.keys.map(k => ({ key: k, label: co.labels[k] }))
          setRegressionSymptoms(syms)
          setRegressionTarget(syms[0]?.key ?? '')
        }
      })
      .catch(() => {})
  }, [])

  function runRegression() {
    if (!regressionTarget) return
    setRegressionLoading(true)
    setRegressionError('')
    setRegressionResult(null)
    fetch(`/api/analysis?type=regression&target=${regressionTarget}&days=${regressionDays}`)
      .then(r => r.json())
      .then((data) => {
        if (data.error) { setRegressionError(data.error); return }
        setRegressionResult(data)
      })
      .catch(() => setRegressionError('Failed to run regression'))
      .finally(() => setRegressionLoading(false))
  }

  function generateInsights() {
    setInsightsLoading(true)
    setInsightsError('')
    setInsights(null)
    fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: insightsDays }),
    })
      .then(r => r.json())
      .then((data) => {
        if (data.error) { setInsightsError(data.error); return }
        setInsights(data)
      })
      .catch(() => setInsightsError('Failed to generate insights'))
      .finally(() => setInsightsLoading(false))
  }

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
          <TabsTrigger value="regression">Regression</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
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
        {/* Regression Tab */}
        <TabsContent value="regression" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Multiple Linear Regression</CardTitle>
              <p className="text-xs text-gray-500">Identify which factors are statistically associated with a target symptom.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Target symptom</label>
                  <select
                    className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-800 bg-white min-w-[200px]"
                    value={regressionTarget}
                    onChange={e => { setRegressionTarget(e.target.value); setRegressionResult(null) }}
                  >
                    {regressionSymptoms.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Date range</label>
                  <select
                    className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-800 bg-white"
                    value={regressionDays}
                    onChange={e => { setRegressionDays(Number(e.target.value)); setRegressionResult(null) }}
                  >
                    <option value={30}>Last 30 days</option>
                    <option value={60}>Last 60 days</option>
                    <option value={90}>Last 90 days</option>
                    <option value={180}>Last 180 days</option>
                  </select>
                </div>
                <Button onClick={runRegression} disabled={regressionLoading || !regressionTarget} className="bg-rose-600 hover:bg-rose-700 text-white">
                  {regressionLoading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Running…</> : 'Run Analysis'}
                </Button>
              </div>

              {regressionError && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">{regressionError}</div>
              )}

              {regressionResult && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center min-w-[100px]">
                      <p className="text-2xl font-bold text-gray-900">{(regressionResult.r2 * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-500 mt-0.5">R² (variance explained)</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center min-w-[100px]">
                      <p className="text-2xl font-bold text-gray-900">{(regressionResult.adjustedR2 * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-500 mt-0.5">Adjusted R²</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center min-w-[100px]">
                      <p className="text-2xl font-bold text-gray-900">{regressionResult.n}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Days analyzed</p>
                    </div>
                  </div>

                  {regressionResult.predictors.filter(p => p.significant).length > 0 && (
                    <div className="rounded-lg bg-purple-50 border border-purple-100 p-3 space-y-1">
                      <p className="text-xs font-semibold text-purple-700 mb-2">Significant predictors of {regressionResult.target.label}:</p>
                      {regressionResult.predictors.filter(p => p.significant).map(p => (
                        <p key={p.key} className="text-xs text-purple-800">• {p.interpretation}</p>
                      ))}
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 text-xs text-gray-500 font-medium">Predictor</th>
                          <th className="text-center py-2 text-xs text-gray-500 font-medium">Coeff (β)</th>
                          <th className="text-center py-2 text-xs text-gray-500 font-medium">t-stat</th>
                          <th className="text-center py-2 text-xs text-gray-500 font-medium">p-value</th>
                          <th className="text-center py-2 text-xs text-gray-500 font-medium">Sig.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regressionResult.predictors.slice(0, 20).map(p => (
                          <tr key={p.key} className={`border-b border-gray-50 ${p.significant ? 'bg-purple-50/40' : ''}`}>
                            <td className="py-1.5 text-gray-700 text-sm">{p.name}</td>
                            <td className={`text-center py-1.5 font-mono text-xs ${p.coefficient > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {p.coefficient > 0 ? '+' : ''}{p.coefficient.toFixed(3)}
                            </td>
                            <td className="text-center py-1.5 text-gray-500 font-mono text-xs">{p.tStat.toFixed(2)}</td>
                            <td className="text-center py-1.5 text-gray-500 font-mono text-xs">{p.pValue.toFixed(3)}</td>
                            <td className="text-center py-1.5">
                              {p.significant ? <Badge className="bg-purple-100 text-purple-700 text-[10px]">p&lt;0.05</Badge> : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400">Positive β = predictor associated with higher severity. Negative β = associated with lower severity. p&lt;0.05 indicates statistical significance.</p>
                </div>
              )}

              {!regressionResult && !regressionLoading && !regressionError && (
                <p className="text-sm text-gray-400 text-center py-6">Select a target symptom and click Run Analysis.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                AI Clinical Insights
              </CardTitle>
              <p className="text-xs text-gray-500">Claude analyzes your health data and generates a structured summary to support conversations with your healthcare provider.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Date range</label>
                  <select
                    className="border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-800 bg-white"
                    value={insightsDays}
                    onChange={e => { setInsightsDays(Number(e.target.value)); setInsights(null) }}
                  >
                    <option value={30}>Last 30 days</option>
                    <option value={60}>Last 60 days</option>
                    <option value={90}>Last 90 days</option>
                    <option value={180}>Last 180 days</option>
                  </select>
                </div>
                <Button onClick={generateInsights} disabled={insightsLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {insightsLoading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Generating…</> : <><Brain className="w-4 h-4 mr-1.5" />Generate Insights</>}
                </Button>
              </div>

              {insightsError && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">{insightsError}</div>
              )}

              {insights && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">Generated {new Date(insights.generatedAt).toLocaleString()} · {insights.dataRange.entries} log entries over {insights.dataRange.days} days</p>
                  </div>
                  <div className="rounded-lg border border-purple-100 bg-purple-50/30 p-4">
                    <div className="prose prose-sm max-w-none text-gray-800">
                      {insights.insights.split('\n').map((line, i) => {
                        const isBold = line.startsWith('**') && line.includes('**')
                        const content = line.replace(/\*\*/g, '')
                        if (!line.trim()) return <div key={i} className="h-2" />
                        if (isBold && line.trim().startsWith('**') && line.trim().endsWith('**')) {
                          return <p key={i} className="font-semibold text-gray-900 mt-4 mb-1 text-sm">{content}</p>
                        }
                        if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                          return <p key={i} className="text-sm text-gray-700 pl-4">{line}</p>
                        }
                        return <p key={i} className="text-sm text-gray-700">{line}</p>
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 italic">This AI summary is for informational purposes only and does not constitute medical advice. Always discuss findings with your healthcare provider.</p>
                </div>
              )}

              {!insights && !insightsLoading && !insightsError && (
                <div className="text-center py-8 space-y-2">
                  <Brain className="w-10 h-10 text-purple-200 mx-auto" />
                  <p className="text-sm text-gray-400">Click Generate Insights to get a Claude AI analysis of your health data.</p>
                  <p className="text-xs text-gray-400">Requires ANTHROPIC_API_KEY to be configured.</p>
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
