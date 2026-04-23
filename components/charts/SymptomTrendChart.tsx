'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ReferenceArea, ResponsiveContainer
} from 'recharts'
import { format, parseISO } from 'date-fns'

interface DataPoint {
  date: string
  symptoms: Record<string, number>
  periodPresent: boolean
}

interface SymptomDef {
  key: string
  label: string
}

interface MedChange {
  date: string
  name: string
  dose: string | null
}

interface LifeEventMarker {
  date: string
  title: string
  category: string
}

interface PrnMedEvent {
  date: string
  meds: string[]
}

const COLORS = [
  '#e11d48', '#7c3aed', '#0891b2', '#16a34a', '#ca8a04',
  '#9333ea', '#ea580c', '#0d9488', '#be185d', '#1d4ed8',
]

export function SymptomTrendChart({
  data,
  selectedSymptoms,
  symptomDefs,
  medicationChanges,
  lifeEvents,
  prnMedEvents = [],
}: {
  data: DataPoint[]
  selectedSymptoms: string[]
  symptomDefs: SymptomDef[]
  medicationChanges: MedChange[]
  lifeEvents: LifeEventMarker[]
  prnMedEvents?: PrnMedEvent[]
}) {
  const chartData = data.map((d) => ({
    date: d.date,
    ...Object.fromEntries(selectedSymptoms.map((k) => [k, d.symptoms[k] ?? 0])),
    _periodPresent: d.periodPresent,
  }))

  const labelMap = Object.fromEntries(symptomDefs.map((s) => [s.key, s.label]))

  // Period areas
  const periodRanges: { start: string; end: string }[] = []
  let rangeStart: string | null = null
  for (const d of data) {
    if (d.periodPresent && !rangeStart) rangeStart = d.date
    if (!d.periodPresent && rangeStart) {
      periodRanges.push({ start: rangeStart, end: d.date })
      rangeStart = null
    }
  }
  if (rangeStart) periodRanges.push({ start: rangeStart, end: data[data.length - 1]?.date ?? rangeStart })

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: Math.max(400, data.length * 12) }}>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => format(parseISO(d), 'MMM d')}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} tickFormatter={(v) => ['N', 'Mi', 'Mo', 'S'][v] ?? v} tick={{ fontSize: 11 }} />
            <Tooltip
              labelFormatter={(l) => format(parseISO(l as string), 'MMM d, yyyy')}
              formatter={(value, name) => [
                ['None', 'Mild', 'Moderate', 'Severe'][value as number] ?? value,
                labelMap[name as string] ?? name,
              ]}
            />
            <Legend formatter={(value) => labelMap[value] ?? value} />

            {periodRanges.map((r, i) => (
              <ReferenceArea key={i} x1={r.start} x2={r.end} fill="#fce7f3" fillOpacity={0.4} />
            ))}

            {medicationChanges.map((mc, i) => (
              <ReferenceLine
                key={`med-${i}`}
                x={mc.date}
                stroke="#7c3aed"
                strokeDasharray="4 2"
                label={{ value: mc.name, position: 'top', fontSize: 10, fill: '#7c3aed' }}
              />
            ))}

            {lifeEvents.map((le, i) => (
              <ReferenceLine
                key={`le-${i}`}
                x={le.date}
                stroke="#ca8a04"
                strokeDasharray="2 4"
                label={{ value: '★', position: 'top', fontSize: 10, fill: '#ca8a04' }}
              />
            ))}

            {prnMedEvents.map((pe, i) => (
              <ReferenceLine
                key={`prn-${i}`}
                x={pe.date}
                stroke="#16a34a"
                strokeDasharray="3 3"
                label={{ value: '💊', position: 'top', fontSize: 10 }}
              />
            ))}

            {selectedSymptoms.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-4 h-3 bg-rose-100 border border-rose-200 rounded inline-block" /> Period days</span>
        <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-dashed border-purple-600" /> Med change</span>
        <span className="flex items-center gap-1"><span className="text-yellow-600">★</span> Life event</span>
        <span className="flex items-center gap-1"><span className="text-green-600">💊</span> PRN med taken</span>
      </div>
    </div>
  )
}
