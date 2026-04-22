'use client'

import { useMemo } from 'react'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, startOfWeek, endOfWeek } from 'date-fns'

interface DataPoint {
  date: string
  periodPresent: boolean
  flowSeverity: number | null
}

const FLOW_CONFIG = [
  { bg: 'bg-white', text: 'text-gray-400', label: 'None' },
  { bg: 'bg-rose-100', text: 'text-rose-500', label: 'Light' },
  { bg: 'bg-rose-300', text: 'text-rose-700', label: 'Moderate' },
  { bg: 'bg-rose-500', text: 'text-white', label: 'Heavy' },
]

export function PeriodCalendar({ data }: { data: DataPoint[] }) {
  const dataMap = useMemo(() => {
    const m: Record<string, DataPoint> = {}
    data.forEach((d) => { m[d.date] = d })
    return m
  }, [data])

  const today = new Date()
  const months = useMemo(() => {
    const seen = new Set<string>()
    const result: Date[] = []
    data.forEach((d) => {
      const key = d.date.substring(0, 7)
      if (!seen.has(key)) { seen.add(key); result.push(new Date(d.date)) }
    })
    if (result.length === 0) result.push(today)
    return result.slice(-3)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  return (
    <div className="space-y-6">
      {months.map((month) => {
        const monthStart = startOfMonth(month)
        const monthEnd = endOfMonth(month)
        const calStart = startOfWeek(monthStart)
        const calEnd = endOfWeek(monthEnd)
        const days = eachDayOfInterval({ start: calStart, end: calEnd })

        return (
          <div key={format(month, 'yyyy-MM')}>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{format(month, 'MMMM yyyy')}</h3>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className="text-xs text-gray-400 font-medium py-1">{d}</div>
              ))}
              {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const d = dataMap[key]
                const inMonth = isSameMonth(day, month)
                const flow = d?.periodPresent ? (d.flowSeverity ?? 1) : 0
                const cfg = FLOW_CONFIG[flow]
                return (
                  <div
                    key={key}
                    title={inMonth ? `${key}: ${cfg.label}` : undefined}
                    className={`aspect-square flex items-center justify-center rounded-full text-xs font-medium transition-colors ${
                      inMonth
                        ? `${cfg.bg} ${cfg.text} border border-gray-100`
                        : 'text-gray-200'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-2">
        {FLOW_CONFIG.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className={`w-4 h-4 rounded-full ${c.bg} border border-gray-200 inline-block`} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}
