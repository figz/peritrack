import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [symptoms, sideEffects] = await Promise.all([
    prisma.symptomDefinition.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }),
    prisma.sideEffectDefinition.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }),
  ])

  return NextResponse.json({ symptoms, sideEffects })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, key, label, category, isActive, sortOrder } = body

  if (type === 'symptom') {
    const existing = await prisma.symptomDefinition.findUnique({ where: { key } })
    if (existing) {
      const updated = await prisma.symptomDefinition.update({
        where: { key },
        data: { label, category, isActive, sortOrder },
      })
      return NextResponse.json(updated)
    } else {
      const created = await prisma.symptomDefinition.create({ data: { key, label, category, isActive: isActive ?? true, sortOrder } })
      return NextResponse.json(created, { status: 201 })
    }
  }

  if (type === 'side_effect') {
    const existing = await prisma.sideEffectDefinition.findUnique({ where: { key } })
    if (existing) {
      const updated = await prisma.sideEffectDefinition.update({
        where: { key },
        data: { label, category, isActive, sortOrder },
      })
      return NextResponse.json(updated)
    } else {
      const created = await prisma.sideEffectDefinition.create({ data: { key, label, category, isActive: isActive ?? true, sortOrder } })
      return NextResponse.json(created, { status: 201 })
    }
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
