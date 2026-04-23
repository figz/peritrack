'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Printer, Loader2, Brain } from 'lucide-react'

interface ReportData {
  reportDate: string
  dataRange: { days: number; from: string; to: string; entryCount: number }
  activeMedications: { id: string; name: string; type: string; dose: string | null; frequency: string | null }[]
  medications: { medication: string; type: string; dose: string | null; startDate: string; endDate: string | null; changeReason: string | null; isActive: boolean }[]
  symptoms: { key: string; label: string; category: string | null; avg: number; recentAvg: number; maxScore: number; trend: string; daysPresent: number; totalDays: number; persistent: boolean }[]
  sideEffects: { key: string; label: string; avg: number; daysPresent: number }[]
  period: { dayCount: number; spottingCount: number; totalDays: number; spottingColors: string[] }
  weight: { points: { date: string; value: number }[]; trend: { slope: number; startWeight: number; endWeight: number; change: number } | null }
  biometrics: ({ key: string; label: string; unit: string; avg: number; count: number } | null)[]
  prnMeds: { name: string; daysTaken: number; totalDays: number; topReasons: string[]; doses: string[] }[]
  lifeEvents: { date: string; category: string; title: string; description: string | null }[]
}

const TYPE_LABELS: Record<string, string> = { medication: 'Medication', hrt: 'HRT', supplement: 'Supplement', other: 'Other' }
const TREND_LABELS: Record<string, string> = { improving: '↓ Improving', stable: '→ Stable', worsening: '↑ Worsening' }
const TREND_COLORS: Record<string, string> = { improving: 'text-green-700', stable: 'text-gray-500', worsening: 'text-red-600' }

function d(s: string) { return format(new Date(s + 'T00:00:00'), 'MMM d, yyyy') }

