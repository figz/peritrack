import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const testKey = searchParams.get('testKey')
  const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : null

  const where: Record<string, unknown> = {}
  if (testKey) where.testKey = testKey
  if (days) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    where.testDate = { gte: since }
  }

  const results = await prisma.labResult.findMany({
    where,
    orderBy: [{ testDate: 'desc' }, { testName: 'asc' }],
  })

  return NextResponse.json(results.map(r => ({
    ...r,
    testDate: r.testDate.toISOString().slice(0, 10),
    value: Number(r.value),
    refRangeLow: r.refRangeLow != null ? Number(r.refRangeLow) : null,
    refRangeHigh: r.refRangeHigh != null ? Number(r.refRangeHigh) : null,
  })))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { results } = body // array of lab results to batch-create

  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json({ error: 'results array required' }, { status: 400 })
  }

  const created = await prisma.$transaction(
    results.map((r: {
      testDate: string; testName: string; testKey?: string; value: number; unit: string;
      refRangeLow?: number; refRangeHigh?: number; labName?: string; panelName?: string; notes?: string
    }) =>
      prisma.labResult.create({
        data: {
          testDate: new Date(r.testDate),
          testName: r.testName,
          testKey: r.testKey || null,
          value: r.value,
          unit: r.unit,
          refRangeLow: r.refRangeLow ?? null,
          refRangeHigh: r.refRangeHigh ?? null,
          labName: r.labName || null,
          panelName: r.panelName || null,
          notes: r.notes || null,
        },
      })
    )
  )

  return NextResponse.json(created.map(r => ({
    ...r,
    testDate: r.testDate.toISOString().slice(0, 10),
    value: Number(r.value),
    refRangeLow: r.refRangeLow != null ? Number(r.refRangeLow) : null,
    refRangeHigh: r.refRangeHigh != null ? Number(r.refRangeHigh) : null,
  })), { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await prisma.labResult.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
