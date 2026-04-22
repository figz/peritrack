import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: Record<string, unknown> = {}
  if (from || to) {
    where.entryDate = {}
    if (from) (where.entryDate as Record<string, unknown>).gte = new Date(from)
    if (to) (where.entryDate as Record<string, unknown>).lte = new Date(to)
  }

  const [entries, total] = await Promise.all([
    prisma.logEntry.findMany({
      where,
      include: {
        symptomScores: true,
        sideEffectScores: true,
        periodLog: true,
        biometrics: true,
      },
      orderBy: { entryDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.logEntry.count({ where }),
  ])

  return NextResponse.json({ entries, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { entryDate, notes, weightLbs, hydration, nutritionQuality, dailyWalk, ptExercises, otherExercise, symptoms, sideEffects, periodLog, biometrics } = body

  const existing = await prisma.logEntry.findUnique({
    where: { entryDate: new Date(entryDate) },
  })

  if (existing) {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.symptomScore.deleteMany({ where: { logEntryId: existing.id } })
      await tx.sideEffectScore.deleteMany({ where: { logEntryId: existing.id } })
      await tx.periodLog.deleteMany({ where: { logEntryId: existing.id } })
      await tx.biometric.deleteMany({ where: { logEntryId: existing.id } })

      return tx.logEntry.update({
        where: { id: existing.id },
        data: {
          notes,
          weightLbs: weightLbs ? parseFloat(weightLbs) : null,
          hydration: hydration != null ? parseInt(hydration) : null,
          nutritionQuality: nutritionQuality != null ? parseInt(nutritionQuality) : null,
          dailyWalk: dailyWalk ?? null,
          ptExercises: ptExercises ?? null,
          otherExercise: otherExercise ?? null,
          symptomScores: { create: (symptoms ?? []).map((s: { key: string; score: number }) => ({ symptomKey: s.key, score: s.score })) },
          sideEffectScores: { create: (sideEffects ?? []).map((s: { key: string; score: number }) => ({ sideEffectKey: s.key, score: s.score })) },
          periodLog: periodLog ? { create: periodLog } : undefined,
          biometrics: { create: (biometrics ?? []).filter((b: { value: string | null }) => b.value !== null && b.value !== '').map((b: { key: string; value: string; unit: string }) => ({ metricKey: b.key, metricValue: parseFloat(b.value), metricUnit: b.unit })) },
        },
        include: { symptomScores: true, sideEffectScores: true, periodLog: true, biometrics: true },
      })
    })
    return NextResponse.json(updated)
  }

  const entry = await prisma.logEntry.create({
    data: {
      entryDate: new Date(entryDate),
      notes,
      weightLbs: weightLbs ? parseFloat(weightLbs) : null,
      hydration: hydration != null ? parseInt(hydration) : null,
      nutritionQuality: nutritionQuality != null ? parseInt(nutritionQuality) : null,
      dailyWalk: dailyWalk ?? null,
      ptExercises: ptExercises ?? null,
      otherExercise: otherExercise ?? null,
      symptomScores: { create: (symptoms ?? []).map((s: { key: string; score: number }) => ({ symptomKey: s.key, score: s.score })) },
      sideEffectScores: { create: (sideEffects ?? []).map((s: { key: string; score: number }) => ({ sideEffectKey: s.key, score: s.score })) },
      periodLog: periodLog ? { create: periodLog } : undefined,
      biometrics: { create: (biometrics ?? []).filter((b: { value: string | null }) => b.value !== null && b.value !== '').map((b: { key: string; value: string; unit: string }) => ({ metricKey: b.key, metricValue: parseFloat(b.value), metricUnit: b.unit })) },
    },
    include: { symptomScores: true, sideEffectScores: true, periodLog: true, biometrics: true },
  })

  return NextResponse.json(entry, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  if (searchParams.get('deleteAll') === '1') {
    await prisma.logEntry.deleteMany()
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: 'Not allowed' }, { status: 400 })
}