export default function ReportPage() {
  const [days, setDays] = useState('90')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<string | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)
  const hasAI = true // will 503 gracefully if key missing

  const load = (d: string) => {
    setLoading(true)
    setInsights(null)
    fetch(`/api/report?days=${d}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(days) }, [])

  const generateInsights = async () => {
    setInsightsLoading(true)
    setInsightsError(null)
    const res = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: parseInt(days) }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setInsightsError(err.error ?? 'Failed to generate insights')
    } else {
      const json = await res.json()
      setInsights(json.insights)
    }
    setInsightsLoading(false)
  }

  const topSymptoms = data?.symptoms.filter(s => s.avg > 0).sort((a, b) => b.avg - a.avg).slice(0, 20) ?? []
  const persistentSymptoms = data?.symptoms.filter(s => s.persistent) ?? []
  const worseningSymptoms = data?.symptoms.filter(s => s.trend === 'worsening' && s.avg > 0.5) ?? []

  return (
    <>
      {/* Controls — hidden when printing */}
      <div className="print:hidden space-y-4 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Visit Report</h1>
            <p className="text-sm text-gray-500 mt-0.5">A clinical summary to bring to your healthcare provider.</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={days} onValueChange={(v) => { setDays(v); load(v) }}>
              <SelectTrigger className="w-36 min-h-[44px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={generateInsights}
              disabled={insightsLoading || !data || data.dataRange.entryCount < 3}
              className="min-h-[44px] gap-2"
            >
              {insightsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {insights ? 'Regenerate AI Summary' : 'Add AI Summary'}
            </Button>
            <Button onClick={() => window.print()} className="bg-rose-600 hover:bg-rose-700 min-h-[44px] gap-2">
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </Button>
          </div>
        </div>
        {insightsError && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{insightsError}</p>}
        {loading && <p className="text-gray-400 animate-pulse">Loading report data…</p>}
      </div>

      {data && (
        <div className="max-w-3xl mx-auto space-y-8 print:space-y-6" id="report-content">

          {/* Header */}
          <div className="border-b-2 border-gray-900 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PeriTrack — Medical Summary Report</h1>
                <p className="text-gray-600 mt-1">Perimenopause Symptom & HRT Tracking</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>Report Date: <strong>{d(data.reportDate)}</strong></p>
                <p>Data Period: {d(data.dataRange.from)} – {d(data.dataRange.to)}</p>
                <p>{data.dataRange.entryCount} log entries</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400 italic">
              This report summarizes patient-logged health data. It is not a medical diagnosis. Please discuss all findings with your healthcare provider.
            </p>
          </div>

          {/* 1. Current Medications & HRT */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-1 mb-3">1. Current Medications &amp; HRT</h2>
            {data.activeMedications.length === 0 ? (
              <p className="text-gray-500 text-sm">No active medications recorded.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Type</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Dose</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activeMedications.map((m, i) => (
                    <tr key={m.id} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                      <td className="py-2 px-3 font-medium">{m.name}</td>
                      <td className="py-2 px-3 text-gray-600">{TYPE_LABELS[m.type] ?? m.type}</td>
                      <td className="py-2 px-3 text-gray-600">{m.dose ?? '—'}</td>
                      <td className="py-2 px-3 text-gray-600">{m.frequency ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Medication history during data period */}
            {data.medications.filter(m => !m.isActive || m.endDate).length > 0 && (
              <div className="mt-3">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Changes During Report Period</h3>
                <div className="space-y-1">
                  {data.medications.filter(m => m.endDate || !m.isActive).map((m, i) => (
                    <div key={i} className="text-sm text-gray-600">
                      <span className="font-medium">{m.medication}</span>
                      {m.dose && ` (${m.dose})`}
                      : started {d(m.startDate)}
                      {m.endDate && ` → stopped ${d(m.endDate)}`}
                      {m.changeReason && <span className="text-gray-400"> — {m.changeReason}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 2. Symptom Summary */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-1 mb-3">2. Symptom Summary</h2>
            <p className="text-xs text-gray-500 mb-3">Severity scale: 0 = None, 1 = Mild, 2 = Moderate, 3 = Severe. Sorted by average severity.</p>

            {persistentSymptoms.length > 0 && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-700 mb-1">Persistent Symptoms (severity ≥2 on more than half of recent days)</p>
                <p className="text-sm text-red-600">{persistentSymptoms.map(s => s.label).join(', ')}</p>
              </div>
            )}

            {topSymptoms.length === 0 ? (
              <p className="text-gray-500 text-sm">No symptoms logged during this period.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Symptom</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Category</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Avg</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Recent 14d</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Max</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Days Present</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {topSymptoms.map((s, i) => (
                    <tr key={s.key} className={`${i % 2 === 0 ? '' : 'bg-gray-50'} ${s.persistent ? 'font-medium' : ''}`}>
                      <td className="py-2 px-3">
                        {s.label}
                        {s.persistent && <span className="ml-1 text-xs text-red-600">●</span>}
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-xs">{s.category ?? '—'}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`font-medium ${s.avg >= 2 ? 'text-red-600' : s.avg >= 1 ? 'text-orange-500' : 'text-gray-600'}`}>
                          {s.avg.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-gray-600">{s.recentAvg.toFixed(1)}</td>
                      <td className="py-2 px-3 text-center text-gray-600">{s.maxScore}</td>
                      <td className="py-2 px-3 text-center text-gray-500 text-xs">{s.daysPresent}/{s.totalDays}</td>
                      <td className={`py-2 px-3 text-center text-xs font-medium ${TREND_COLORS[s.trend]}`}>
                        {TREND_LABELS[s.trend] ?? s.trend}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* 3. Side Effects */}
          {data.sideEffects.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-1 mb-3">3. Medication Side Effects</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Side Effect</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Average Severity</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Days Present</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sideEffects.map((se, i) => (
                    <tr key={se.key} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                      <td className="py-2 px-3">{se.label}</td>
                      <td className={`py-2 px-3 text-center font-medium ${se.avg >= 2 ? 'text-red-600' : 'text-orange-500'}`}>{se.avg.toFixed(1)}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{se.daysPresent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* 4. Period & Cycle Tracking */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-1 mb-3">4. Period &amp; Cycle Tracking</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-rose-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-rose-700">{data.period.dayCount}</p>
                <p className="text-xs text-rose-600 mt-1">Period Days</p>
                <p className="text-xs text-gray-400">out of {data.period.totalDays} logged</p>
              </div>
              <div className="bg-pink-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-pink-700">{data.period.spottingCount}</p>
                <p className="text-xs text-pink-600 mt-1">Spotting Days</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-2xl font-bold text-gray-700">
                  {data.period.totalDays > 0 ? Math.round((data.period.dayCount / data.period.totalDays) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-600 mt-1">Days with Period</p>
              </div>
            </div>
            {data.period.spottingColors.length > 0 && (
              <p className="text-sm text-gray-600 mt-3">
                Spotting colors recorded: {[...new Set(data.period.spottingColors)].map(c => (c as string).replace('_', ' ')).join(', ')}
              </p>
            )}
          </section>

          {/* 5. Biometrics & Weight */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-1 mb-3">5. Biometrics &amp; Weight</h2>
            {data.weight.trend ? (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
                <p className="font-semibold text-blue-800">Weight</p>
                <p className="text-blue-700 mt-1">
                  {data.weight.trend.startWeight} lbs → {data.weight.trend.endWeight} lbs
                  <span className={`ml-2 font-medium ${data.weight.trend.change > 0 ? 'text-orange-600' : data.weight.trend.change < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    ({data.weight.trend.change > 0 ? '+' : ''}{data.weight.trend.change} lbs over {days} days)
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-4">No weight data recorded.</p>
            )}

            {data.biometrics.filter(Boolean).length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Metric</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Average</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Readings</th>
                  </tr>
                </thead>
                <tbody>
                  {data.biometrics.filter(Boolean).map((b, i) => (
                    <tr key={b!.key} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                      <td className="py-2 px-3">{b!.label}</td>
                      <td className="py-2 px-3 text-center font-medium">{b!.avg} {b!.unit}</td>
                      <td className="py-2 px-3 text-center text-gray-500">{b!.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* 6. As-Needed Medications */}
          {data.prnMeds.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-1 mb-3">6. As-Needed Medications</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Medication</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Days Taken</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Frequency</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Doses Used</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Common Reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {data.prnMeds.map((m, i) => (
                    <tr key={m.name} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                      <td className="py-2 px-3 font-medium">{m.name}</td>
                      <td className="py-2 px-3 text-center">{m.daysTaken}</td>
                      <td className="py-2 px-3 text-center text-gray-500 text-xs">{m.daysTaken}/{m.totalDays} days ({Math.round(m.daysTaken / m.totalDays * 100)}%)</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{m.doses.length ? m.doses.join(', ') : '—'}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{m.topReasons.length ? m.topReasons.join(', ') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* 7. Life Events */}
          {data.lifeEvents.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-1 mb-3">7. Life Events &amp; Context</h2>
              <div className="space-y-2">
                {data.lifeEvents.map((e, i) => (
                  <div key={i} className="text-sm flex gap-3">
                    <span className="text-gray-400 shrink-0 w-28">{d(e.date)}</span>
                    <span className="text-gray-500 capitalize shrink-0 w-20">[{e.category}]</span>
                    <div>
                      <span className="font-medium text-gray-800">{e.title}</span>
                      {e.description && <span className="text-gray-500"> — {e.description}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 8. AI Clinical Summary */}
          {insights && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-1 mb-3">8. AI-Generated Clinical Summary</h2>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                {insights}
              </div>
              <p className="mt-4 text-xs text-gray-400 italic border-t border-gray-100 pt-3">
                AI summary generated by Claude (Anthropic). This is not medical advice. All findings should be reviewed and interpreted by a qualified healthcare provider.
              </p>
            </section>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 text-xs text-gray-400 text-center">
            Generated by PeriTrack on {d(data.reportDate)} · {data.dataRange.entryCount} entries over {data.dataRange.days} days · Not a medical diagnosis
          </div>
        </div>
      )}
    </>
  )
}
