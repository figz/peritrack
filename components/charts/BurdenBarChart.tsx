'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'

interface DataPoint {
  date: string
  totalBurden: number
}

export function BurdenBarChart({
  data,
  medicationChanges,
  lifeEvents,
}: {
  data: DataPoint[]
  medicationChanges: { date: string; name: string }[]
  lifeEvents: { date: string; title: string }[]
}) {
  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: Math.max(400, data.length * 12) }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => format(parseISO(d), 'MMM d')}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              labelFormatter={(l) => format(parseISO(l as string), 'MMM d, yyyy')}
              formatter={(value) => [value, 'Total Burden']}
            />
            {medicationChanges.map((mc, i) => (
              <ReferenceLine key={`med-${i}`} x={mc.date} stroke="#7c3aed" strokeDasharray="4 2" label={{ value: mc.name, position: 'top', fontSize: 9, fill: '#7c3aed' }} />
            ))}
            {lifeEvents.map((le, i) => (
              <ReferenceLine key={`le-${i}`} x={le.date} stroke="#ca8a04" strokeDasharray="2 4" />
            ))}
            <Bar dataKey="totalBurden" fill="#f43f5e" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
