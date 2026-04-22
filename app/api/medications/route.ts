import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const medications = await prisma.medication.findMany({
    include: { periods: { orderBy: { startDate: 'desc' } } },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(medications)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, type, dose, frequency, notes, startDate } = body

  const med = await prisma.medication.create({
    data: {
      name,
      type,
      dose,
      frequency,
      notes,
      isActive: true,
      periods: startDate ? {
        create: { startDate: new Date(startDate), doseAtStart: dose },
      } : undefined,
    },
    include: { periods: true },
  })
  return NextResponse.json(med, { status: 201 })
}
