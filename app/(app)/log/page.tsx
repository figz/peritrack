'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sun, Moon, PlusCircle, ChevronLeft, ChevronRight, Eye } from 'lucide-react'

interface LogEntry {
  id: string
  entryDate: string
  entryPeriod: string
  notes: string | null
  weightLbs: string | null
  symptomScores: { symptomKey: string; score: number }[]
  sideEffectScores: { sideEffectKey: string; score: number }[]
  periodLog: { isPresent: boolean; flowSeverity: number | null } | null
}

const SCORE_COLORS = ['', 'bg-yellow-100 text-yellow-700', 'bg-orange-100 text-orange-700', 'bg-red-100 text-red-700']

export default function LogHistoryPage() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [periodFilter, setPeriodFilter] = useState('all')

  const limit = 20

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    if (periodFilter !== 'all') params.set('period', periodFilter)

    fetch(`/api/log?${params}`)
      .then((r) => r.json())
      .then((d) => { setEntries(d.entries ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [page, fromDate, toDate, periodFilter])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Log History</h1>
        <Button asChild className="bg-rose-600 hover:bg-rose-700 min-h-[44px]">
          <Link href="/log/new"><PlusCircle className="w-4 h-4 mr-2" />New Check-In</Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="from-date" className="text-xs text-gray-500">From</Label>
              <Input id="from-date" type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1) }} className="min-h-[44px]" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to-date" className="text-xs text-gray-500">To</Label>
              <Input id="to-date" type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1) }} className="min-h-[44px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Period</Label>
              <Select value={periodFilter} onValueChange={(v) => { setPeriodFilter(v); setPage(1) }}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
          <div className="text-sm text-gray-500">{total} entries total</div>
          <div className="space-y-3">
            {entries.map((entry) => {
              const notable = entry.symptomScores.filter((s) => s.score >= 2)
              const totalScore = entry.symptomScores.reduce((a, b) => a + b.score, 0)
              return (
                <Card key={entry.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {entry.entryPeriod === 'morning'
                          ? <Sun className="w-5 h-5 text-amber-400 shrink-0" />
                          : <Moon className="w-5 h-5 text-indigo-400 shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">
                            {format(new Date(entry.entryDate), 'EEEE, MMM d, yyyy')}
                            <span className="text-gray-400 font-normal ml-2 text-sm capitalize">{entry.entryPeriod}</span>
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
                          <Link href={`/log/new?date=${entry.entryDate}&period=${entry.entryPeriod}`}>
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
