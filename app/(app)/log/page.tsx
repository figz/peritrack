'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PlusCircle, ChevronLeft, ChevronRight, Eye } from 'lucide-react'

interface LogEntry {
  id: string
  entryDate: string
  notes: string | null
  weightLbs: string | null
  symptomScores: { symptomKey: string; score: number }[]
  sideEffectScores: { sideEffectKey: string; score: number }[]
  periodLog: { isPresent: boolean; flowSeverity: number | null } | null
}

const SCORE_COLORS = ['', 'bg-yellow-100 text-yellow-700', 'bg-orange-100 text-orange-700', 'bg-red-100 text-red-700']

const RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: null },
] as const

export default function LogHistoryPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState<number | null>(30)

  const limit = 20

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (rangeDays !== null) {
      const from = format(subDays(new Date(), rangeDays), 'yyyy-MM-dd')
      params.set('from', from)
    }

    fetch(`/api/log?${params}`)
      .then((r) => r.json())
      .then((d) => { setEntries(d.entries ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [page, rangeDays])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Log History</h1>
        <Button asChild className="bg-rose-600 hover:bg-rose-700 min-h-[44px]">
          <Link href="/log/new"><PlusCircle className="w-4 h-4 mr-2" />New Check-In</Link>
        </Button>
      </div>

      {/* Range filter */}
      <div className="flex gap-2 flex-wrap">
        {RANGES.map(({ label, days }) => (
          <button
            key={label}
            type="button"
            onClick={() => { setRangeDays(days); setPage(1) }}
            className={`min-h-[40px] px-4 py-1.5 rounded-full border text-sm font-medium transition-all ${
              rangeDays === days
                ? 'bg-rose-600 border-rose-600 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse text-gray-400 text-center py-12">Loading…</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-400 mb-4">No entries found.</p>
            <Button asChild variant="outline">
              <Link href="/log/new">Log your first check-in</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-sm text-gray-500">{total} {total === 1 ? 'entry' : 'entries'}</div>
          <div className="space-y-3">
            {entries.map((entry) => {
              const notable = entry.symptomScores.filter((s) => s.score >= 2)
              const totalScore = entry.symptomScores.reduce((a, b) => a + b.score, 0)
              return (
                <Card key={entry.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">
                          {format(new Date(entry.entryDate + 'T00:00:00'), 'EEEE, MMM d, yyyy')}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {notable.slice(0, 4).map((s) => (
                            <Badge key={s.symptomKey} className={`text-xs ${SCORE_COLORS[s.score]}`}>
                              {s.symptomKey.replace(/_/g, ' ')} ({s.score})
                            </Badge>
                          ))}
                          {notable.length > 4 && (
                            <Badge variant="secondary" className="text-xs">+{notable.length - 4} more</Badge>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-gray-400 mt-1 truncate max-w-sm">{entry.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {entry.weightLbs && (
                          <span className="text-xs text-gray-500 hidden sm:inline">{entry.weightLbs} lbs</span>
                        )}
                        {totalScore > 0 && (
                          <span className="text-xs text-gray-500 hidden sm:inline">Score: {totalScore}</span>
                        )}
                        {entry.periodLog?.isPresent && (
                          <Badge className="bg-rose-100 text-rose-700 text-xs">Period</Badge>
                        )}
                        <Button variant="ghost" size="sm" asChild className="min-h-[44px]">
                          <Link href={`/log/new?date=${entry.entryDate}`}>
                            <Eye className="w-4 h-4" aria-hidden />
                            <span className="sr-only">Edit entry</span>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="min-h-[44px]"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="min-h-[44px]"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
