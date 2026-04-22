import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'json'

  const [entries, medications, events, symptoms, sideEffects] = await Promise.all([
    prisma.logEntry.findMany({
      include: { symptomScores: true, sideEffectScores: true, periodLog: true, biometrics: true },
      orderBy: { entryDate: 'asc' },
    }),
    prisma.medication.findMany({ include: { periods: true } }),
    prisma.lifeEvent.findMany({ orderBy: { eventDate: 'asc' } }),
    prisma.symptomDefinition.findMany(),
    prisma.sideEffectDefinition.findMany(),
  ])

  if (format === 'csv') {
    const rows = ['Date,Period,Weight,Notes,Symptoms,Period Present,Flow Severity']
    for (const entry of entries) {
      const sympStr = entry.symptomScores.filter((s) => s.score > 0).map((s) => `${s.symptomKey}:${s.score}`).join(';')
      rows.push([
        entry.entryDate.toISOString().split('T')[0],
        entry.entryPeriod,
        entry.weightLbs ?? '',
        (entry.notes ?? '').replace(/,/g, ' '),
        sympStr,
        entry.periodLog?.isPresent ? 'yes' : 'no',
        entry.periodLog?.flowSeverity ?? '',
      ].join(','))
    }
    return new NextResponse(rows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="peritrack-export.csv"',
      },
    })
  }

  const data = { entries, medications, events, symptoms, sideEffects, exportedAt: new Date().toISOString() }
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="peritrack-export.json"',
    },
  })
}
