'use client'

import { format, parseISO } from 'date-fns'

interface DataPoint {
  date: string
  symptoms: Record<string, number>
}

interface SymptomDef {
  key: string
  label: string
}

const CELL_COLORS = ['#f1f5f9', '#fef9c3', '#fed7aa', '#fecaca']

export function SymptomHeatmap({
  data,
  selectedSymptoms,
  symptomDefs,
}: {
  data: DataPoint[]
  selectedSymptoms: string[]
  symptomDefs: SymptomDef[]
}) {
  const labelMap = Object.fromEntries(symptomDefs.map((s) => [s.key, s.label]))
  const activeKeys = selectedSymptoms.filter((k) => data.some((d) => d.symptoms[k] > 0))

  const displayDates = data.slice(-60) // max 60 days for readability
  const stepEvery = Math.ceil(displayDates.length / 10)

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: Math.max(400, displayDates.length * 14 + 200) }}>
        {/* Header row */}
        <div className="flex ml-[180px] mb-1 gap-0">
          {displayDates.map((d, i) => (
            <div key={d.date} style={{ width: 14, flexShrink: 0 }} className="text-center">
              {i % stepEvery === 0 && (
                <span className="text-[10px] text-gray-400 block -rotate-45 origin-bottom-left w-16 overflow-hidden">
                  {format(parseISO(d.date), 'MMM d')}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-8 space-y-1">
          {activeKeys.map((key) => (
            <div key={key} className="flex items-center gap-0">
              <div className="w-[180px] shrink-0 text-xs text-gray-600 pr-3 text-right truncate">{labelMap[key] ?? key}</div>
              {displayDates.map((d) => {
                const score = d.symptoms[key] ?? 0
                return (
                  <div
                    key={d.date}
                    title={`${labelMap[key]} on ${d.date}: ${['None', 'Mild', 'Moderate', 'Severe'][score]}`}
                    style={{ width: 14, height: 14, flexShrink: 0, backgroundColor: CELL_COLORS[score] }}
                    className="border border-white rounded-[2px]"
                    role="cell"
                    aria-label={`${score}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 ml-[180px] text-xs text-gray-500">
          {['None', 'Mild', 'Moderate', 'Severe'].map((l, i) => (
            <span key={i} className="flex items-center gap-1">
              <span style={{ width: 14, height: 14, backgroundColor: CELL_COLORS[i] }} className="inline-block rounded-sm border border-gray-200" />
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
