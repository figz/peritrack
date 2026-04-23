'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { getLabTest } from '@/lib/labTests'

interface LabResult {
  id: string
  testDate: string
  testKey: string | null
  testName: string
  value: number
  unit: string
  refRangeLow: number | null
  refRangeHigh: number | null
}

const COLORS = [
  '#0891b2', '#e11d48', '#16a34a', '#ca8a04', '#7c3aed',
  '#ea580c', '#0d9488', '#be185d', '#1d4ed8', '#9333ea',
]

export function LabTrendChart({ results, selectedKeys }: { results: LabResult[]; selectedKeys: string[] }) {
  const active = results.filter(r => r.testKey && selectedKeys.includes(r.testKey))
  if (active.length === 0) return <p className="text-center text-gray-400 text-sm py-8">Select at least one test above.</p>

  // Each selected test gets its own chart since units differ
  return (
    <div className="space-y-8">
      {selectedKeys.map((key, colorIdx) => {
        const testResults = active
          .filter(r => r.testKey === key)
          .sort((a, b) => a.testDate.localeCompare(b.testDate))

        if (testResults.length === 0) return null

        const known = getLabTest(key)
        const unit = testResults[0].unit
        const refLow = testResults[0].refRangeLow ?? known?.refLow
        const refHigh = testResults[0].refRangeHigh ?? known?.refHigh

        const chartData = testResults.map(r => ({ date: r.testDate, value: r.value }))

        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">{known?.name ?? testResults[0].testName}</p>
              {(refLow != null || refHigh != null) && (
                <p className="text-xs text-gray-400">
                  Reference: {refLow ?? '?'} – {refHigh ?? '?'} {unit}
                  {known?.clinicalNote && <span className="ml-2 text-blue-500">{known.clinicalNote}</span>}
                </p>
              )}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={d => format(parseISO(d), 'MMM d')}
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => `${v}`}
                  domain={['auto', 'auto']}
                  label={{ value: unit, angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
                />
                <Tooltip
                  labelFormatter={l => format(parseISO(l as string), 'MMM d, yyyy')}
                  formatter={(v) => [`${v} ${unit}`, known?.name ?? testResults[0].testName]}
                />

                {/* Reference range band */}
                {refLow != null && (
                  <ReferenceLine y={refLow} stroke="#22c55e" strokeDasharray="4 2" strokeWidth={1}
                    label={{ value: `Low ${refLow}`, position: 'right', fontSize: 9, fill: '#22c55e' }} />
                )}
                {refHigh != null && (
                  <ReferenceLine y={refHigh} stroke="#f97316" strokeDasharray="4 2" strokeWidth={1}
                    label={{ value: `High ${refHigh}`, position: 'right', fontSize: 9, fill: '#f97316' }} />
                )}

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={COLORS[colorIdx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 5, fill: COLORS[colorIdx % COLORS.length] }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      })}
    </div>
  )
}
