import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const days = parseInt(searchParams.get('days') ?? '30')
  const symptoms = searchParams.get('symptoms')?.split(',').filter(Boolean) ?? []

  const fromDate = from ? new Date(from) : subDays(new Date(), days)
  const toDate = to ? new Date(to) : new Date()

  const [entries, medications, events] = await Promise.all([
    prisma.logEntry.findMany({
      where: { entryDate: { gte: fromDate, lte: toDate } },
      include: { symptomScores: true, sideEffectScores: true, periodLog: true, biometrics: true },
      orderBy: { entryDate: 'asc' },
    }),
    prisma.medicationPeriod.findMany({
      include: { medication: { select: { name: true, type: true } } },
      orderBy: { startDate: 'asc' },
    }),
    prisma.lifeEvent.findMany({
      where: { eventDate: { gte: fromDate, lte: toDate } },
      orderBy: { eventDate: 'asc' },
    }),
  ])

  // Build daily data points
  const dateMap: Record<string, {
    date: string
    symptoms: Record<string, number>
    sideEffects: Record<string, number>
    weight: number | null
    periodPresent: boolean
    flowSeverity: number | null
    biometrics: Record<string, number>
    totalBurden: number
  }> = {}

  for (const entry of entries) {
    const dateKey = entry.entryDate.toISOString().split('T')[0]
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = { date: dateKey, symptoms: {}, sideEffects: {}, weight: null, periodPresent: false, flowSeverity: null, biometrics: {}, totalBurden: 0 }
    }
    const day = dateMap[dateKey]

    for (const s of entry.symptomScores) {
      if (symptoms.length === 0 || symptoms.includes(s.symptomKey)) {
        day.symptoms[s.symptomKey] = Math.max(day.symptoms[s.symptomKey] ?? 0, s.score)
      }
    }
    for (const s of entry.sideEffectScores) {
      day.sideEffects[s.sideEffectKey] = Math.max(day.sideEffects[s.sideEffectKey] ?? 0, s.score)
    }
    if (entry.weightLbs) day.weight = Number(entry.weightLbs)
    if (entry.periodLog?.isPresent) {
      day.periodPresent = true
      day.flowSeverity = entry.periodLog.flowSeverity
    }
    for (const b of entry.biometrics) {
      if (b.metricValue) day.biometrics[b.metricKey] = Number(b.metricValue)
    }
    day.totalBurden = Object.values(day.symptoms).reduce((a, b) => a + b, 0)
  }

  return NextResponse.json({
    data: Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)),
    medicationChanges: medications.map((p) => ({
      date: p.startDate.toISOString().split('T')[0],
      name: p.medication.name,
      dose: p.doseAtStart,
    })),
    lifeEvents: events.map((e) => ({
      date: e.eventDate.toISOString().split('T')[0],
      title: e.title,
      category: e.category,
    })),
  })
}
