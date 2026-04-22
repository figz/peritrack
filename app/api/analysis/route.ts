import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { mean, pearsonCorrelation, pairedTTest, rollingAverage, trendDirection } from '@/lib/stats'
import { subDays } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  if (type === 'medication-impact') {
    return getMedicationImpact()
  }
  if (type === 'correlation') {
    const days = parseInt(searchParams.get('days') ?? '90')
    return getCorrelations(days)
  }
  if (type === 'trends') {
    return getTrends()
  }

  return NextResponse.json({ error: 'Unknown analysis type' }, { status: 400 })
}

async function getMedicationImpact() {
  const medications = await prisma.medication.findMany({
    include: { periods: { orderBy: { startDate: 'asc' } } },
  })

  const symptoms = await prisma.symptomDefinition.findMany({ where: { isActive: true } })
  const results = []

  for (const med of medications) {
    for (const period of med.periods) {
      const beforeStart = subDays(period.startDate, 14)
      const afterEnd = period.endDate ? new Date(Math.min(period.endDate.getTime(), Date.now())) : new Date()
      const afterEnd14 = subDays(afterEnd, Math.max(0, (afterEnd.getTime() - period.startDate.getTime()) / 86400000 - 14))

      const [beforeEntries, afterEntries] = await Promise.all([
        prisma.logEntry.findMany({
          where: { entryDate: { gte: beforeStart, lt: period.startDate } },
          include: { symptomScores: true },
        }),
        prisma.logEntry.findMany({
          where: { entryDate: { gte: period.startDate, lte: afterEnd } },
          include: { symptomScores: true },
        }),
      ])

      const symptomResults = symptoms.map((symptom) => {
        const beforeScores = beforeEntries.map((e) => e.symptomScores.find((s) => s.symptomKey === symptom.key)?.score ?? 0)
        const afterScores = afterEntries.map((e) => e.symptomScores.find((s) => s.symptomKey === symptom.key)?.score ?? 0)
        const beforeAvg = mean(beforeScores)
        const afterAvg = mean(afterScores)
        const delta = afterAvg - beforeAvg
        const { pValue } = pairedTTest(beforeScores.slice(0, afterScores.length), afterScores.slice(0, beforeScores.length))
        return {
          symptomKey: symptom.key,
          symptomLabel: symptom.label,
          beforeAvg: Math.round(beforeAvg * 100) / 100,
          afterAvg: Math.round(afterAvg * 100) / 100,
          delta: Math.round(delta * 100) / 100,
          direction: delta < -0.1 ? 'improved' : delta > 0.1 ? 'worsened' : 'no_change',
          pValue: Math.round(pValue * 1000) / 1000,
          significant: pValue < 0.05,
        }
      })

      results.push({
        medicationId: med.id,
        medicationName: med.name,
        periodId: period.id,
        startDate: period.startDate,
        endDate: period.endDate,
        doseAtStart: period.doseAtStart,
        beforeCount: beforeEntries.length,
        afterCount: afterEntries.length,
        symptoms: symptomResults,
      })
    }
  }

  return NextResponse.json(results)
}

async function getCorrelations(days: number) {
  const since = subDays(new Date(), days)
  const entries = await prisma.logEntry.findMany({
    where: { entryDate: { gte: since } },
    include: { symptomScores: true, sideEffectScores: true },
    orderBy: { entryDate: 'asc' },
  })

  const symptoms = await prisma.symptomDefinition.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })

  const keys = symptoms.map((s) => s.key)
  const matrix: Record<string, Record<string, number>> = {}

  for (const keyA of keys) {
    matrix[keyA] = {}
    const valuesA = entries.map((e) => e.symptomScores.find((s) => s.symptomKey === keyA)?.score ?? 0)
    for (const keyB of keys) {
      const valuesB = entries.map((e) => e.symptomScores.find((s) => s.symptomKey === keyB)?.score ?? 0)
      matrix[keyA][keyB] = Math.round(pearsonCorrelation(valuesA, valuesB) * 100) / 100
    }
  }

  return NextResponse.json({ matrix, keys, labels: Object.fromEntries(symptoms.map((s) => [s.key, s.label])) })
}

async function getTrends() {
  const since = subDays(new Date(), 30)
  const entries = await prisma.logEntry.findMany({
    where: { entryDate: { gte: since } },
    include: { symptomScores: true },
    orderBy: { entryDate: 'asc' },
  })

  const symptoms = await prisma.symptomDefinition.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })

  const trends = symptoms.map((symptom) => {
    const scores = entries.map((e) => e.symptomScores.find((s) => s.symptomKey === symptom.key)?.score ?? 0)
    const rolling7 = rollingAverage(scores, 7)
    const direction = trendDirection(scores)
    const last7 = scores.slice(-7)
    const persistent = last7.filter((s) => s >= 2).length >= 5
    const currentAvg = mean(last7)

    return {
      key: symptom.key,
      label: symptom.label,
      category: symptom.category,
      direction,
      persistent,
      currentAvg: Math.round(currentAvg * 100) / 100,
      rolling7: rolling7.slice(-7).map((v) => Math.round(v * 100) / 100),
    }
  })

  return NextResponse.json(trends)
}
