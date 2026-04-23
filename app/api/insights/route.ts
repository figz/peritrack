import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { subDays } from 'date-fns'
import { mean, trendDirection } from '@/lib/stats'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI insights not configured (GEMINI_API_KEY missing)' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const days = body.days ?? 90

  const since = subDays(new Date(), days)

  const [entries, symptoms, sideEffectDefs, medications, lifeEvents, labResults] = await Promise.all([
    prisma.logEntry.findMany({
      where: { entryDate: { gte: since } },
      include: { symptomScores: true, sideEffectScores: true, periodLog: true, biometrics: true },
      orderBy: { entryDate: 'asc' },
    }),
    prisma.symptomDefinition.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.sideEffectDefinition.findMany({ where: { isActive: true } }),
    prisma.medication.findMany({ include: { periods: { orderBy: { startDate: 'desc' } } } }),
    prisma.lifeEvent.findMany({ where: { eventDate: { gte: since } }, orderBy: { eventDate: 'asc' } }),
    prisma.labResult.findMany({ orderBy: [{ testDate: 'desc' }, { testName: 'asc' }], take: 50 }),
  ])

  if (entries.length < 3) {
    return NextResponse.json({ error: 'Need at least 3 log entries to generate insights' }, { status: 422 })
  }

  // Build symptom summary
  const symptomSummary = symptoms.map(sym => {
    const scores = entries.map(e => e.symptomScores.find(s => s.symptomKey === sym.key)?.score ?? 0)
    const avg = mean(scores)
    const trend = trendDirection(scores)
    const daysPresent = scores.filter(s => s > 0).length
    return { label: sym.label, category: sym.category, avg: Math.round(avg * 100) / 100, trend, daysPresent, totalDays: entries.length }
  }).filter(s => s.avg > 0).sort((a, b) => b.avg - a.avg)

  // Side effects summary
  const seSummary = sideEffectDefs.map(se => {
    const scores = entries.map(e => e.sideEffectScores.find(s => s.sideEffectKey === se.key)?.score ?? 0)
    const avg = mean(scores)
    return { label: se.label, avg: Math.round(avg * 100) / 100 }
  }).filter(s => s.avg > 0).sort((a, b) => b.avg - a.avg)

  // Period summary
  const periodEntries = entries.filter(e => e.periodLog?.isPresent)
  const spottingEntries = entries.filter(e => e.periodLog?.spotting)

  // Weight trend
  const weightEntries = entries.filter(e => e.weightLbs).map(e => ({
    date: e.entryDate.toISOString().slice(0, 10),
    weight: parseFloat(e.weightLbs!.toString()),
  }))

  // Active medications
  const activeMeds = medications.filter(m => m.isActive)
  const recentChanges = medications.flatMap(m => m.periods.filter(p => p.startDate >= since).map(p => ({
    med: m.name,
    type: m.type,
    startDate: p.startDate.toISOString().slice(0, 10),
    endDate: p.endDate?.toISOString().slice(0, 10) ?? null,
    dose: p.doseAtStart,
    reason: p.changeReason,
  })))

  const prompt = `You are a clinical data analyst helping a patient prepare for a discussion with their perimenopause/HRT specialist.
Analyze the following ${days}-day health data and provide structured, clinically useful insights.

## PATIENT DATA (${days} days, ${entries.length} log entries)

### Current Medications & HRT
${activeMeds.map(m => `- ${m.name} (${m.type}): ${m.dose ?? 'no dose recorded'}, ${m.frequency ?? 'no frequency'}`).join('\n') || 'None recorded'}

### Recent Medication Changes (within data period)
${recentChanges.length ? recentChanges.map(c => `- ${c.med}: started ${c.startDate}${c.dose ? ` at ${c.dose}` : ''}${c.reason ? ` — reason: ${c.reason}` : ''}`).join('\n') : 'None'}

### Top Symptoms by Average Severity (0=none, 3=severe)
${symptomSummary.slice(0, 15).map(s => `- ${s.label} (${s.category ?? 'general'}): avg ${s.avg}/3, trend: ${s.trend}, present ${s.daysPresent}/${s.totalDays} days`).join('\n') || 'No symptoms recorded'}

### Medication Side Effects
${seSummary.slice(0, 8).map(s => `- ${s.label}: avg ${s.avg}/3`).join('\n') || 'None recorded'}

### Period Tracking
- Period days in period: ${periodEntries.length} out of ${entries.length} logged days
- Spotting days: ${spottingEntries.length}
${spottingEntries.length ? `- Spotting colors: ${spottingEntries.map(e => e.periodLog?.spottingColor).filter(Boolean).join(', ')}` : ''}

### Weight
${weightEntries.length >= 2 ? `- Start: ${weightEntries[0].weight} lbs (${weightEntries[0].date})\n- End: ${weightEntries[weightEntries.length-1].weight} lbs (${weightEntries[weightEntries.length-1].date})\n- Change: ${(weightEntries[weightEntries.length-1].weight - weightEntries[0].weight).toFixed(1)} lbs` : weightEntries.length === 1 ? `- Most recent: ${weightEntries[0].weight} lbs` : '- Not recorded'}

### Life Events
${lifeEvents.length ? lifeEvents.map(e => `- ${e.eventDate.toISOString().slice(0,10)} [${e.category}]: ${e.title}`).join('\n') : 'None recorded'}

### Lab Results (most recent values per test)
${labResults.length ? (() => {
  const seen = new Set<string>()
  return labResults
    .filter(r => { const k = r.testName; if (seen.has(k)) return false; seen.add(k); return true })
    .map(r => {
      const val = `${r.testName}: ${Number(r.value)} ${r.unit} (${r.testDate.toISOString().slice(0,10)})`
      const ref = r.refRangeLow != null || r.refRangeHigh != null ? ` [ref: ${r.refRangeLow ?? '?'}–${r.refRangeHigh ?? '?'}]` : ''
      const status = r.refRangeLow != null && Number(r.value) < Number(r.refRangeLow) ? ' ← BELOW RANGE'
        : r.refRangeHigh != null && Number(r.value) > Number(r.refRangeHigh) ? ' ← ABOVE RANGE' : ''
      return `- ${val}${ref}${status}`
    }).join('\n')
})() : 'None recorded'}

---

Please provide a structured clinical summary with the following sections:

**1. OVERVIEW**
2-3 sentence summary of the patient's overall status and the most important observations from this data period.

**2. TOP CONCERNS**
List the 3-5 most clinically significant findings that warrant discussion with the doctor. Be specific with the data.

**3. MEDICATION OBSERVATIONS**
Based on the symptom trends and timing of any medication changes, what patterns are observable? Note any apparent correlations between medication use and symptom changes.

**4. SYMPTOM PATTERNS**
Identify any notable patterns (e.g., clusters of symptoms that tend to appear together, symptoms that appear to be improving or worsening, persistent high-severity symptoms).

**5. QUESTIONS TO RAISE WITH YOUR DOCTOR**
List 5-7 specific, data-backed questions the patient should ask their healthcare provider based on this data. Frame these as patient questions.

**6. POSITIVE OBSERVATIONS**
Note any symptoms that are improving or areas of progress.

Keep the language accessible to a non-clinician but precise enough to be medically useful. Do not diagnose or recommend treatment changes.`

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent(prompt)
  const content = result.response.text()

  return NextResponse.json({
    insights: content,
    generatedAt: new Date().toISOString(),
    dataRange: { days, entries: entries.length },
  })
}
