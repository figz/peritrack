import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'
import { mean, trendDirection, linearRegression } from '@/lib/stats'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') ?? '90')
  const since = subDays(new Date(), days)

  const [entries, symptoms, sideEffectDefs, medications, lifeEvents] = await Promise.all([
    prisma.logEntry.findMany({
      where: { entryDate: { gte: since } },
      include: { symptomScores: true, sideEffectScores: true, periodLog: true, biometrics: true },
      orderBy: { entryDate: 'asc' },
    }),
    prisma.symptomDefinition.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }),
    prisma.sideEffectDefinition.findMany({ where: { isActive: true } }),
    prisma.medication.findMany({
      include: { periods: { orderBy: { startDate: 'desc' } } },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.lifeEvent.findMany({ where: { eventDate: { gte: since } }, orderBy: { eventDate: 'asc' } }),
  ])

  // Symptom stats
  const symptomStats = symptoms.map(sym => {
    const scores = entries.map(e => e.symptomScores.find(s => s.symptomKey === sym.key)?.score ?? 0)
    const avg = mean(scores)
    const trend = trendDirection(scores)
    const daysPresent = scores.filter(s => s > 0).length
    const maxScore = Math.max(...scores, 0)
    const last14Scores = scores.slice(-14)
    const recentAvg = mean(last14Scores)
    return {
      key: sym.key, label: sym.label, category: sym.category,
      avg: Math.round(avg * 100) / 100,
      recentAvg: Math.round(recentAvg * 100) / 100,
      maxScore,
      trend,
      daysPresent,
      totalDays: entries.length,
      persistent: last14Scores.filter(s => s >= 2).length >= 7,
    }
  }).filter(s => s.avg > 0 || s.daysPresent > 0)

  // Side effect stats
  const seStats = sideEffectDefs.map(se => {
    const scores = entries.map(e => e.sideEffectScores.find(s => s.sideEffectKey === se.key)?.score ?? 0)
    return { key: se.key, label: se.label, avg: Math.round(mean(scores) * 100) / 100, daysPresent: scores.filter(s => s > 0).length }
  }).filter(s => s.avg > 0)

  // Period summary
  const periodDays = entries.filter(e => e.periodLog?.isPresent)
  const spottingDays = entries.filter(e => e.periodLog?.spotting)

  // Weight trend
  const weightPoints = entries
    .filter(e => e.weightLbs)
    .map(e => ({ date: e.entryDate.toISOString().slice(0, 10), value: parseFloat(e.weightLbs!.toString()) }))

  let weightTrend: { slope: number; startWeight: number; endWeight: number; change: number } | null = null
  if (weightPoints.length >= 2) {
    const xs = weightPoints.map((_, i) => i)
    const ys = weightPoints.map(p => p.value)
    const { slope } = linearRegression(xs, ys)
    weightTrend = {
      slope: Math.round(slope * 100) / 100,
      startWeight: weightPoints[0].value,
      endWeight: weightPoints[weightPoints.length - 1].value,
      change: Math.round((weightPoints[weightPoints.length - 1].value - weightPoints[0].value) * 10) / 10,
    }
  }

  // Biometrics averages
  const biometricKeys = ['heart_rate', 'sleep_hours', 'bp_systolic', 'bp_diastolic']
  const biometricLabels: Record<string, string> = {
    heart_rate: 'Resting Heart Rate', sleep_hours: 'Sleep Hours',
    bp_systolic: 'Blood Pressure (Systolic)', bp_diastolic: 'Blood Pressure (Diastolic)',
  }
  const biometricUnits: Record<string, string> = { heart_rate: 'bpm', sleep_hours: 'hrs', bp_systolic: 'mmHg', bp_diastolic: 'mmHg' }
  const biometricStats = biometricKeys.map(key => {
    const vals = entries.flatMap(e => e.biometrics.filter(b => b.metricKey === key).map(b => parseFloat(b.metricValue?.toString() ?? '0')))
    if (vals.length === 0) return null
    return { key, label: biometricLabels[key], unit: biometricUnits[key], avg: Math.round(mean(vals) * 10) / 10, count: vals.length }
  }).filter(Boolean)

  // Medication change timeline
  const medChanges = medications.flatMap(m =>
    m.periods.map(p => ({
      medication: m.name,
      type: m.type,
      dose: p.doseAtStart ?? m.dose,
      startDate: p.startDate.toISOString().slice(0, 10),
      endDate: p.endDate?.toISOString().slice(0, 10) ?? null,
      changeReason: p.changeReason,
      isActive: m.isActive && !p.endDate,
    }))
  ).filter(c => !c.endDate || new Date(c.endDate) >= since)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))

  return NextResponse.json({
    reportDate: new Date().toISOString().slice(0, 10),
    dataRange: { days, from: since.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10), entryCount: entries.length },
    medications: medChanges,
    activeMedications: medications.filter(m => m.isActive),
    symptoms: symptomStats,
    sideEffects: seStats,
    period: {
      dayCount: periodDays.length,
      spottingCount: spottingDays.length,
      totalDays: entries.length,
      spottingColors: spottingDays.map(e => e.periodLog?.spottingColor).filter(Boolean),
    },
    weight: { points: weightPoints, trend: weightTrend },
    biometrics: biometricStats,
    lifeEvents: lifeEvents.map(e => ({
      date: e.eventDate.toISOString().slice(0, 10),
      category: e.category,
      title: e.title,
      description: e.description,
    })),
  })
}
