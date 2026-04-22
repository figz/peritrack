'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'
import { linearRegression } from '@/lib/stats'

interface DataPoint {
  date: string
  weight: number | null
}

export function WeightTrendChart({
  data,
  medicationChanges,
}: {
  data: DataPoint[]
  medicationChanges: { date: string; name: string }[]
}) {
  const withWeight = data.filter((d) => d.weight !== null)
  if (withWeight.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">No weight data recorded yet.</p>
  }

  const x = withWeight.map((_, i) => i)
  const y = withWeight.map((d) => d.weight!)
  const { slope, intercept } = linearRegression(x, y)
  const chartData = withWeight.map((d, i) => ({ ...d, trend: Math.round((slope * i + intercept) * 10) / 10 }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'MMM d')} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
        <Tooltip
          labelFormatter={(l) => format(parseISO(l as string), 'MMM d, yyyy')}
          formatter={(value, name) => [
            `${value} lbs`,
            name === 'weight' ? 'Weight' : 'Trend',
          ]}
        />
        {medicationChanges.map((mc, i) => (
          <ReferenceLine key={i} x={mc.date} stroke="#7c3aed" strokeDasharray="4 2" label={{ value: mc.name, position: 'top', fontSize: 9, fill: '#7c3aed' }} />
        ))}
        <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="trend" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
