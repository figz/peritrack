'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, isToday } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PlusCircle, Sun, Moon, Droplets, Scale, Pill, Activity } from 'lucide-react'

interface DashboardData {
  today: { morning: boolean; evening: boolean }
  topSymptoms: { key: string; label: string; avg: number }[]
  activeMedications: { id: string; name: string; type: string; dose: string | null }[]
  lastPeriodDate: string | null
  lastWeight: { value: number; date: string } | null
  recentEntries: {
    id: string
    entryDate: string
    entryPeriod: string
    notes: string | null
    symptomScores: { symptomKey: string; score: number }[]
  }[]
}

const severityLabel = ['None', 'Mild', 'Moderate', 'Severe']
const severityColor = ['text-gray-400', 'text-yellow-600', 'text-orange-500', 'text-red-500']
const severityBg = ['bg-gray-100', 'bg-yellow-50', 'bg-orange-50', 'bg-red-50']

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="animate-pulse text-gray-400 p-8">Loading…</div>
  if (!data) return <div className="text-red-500 p-8">Failed to load dashboard.</div>

  const now = new Date()
  const isMorning = now.getHours() < 12
  const quickLogPeriod = isMorning ? 'morning' : 'evening'
  const quickLogDone = isMorning ? data.today.morning : data.today.evening

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good {isMorning ? 'morning' : 'evening'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{format(now, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Button asChild className="bg-rose-600 hover:bg-rose-700 min-h-[44px]">
          <Link href={`/log/new?period=${quickLogPeriod}`}>
            <PlusCircle className="w-4 h-4 mr-2" aria-hidden />
            {quickLogDone ? 'Edit ' : ''}{isMorning ? 'Morning' : 'Evening'} Check-In
          </Link>
        </Button>
      </div>

      {/* Today's status */}
      <div className="grid grid-cols-2 gap-4">
        <Card className={data.today.morning ? 'border-green-200 bg-green-50' : ''}>
          <CardContent className="flex items-center gap-3 p-4">
            <Sun className={`w-6 h-6 shrink-0 ${data.today.morning ? 'text-green-600' : 'text-gray-300'}`} aria-hidden />
            <div>
              <p className="font-medium text-sm">Morning Check-In</p>
              <p className={`text-xs ${data.today.morning ? 'text-green-600' : 'text-gray-400'}`}>
                {data.today.morning ? 'Logged ✓' : 'Not logged'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className={data.today.evening ? 'border-green-200 bg-green-50' : ''}>
          <CardContent className="flex items-center gap-3 p-4">
            <Moon className={`w-6 h-6 shrink-0 ${data.today.evening ? 'text-green-600' : 'text-gray-300'}`} aria-hidden />
            <div>
              <p className="font-medium text-sm">Evening Check-In</p>
              <p className={`text-xs ${data.today.evening ? 'text-green-600' : 'text-gray-400'}`}>
                {data.today.evening ? 'Logged ✓' : 'Not logged'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Top symptoms */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Activity className="w-4 h-4" aria-hidden /> Top Symptoms (last 7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topSymptoms.length === 0 ? (
              <p className="text-sm text-gray-400">No symptoms logged yet.</p>
            ) : (
              <div className="space-y-2">
                {data.topSymptoms.map((s) => {
                  const level = Math.round(s.avg) as 0 | 1 | 2 | 3
                  return (
                    <div key={s.key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{s.label}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${severityBg[level]} ${severityColor[level]}`}>
                        {severityLabel[level]} ({s.avg.toFixed(1)})
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="space-y-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Pill className="w-5 h-5 text-purple-500 shrink-0" aria-hidden />
              <div>
                <p className="text-xs text-gray-500">Active Medications</p>
                <p className="font-semibold">{data.activeMedications.length}</p>
                {data.activeMedications.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[140px]">
                    {data.activeMedications.map((m) => m.name).join(', ')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Droplets className="w-5 h-5 text-rose-400 shrink-0" aria-hidden />
              <div>
                <p className="text-xs text-gray-500">Last Period</p>
                <p className="font-semibold text-sm">
                  {data.lastPeriodDate
                    ? isToday(new Date(data.lastPeriodDate))
                      ? 'Today'
                      : format(new Date(data.lastPeriodDate), 'MMM d')
                    : 'Not recorded'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Scale className="w-5 h-5 text-blue-400 shrink-0" aria-hidden />
              <div>
                <p className="text-xs text-gray-500">Last Weight</p>
                <p className="font-semibold text-sm">
                  {data.lastWeight ? `${data.lastWeight.value} lbs` : 'Not recorded'}
                </p>
                {data.lastWeight && (
                  <p className="text-xs text-gray-400">{format(new Date(data.lastWeight.date), 'MMM d')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild className="min-h-[44px]">
            <Link href="/log/new?period=morning"><Sun className="w-4 h-4 mr-1" aria-hidden />Morning</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="min-h-[44px]">
            <Link href="/log/new?period=evening"><Moon className="w-4 h-4 mr-1" aria-hidden />Evening</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="min-h-[44px]">
            <Link href="/log/new?section=period"><Droplets className="w-4 h-4 mr-1" aria-hidden />Log Period</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="min-h-[44px]">
            <Link href="/medications"><Pill className="w-4 h-4 mr-1" aria-hidden />Medications</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent entries */}
      {data.recentEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Recent Entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentEntries.map((entry) => {
              const notable = entry.symptomScores.filter((s) => s.score >= 2)
              return (
                <Link key={entry.id} href={`/log?entry=${entry.id}`} className="block">
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      {entry.entryPeriod === 'morning' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                      <div>
                        <p className="text-sm font-medium">{format(new Date(entry.entryDate), 'MMM d')} — {entry.entryPeriod}</p>
                        {entry.notes && <p className="text-xs text-gray-400 truncate max-w-[200px]">{entry.notes}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 max-w-[160px] justify-end">
                      {notable.slice(0, 3).map((s) => (
                        <Badge key={s.symptomKey} variant="secondary" className={`text-xs ${s.score === 3 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {s.symptomKey.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                      {notable.length > 3 && <Badge variant="secondary" className="text-xs">+{notable.length - 3}</Badge>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
