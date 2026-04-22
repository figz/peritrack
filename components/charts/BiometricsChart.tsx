'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'

interface DataPoint {
  date: string
  biometrics: Record<string, number>
}

const METRICS = [
  { key: 'heart_rate', label: 'Heart Rate (bpm)', color: '#ef4444' },
  { key: 'sleep_hours', label: 'Sleep (hours)', color: '#8b5cf6' },
  { key: 'bp_systolic', label: 'BP Systolic (mmHg)', color: '#3b82f6' },
  { key: 'bp_diastolic', label: 'BP Diastolic (mmHg)', color: '#06b6d4' },
]

export function BiometricsChart({ data }: { data: DataPoint[] }) {
  const [selectedMetric, setSelectedMetric] = useState(METRICS[0].key)
  const metric = METRICS.find((m) => m.key === selectedMetric) ?? METRICS[0]

  const chartData = data.filter((d) => d.biometrics[selectedMetric] !== undefined).map((d) => ({
    date: d.date,
    value: d.biometrics[selectedMetric],
  }))

  if (chartData.length === 0) {
    return (
      <div className="space-y-4">
        <MetricSelector value={selectedMetric} onChange={setSelectedMetric} />
        <p className="text-gray-400 text-sm text-center py-8">No {metric.label} data recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <MetricSelector value={selectedMetric} onChange={setSelectedMetric} />
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'MMM d')} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
          <Tooltip
            labelFormatter={(l) => format(parseISO(l as string), 'MMM d, yyyy')}
            formatter={(value) => [value, metric.label]}
          />
          <Line type="monotone" dataKey="value" stroke={metric.color} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function MetricSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {METRICS.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onChange(m.key)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${value === m.key ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          style={value === m.key ? { backgroundColor: m.color } : undefined}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
