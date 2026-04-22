import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, type, dose, frequency, notes, isActive, changeReason, endDate } = body

  const existing = await prisma.medication.findUnique({ where: { id }, include: { periods: { orderBy: { startDate: 'desc' }, take: 1 } } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const doseChanged = dose && dose !== existing.dose
  const deactivating = isActive === false && existing.isActive

  await prisma.$transaction(async (tx) => {
    if ((doseChanged || deactivating) && existing.periods[0]) {
      await tx.medicationPeriod.update({
        where: { id: existing.periods[0].id },
        data: { endDate: endDate ? new Date(endDate) : new Date() },
      })
    }

    if (doseChanged && isActive !== false) {
      await tx.medicationPeriod.create({
        data: {
          medicationId: id,
          startDate: new Date(),
          doseAtStart: dose,
          changeReason,
        },
      })
    }

    await tx.medication.update({
      where: { id },
      data: { name, type, dose, frequency, notes, isActive: isActive ?? existing.isActive },
    })
  })

  const updated = await prisma.medication.findUnique({
    where: { id },
    include: { periods: { orderBy: { startDate: 'desc' } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.medication.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
