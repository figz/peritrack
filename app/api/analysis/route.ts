import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { mean, pearsonCorrelation, pairedTTest, rollingAverage, trendDirection, multipleLinearRegression } from '@/lib/stats'
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
  if (type === 'regression') {
    const target = searchParams.get('target') ?? ''
    const days = parseInt(searchParams.get('days') ?? '90')
    return getRegressionAnalysis(target, days)
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

async function getRegressionAnalysis(targetKey: string, days: number) {
  if (!targetKey) return NextResponse.json({ error: 'target required' }, { status: 400 })

  const since = subDays(new Date(), days)
  const [entries, symptoms, medications] = await Promise.all([
    prisma.logEntry.findMany({
      where: { entryDate: { gte: since } },
      include: { symptomScores: true, biometrics: true, periodLog: true },
      orderBy: { entryDate: 'asc' },
    }),
    prisma.symptomDefinition.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.medication.findMany({ include: { periods: true } }),
  ])

  if (entries.length < 10) return NextResponse.json({ error: 'Not enough data (need at least 10 entries)' }, { status: 422 })

  const targetDef = symptoms.find(s => s.key === targetKey)
  if (!targetDef) return NextResponse.json({ error: 'Target symptom not found' }, { status: 404 })

  const y = entries.map(e => e.symptomScores.find(s => s.symptomKey === targetKey)?.score ?? 0)

  // Build predictor list: other symptoms + sleep + period + active meds
  const predictors: { key: string; name: string; values: number[] }[] = []

  // Other active symptoms
  for (const sym of symptoms) {
    if (sym.key === targetKey) continue
    predictors.push({
      key: sym.key,
      name: sym.label,
      values: entries.map(e => e.symptomScores.find(s => s.symptomKey === sym.key)?.score ?? 0),
    })
  }

  // Sleep hours biometric
  const sleepValues = entries.map(e => {
    const b = e.biometrics.find(b => b.metricKey === 'sleep_hours')
    return b?.metricValue ? parseFloat(b.metricValue.toString()) : mean(entries.map(e2 => {
      const b2 = e2.biometrics.find(b3 => b3.metricKey === 'sleep_hours')
      return b2?.metricValue ? parseFloat(b2.metricValue.toString()) : 0
    }))
  })
  if (sleepValues.some(v => v > 0)) {
    predictors.push({ key: 'sleep_hours', name: 'Sleep Hours', values: sleepValues })
  }

  // Period present
  predictors.push({
    key: 'period_present',
    name: 'Period Present',
    values: entries.map(e => e.periodLog?.isPresent ? 1 : 0),
  })

  // Active medication flags
  for (const med of medications) {
    const activePeriod = med.periods.find(p => p.startDate <= new Date() && (!p.endDate || p.endDate >= since))
    if (!activePeriod) continue
    predictors.push({
      key: `med_${med.id}`,
      name: `${med.name} active`,
      values: entries.map(e => {
        const d = e.entryDate as unknown as Date
        return activePeriod.startDate <= d && (!activePeriod.endDate || activePeriod.endDate >= d) ? 1 : 0
      }),
    })
  }

  const result = multipleLinearRegression(y, predictors)
  if (!result) return NextResponse.json({ error: 'Regression failed — check data variance' }, { status: 422 })

  return NextResponse.json({
    target: { key: targetDef.key, label: targetDef.label },
    ...result,
    symptoms: symptoms.map(s => ({ key: s.key, label: s.label })),
  })
}
