'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ChevronDown, ChevronRight, Save, Loader2 } from 'lucide-react'

interface SymptomDef {
  key: string
  label: string
  category: string | null
  isActive: boolean
  sortOrder: number | null
}

interface BiometricEntry {
  key: string
  label: string
  unit: string
  value: string
}

const SCORE_LABELS = ['None', 'Mild', 'Moderate', 'Severe']
const SCORE_COLORS = [
  'bg-gray-100 text-gray-600 border-gray-200',
  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-red-100 text-red-700 border-red-200',
]

function ScoreToggle({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex gap-1" role="group" aria-label={`${label} severity`}>
      {[0, 1, 2, 3].map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onChange(score)}
          aria-pressed={value === score}
          aria-label={`${SCORE_LABELS[score]}`}
          className={`min-w-[44px] min-h-[44px] px-2 py-1 rounded-lg border text-xs font-medium transition-all ${
            value === score ? SCORE_COLORS[score] + ' ring-2 ring-offset-1 ring-current' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
          }`}
        >
          {score}
          <span className="sr-only"> — {SCORE_LABELS[score]}</span>
        </button>
      ))}
    </div>
  )
}

function CategorySection({
  title,
  items,
  scores,
  onScoreChange,
}: {
  title: string
  items: SymptomDef[]
  scores: Record<string, number>
  onScoreChange: (key: string, value: number) => void
}) {
  const [open, setOpen] = useState(true)
  const hasAny = items.some((i) => scores[i.key] > 0)

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors min-h-[44px]"
        aria-expanded={open}
      >
        <span className="font-medium text-sm text-gray-700">{title}</span>
        <div className="flex items-center gap-2">
          {hasAny && <Badge variant="secondary" className="text-xs bg-rose-100 text-rose-600">Active</Badge>}
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="divide-y divide-gray-50">
          {items.map((item) => (
            <div key={item.key} className="flex items-center justify-between px-4 py-3 bg-white">
              <Label className="text-sm text-gray-700 cursor-default">{item.label}</Label>
              <ScoreToggle value={scores[item.key] ?? 0} onChange={(v) => onScoreChange(item.key, v)} label={item.label} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DEFAULT_BIOMETRICS: BiometricEntry[] = [
  { key: 'heart_rate', label: 'Resting Heart Rate', unit: 'bpm', value: '' },
  { key: 'sleep_hours', label: 'Sleep Hours', unit: 'hrs', value: '' },
  { key: 'bp_systolic', label: 'Blood Pressure (Systolic)', unit: 'mmHg', value: '' },
  { key: 'bp_diastolic', label: 'Blood Pressure (Diastolic)', unit: 'mmHg', value: '' },
]

export function CheckInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [date, setDate] = useState(() => searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd'))
  const [symptoms, setSymptoms] = useState<SymptomDef[]>([])
  const [sideEffects, setSideEffects] = useState<SymptomDef[]>([])
  const [symptomScores, setSymptomScores] = useState<Record<string, number>>({})
  const [sideEffectScores, setSideEffectScores] = useState<Record<string, number>>({})
  const [periodPresent, setPeriodPresent] = useState(false)
  const [flowSeverity, setFlowSeverity] = useState(0)
  const [spotting, setSpotting] = useState(false)
  const [spottingColor, setSpottingColor] = useState<'pale_pink' | 'red' | 'brown' | ''>('')
  const [hydration, setHydration] = useState(0)
  const [nutritionQuality, setNutritionQuality] = useState(0)
  const [dailyWalk, setDailyWalk] = useState<boolean | null>(null)
  const [ptExercises, setPtExercises] = useState<boolean | null>(null)
  const [otherExercise, setOtherExercise] = useState<boolean | null>(null)
  const [biometrics, setBiometrics] = useState<BiometricEntry[]>(DEFAULT_BIOMETRICS)
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [existingId, setExistingId] = useState<string | null>(null)
  const draftKey = `peritrack-draft-${date}`
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then(({ symptoms: s, sideEffects: se }) => {
        setSymptoms(s.filter((x: SymptomDef) => x.isActive))
        setSideEffects(se.filter((x: SymptomDef) => x.isActive))
      })
  }, [])

  useEffect(() => {
    const loadEntry = async () => {
      // Reset all fields before loading so stale data never bleeds between dates
      setExistingId(null)
      setSymptomScores({})
      setSideEffectScores({})
      setNotes('')
      setWeight('')
      setHydration(0)
      setNutritionQuality(0)
      setDailyWalk(null)
      setPtExercises(null)
      setOtherExercise(null)
      setPeriodPresent(false)
      setFlowSeverity(0)
      setSpotting(false)
      setSpottingColor('')
      setBiometrics(DEFAULT_BIOMETRICS)

      const res = await fetch(`/api/log?from=${date}&to=${date}&limit=1`)
      const data = await res.json()
      if (data.entries?.length > 0) {
        const entry = data.entries[0]
        setExistingId(entry.id)
        const ss: Record<string, number> = {}
        entry.symptomScores.forEach((s: { symptomKey: string; score: number }) => { ss[s.symptomKey] = s.score })
        setSymptomScores(ss)
        const ses: Record<string, number> = {}
        entry.sideEffectScores.forEach((s: { sideEffectKey: string; score: number }) => { ses[s.sideEffectKey] = s.score })
        setSideEffectScores(ses)
        setNotes(entry.notes ?? '')
        setWeight(entry.weightLbs?.toString() ?? '')
        setHydration(entry.hydration ?? 0)
        setNutritionQuality(entry.nutritionQuality ?? 0)
        setDailyWalk(entry.dailyWalk ?? null)
        setPtExercises(entry.ptExercises ?? null)
        setOtherExercise(entry.otherExercise ?? null)
        if (entry.periodLog) {
          setPeriodPresent(entry.periodLog.isPresent)
          setFlowSeverity(entry.periodLog.flowSeverity ?? 0)
          setSpotting(entry.periodLog.spotting)
          setSpottingColor(entry.periodLog.spottingColor ?? '')
        }
        const bio = [...DEFAULT_BIOMETRICS]
        entry.biometrics.forEach((b: { metricKey: string; metricValue: string }) => {
          const idx = bio.findIndex((x) => x.key === b.metricKey)
          if (idx >= 0) bio[idx] = { ...bio[idx], value: b.metricValue?.toString() ?? '' }
        })
        setBiometrics(bio)
        return
      }
      try {
        const draft = localStorage.getItem(draftKey)
        if (draft) {
          const d = JSON.parse(draft)
          setSymptomScores(d.symptomScores ?? {})
          setSideEffectScores(d.sideEffectScores ?? {})
          setNotes(d.notes ?? '')
          setWeight(d.weight ?? '')
          setHydration(d.hydration ?? 0)
          setNutritionQuality(d.nutritionQuality ?? 0)
          setDailyWalk(d.dailyWalk ?? null)
          setPtExercises(d.ptExercises ?? null)
          setOtherExercise(d.otherExercise ?? null)
          setPeriodPresent(d.periodPresent ?? false)
          setFlowSeverity(d.flowSeverity ?? 0)
          setSpotting(d.spotting ?? false)
          setSpottingColor(d.spottingColor ?? '')
          setBiometrics(d.biometrics ?? DEFAULT_BIOMETRICS)
        }
      } catch {}
    }
    loadEntry()
  }, [date, draftKey])

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        symptomScores, sideEffectScores, notes, weight,
        hydration, nutritionQuality, dailyWalk, ptExercises, otherExercise,
        periodPresent, flowSeverity, spotting, spottingColor, biometrics,
      }))
    } catch {}
  }, [draftKey, symptomScores, sideEffectScores, notes, weight, hydration, nutritionQuality, dailyWalk, ptExercises, otherExercise, periodPresent, flowSeverity, spotting, spottingColor, biometrics])

  useEffect(() => {
    autoSaveRef.current = setInterval(saveDraft, 30000)
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current) }
  }, [saveDraft])

  const groupByCategory = (defs: SymptomDef[]) => {
    const groups: Record<string, SymptomDef[]> = {}
    defs.forEach((d) => {
      const cat = d.category ?? 'Other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(d)
    })
    return groups
  }

  async function handleSave(andClose = false) {
    setSaving(true)
    try {
      const payload = {
        entryDate: date,
        notes: notes || null,
        weightLbs: weight || null,
        hydration: hydration > 0 ? hydration : null,
        nutritionQuality: nutritionQuality > 0 ? nutritionQuality : null,
        dailyWalk,
        ptExercises,
        otherExercise,
        symptoms: Object.entries(symptomScores).map(([key, score]) => ({ key, score })),
        sideEffects: Object.entries(sideEffectScores).map(([key, score]) => ({ key, score })),
        periodLog: (periodPresent || spotting) ? {
          isPresent: periodPresent,
          flowSeverity: periodPresent ? flowSeverity : null,
          spotting,
          spottingColor: spotting && spottingColor ? spottingColor : null,
        } : null,
        biometrics: biometrics.filter((b) => b.value !== '').map((b) => ({ key: b.key, value: b.value, unit: b.unit })),
      }

      const res = await fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Save failed')

      localStorage.removeItem(draftKey)
      toast.success('Check-in saved!')
      if (andClose) router.push('/')
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const symptomGroups = groupByCategory(symptoms)
  const sideEffectGroups = groupByCategory(sideEffects)

  function YesNoToggle({ value, onChange, label }: { value: boolean | null; onChange: (v: boolean | null) => void; label: string }) {
    return (
      <div className="flex gap-2" role="group" aria-label={label}>
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(value === v ? null : v)}
            aria-pressed={value === v}
            className={`min-h-[44px] px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              value === v
                ? v ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-100 border-gray-300 text-gray-600'
                : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
            }`}
          >
            {v ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{existingId ? 'Edit' : 'New'} Check-In</h1>
        {existingId && <Badge variant="secondary" className="bg-blue-50 text-blue-700">Editing existing entry</Badge>}
      </div>

      {/* Date */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-1 max-w-[200px]">
            <Label htmlFor="entry-date">Date</Label>
            <Input id="entry-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-[44px]" />
          </div>
        </CardContent>
      </Card>

      {/* Symptoms */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Symptoms</CardTitle>
          <p className="text-xs text-gray-500">0 = None, 1 = Mild, 2 = Moderate, 3 = Severe</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(symptomGroups).map(([cat, items]) => (
            <CategorySection
              key={cat}
              title={cat}
              items={items}
              scores={symptomScores}
              onScoreChange={(k, v) => setSymptomScores((s) => ({ ...s, [k]: v }))}
            />
          ))}
        </CardContent>
      </Card>

      {/* Side Effects */}
      {sideEffects.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Medication Side Effects</CardTitle>
            <p className="text-xs text-gray-500">Rate any side effects you&apos;re experiencing</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(sideEffectGroups).map(([cat, items]) => (
              <CategorySection
                key={cat}
                title={cat}
                items={items}
                scores={sideEffectScores}
                onScoreChange={(k, v) => setSideEffectScores((s) => ({ ...s, [k]: v }))}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Daily Wellness */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Wellness</CardTitle>
          <p className="text-xs text-gray-500">0 = None / Poor, 3 = Excellent</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between min-h-[44px]">
            <Label className="text-sm">Hydration</Label>
            <ScoreToggle value={hydration} onChange={setHydration} label="Hydration" />
          </div>
          <div className="flex items-center justify-between min-h-[44px]">
            <Label className="text-sm">Nutrition Quality</Label>
            <ScoreToggle value={nutritionQuality} onChange={setNutritionQuality} label="Nutrition Quality" />
          </div>
          <div className="flex items-center justify-between min-h-[44px]">
            <Label className="text-sm">Daily Walk</Label>
            <YesNoToggle value={dailyWalk} onChange={setDailyWalk} label="Daily Walk" />
          </div>
          <div className="flex items-center justify-between min-h-[44px]">
            <Label className="text-sm">PT Exercises</Label>
            <YesNoToggle value={ptExercises} onChange={setPtExercises} label="PT Exercises" />
          </div>
          <div className="flex items-center justify-between min-h-[44px]">
            <Label className="text-sm">Other Exercise</Label>
            <YesNoToggle value={otherExercise} onChange={setOtherExercise} label="Other Exercise" />
          </div>
        </CardContent>
      </Card>

      {/* Period Tracker */}
      <Card id="period-section">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Period Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between min-h-[44px]">
            <Label htmlFor="period-present" className="text-sm">Period present today?</Label>
            <Switch id="period-present" checked={periodPresent} onCheckedChange={setPeriodPresent} />
          </div>
          {periodPresent && (
            <div className="space-y-2">
              <Label className="text-sm">Flow Severity</Label>
              <div className="flex gap-2 flex-wrap">
                {['None / Spotting', 'Light', 'Moderate', 'Heavy'].map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFlowSeverity(i)}
                    aria-pressed={flowSeverity === i}
                    className={`min-h-[44px] px-3 py-2 rounded-lg border text-sm font-medium transition-all ${flowSeverity === i ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between min-h-[44px]">
            <Label htmlFor="spotting" className="text-sm">Spotting</Label>
            <Switch id="spotting" checked={spotting} onCheckedChange={(v) => { setSpotting(v); if (!v) setSpottingColor('') }} />
          </div>
          {spotting && (
            <div className="space-y-2">
              <Label className="text-sm">Spotting Color</Label>
              <div className="flex gap-2 flex-wrap">
                {([
                  { value: 'pale_pink', label: 'Light pink' },
                  { value: 'red', label: 'Red' },
                  { value: 'brown', label: 'Brown' },
                ] as { value: 'pale_pink' | 'red' | 'brown'; label: string }[]).map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSpottingColor(spottingColor === value ? '' : value)}
                    aria-pressed={spottingColor === value}
                    className={`min-h-[44px] px-3 py-2 rounded-lg border text-sm font-medium transition-all ${spottingColor === value ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Biometrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Biometrics</CardTitle>
          <p className="text-xs text-gray-500">All fields are optional</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (lbs)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="50"
                max="500"
                placeholder="e.g. 145.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="min-h-[44px]"
              />
              <span className="text-sm text-gray-500 shrink-0">lbs</span>
            </div>
          </div>
          {biometrics.map((b, idx) => (
            <div key={b.key} className="space-y-2">
              <Label htmlFor={`bio-${b.key}`}>{b.label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`bio-${b.key}`}
                  type="number"
                  step="0.1"
                  placeholder="optional"
                  value={b.value}
                  onChange={(e) => {
                    const updated = [...biometrics]
                    updated[idx] = { ...b, value: e.target.value }
                    setBiometrics(updated)
                  }}
                  className="min-h-[44px]"
                />
                <span className="text-sm text-gray-500 shrink-0">{b.unit}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any additional observations, context, or things to note…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Save buttons */}
      <div className="flex gap-3 sticky bottom-4">
        <Button
          type="button"
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex-1 bg-rose-600 hover:bg-rose-700 min-h-[48px]"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save &amp; Close
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex-1 min-h-[48px]"
        >
          Save
        </Button>
      </div>
    </div>
  )
}
