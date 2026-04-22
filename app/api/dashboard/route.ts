import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { subDays, startOfDay } from 'date-fns'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = startOfDay(new Date())
  const sevenDaysAgo = subDays(today, 7)

  const [
    todayMorning,
    todayEvening,
    recentEntries,
    activeMedications,
    lastPeriodEntry,
    lastWeightEntry,
  ] = await Promise.all([
    prisma.logEntry.findUnique({
      where: { entryDate_entryPeriod: { entryDate: today, entryPeriod: 'morning' } },
    }),
    prisma.logEntry.findUnique({
      where: { entryDate_entryPeriod: { entryDate: today, entryPeriod: 'evening' } },
    }),
    prisma.logEntry.findMany({
      where: { entryDate: { gte: sevenDaysAgo } },
      include: { symptomScores: true, sideEffectScores: true, periodLog: true },
      orderBy: [{ entryDate: 'desc' }, { entryPeriod: 'asc' }],
      take: 5,
    }),
    prisma.medication.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true, dose: true },
      orderBy: { name: 'asc' },
    }),
    prisma.periodLog.findFirst({
      where: { isPresent: true },
      include: { logEntry: { select: { entryDate: true } } },
      orderBy: { logEntry: { entryDate: 'desc' } },
    }),
    prisma.logEntry.findFirst({
      where: { weightLbs: { not: null } },
      select: { entryDate: true, weightLbs: true },
      orderBy: { entryDate: 'desc' },
    }),
  ])

  // Calculate top 5 symptoms from last 7 days
  const last7Entries = await prisma.logEntry.findMany({
    where: { entryDate: { gte: sevenDaysAgo } },
    include: { symptomScores: true },
  })

  const symptomTotals: Record<string, { total: number; count: number; label?: string }> = {}
  for (const entry of last7Entries) {
    for (const s of entry.symptomScores) {
      if (!symptomTotals[s.symptomKey]) symptomTotals[s.symptomKey] = { total: 0, count: 0 }
      symptomTotals[s.symptomKey].total += s.score
      symptomTotals[s.symptomKey].count++
    }
  }

  const symptomDefs = await prisma.symptomDefinition.findMany()
  const defMap = Object.fromEntries(symptomDefs.map((s) => [s.key, s.label]))

  const topSymptoms = Object.entries(symptomTotals)
    .map(([key, { total, count }]) => ({ key, label: defMap[key] ?? key, avg: count > 0 ? total / count : 0 }))
    .filter((s) => s.avg > 0)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)

  return NextResponse.json({
    today: { morning: !!todayMorning, evening: !!todayEvening },
    topSymptoms,
    activeMedications,
    lastPeriodDate: lastPeriodEntry?.logEntry.entryDate ?? null,
    lastWeight: lastWeightEntry ? { value: lastWeightEntry.weightLbs, date: lastWeightEntry.entryDate } : null,
    recentEntries,
  })
}
