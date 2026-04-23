'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, FlaskConical, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { toast } from 'sonner'
import { KNOWN_LAB_TESTS, LAB_CATEGORIES, getLabTest, labStatus, type KnownLabTest } from '@/lib/labTests'

interface LabResult {
  id: string
  testDate: string
  testName: string
  testKey: string | null
  value: number
  unit: string
  refRangeLow: number | null
  refRangeHigh: number | null
  labName: string | null
  panelName: string | null
  notes: string | null
}

interface LabRow {
  testKey: string
  testName: string
  value: string
  unit: string
  refRangeLow: string
  refRangeHigh: string
  notes: string
}

const EMPTY_ROW = (): LabRow => ({
  testKey: '', testName: '', value: '', unit: '', refRangeLow: '', refRangeHigh: '', notes: ''
})

function StatusBadge({ value, low, high }: { value: number; low: number | null; high: number | null }) {
  const status = labStatus(value, low, high)
  if (status === 'unknown') return <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500">No ref</Badge>
  if (status === 'low') return <Badge className="text-xs bg-blue-100 text-blue-700 border border-blue-200">Low</Badge>
  if (status === 'high') return <Badge className="text-xs bg-red-100 text-red-700 border border-red-200">High</Badge>
  return <Badge className="text-xs bg-green-100 text-green-700 border border-green-200">Normal</Badge>
}

function d(s: string) { return format(new Date(s + 'T00:00:00'), 'MMM d, yyyy') }

export default function LabsPage() {
  const [results, setResults] = useState<LabResult[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  // Panel form state
  const [panelDate, setPanelDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [panelName, setPanelName] = useState('')
  const [labName, setLabName] = useState('')
  const [rows, setRows] = useState<LabRow[]>([EMPTY_ROW()])
  const [filterCategory, setFilterCategory] = useState<string>('All')

  useEffect(() => { load() }, [])

  function load() {
    setLoading(true)
    fetch('/api/labs')
      .then(r => r.json())
      .then(data => {
        setResults(data)
        // Auto-expand most recent date
        if (data.length > 0) setExpandedDates(new Set([data[0].testDate]))
      })
      .finally(() => setLoading(false))
  }

  function openAddPanel() {
    setPanelDate(format(new Date(), 'yyyy-MM-dd'))
    setPanelName('')
    setLabName('')
    setRows([EMPTY_ROW()])
    setOpen(true)
  }

  function selectTest(rowIdx: number, testKey: string) {
    const known = getLabTest(testKey)
    setRows(prev => prev.map((r, i) => i !== rowIdx ? r : {
      ...r,
      testKey,
      testName: known && testKey !== 'other' ? known.name : r.testName,
      unit: known && testKey !== 'other' ? known.unit : r.unit,
      refRangeLow: known?.refLow != null ? String(known.refLow) : r.refRangeLow,
      refRangeHigh: known?.refHigh != null ? String(known.refHigh) : r.refRangeHigh,
    }))
  }

  function updateRow(idx: number, field: keyof LabRow, value: string) {
    setRows(prev => prev.map((r, i) => i !== idx ? r : { ...r, [field]: value }))
  }

  async function handleSave() {
    const validRows = rows.filter(r => r.value !== '' && (r.testName !== '' || r.testKey !== ''))
    if (validRows.length === 0) { toast.error('Enter at least one result'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: validRows.map(r => ({
            testDate: panelDate,
            testName: r.testKey && r.testKey !== 'other' ? (getLabTest(r.testKey)?.name ?? r.testName) : r.testName,
            testKey: r.testKey || null,
            value: parseFloat(r.value),
            unit: r.unit,
            refRangeLow: r.refRangeLow ? parseFloat(r.refRangeLow) : undefined,
            refRangeHigh: r.refRangeHigh ? parseFloat(r.refRangeHigh) : undefined,
            labName: labName || undefined,
            panelName: panelName || undefined,
            notes: r.notes || undefined,
          })),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${validRows.length} result${validRows.length > 1 ? 's' : ''} saved`)
      setOpen(false)
      load()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this lab result?')) return
    await fetch(`/api/labs?id=${id}`, { method: 'DELETE' })
    toast.success('Deleted')
    load()
  }

  // Group by date
  const byDate = results.reduce<Record<string, LabResult[]>>((acc, r) => {
    if (!acc[r.testDate]) acc[r.testDate] = []
    acc[r.testDate].push(r)
    return acc
  }, {})

  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  // Stats for key markers
  const keyTests = ['estradiol', 'fsh', 'tsh', 'vitamin_d', 'testosterone_total']
  const latestByKey: Record<string, LabResult> = {}
  for (const r of results) {
    if (r.testKey && keyTests.includes(r.testKey) && !latestByKey[r.testKey]) {
      latestByKey[r.testKey] = r
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lab Results</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track bloodwork over time to monitor HRT effectiveness and overall health.</p>
        </div>
        <Button onClick={openAddPanel} className="bg-rose-600 hover:bg-rose-700 gap-2 min-h-[44px]">
          <Plus className="w-4 h-4" />
          Add Results
        </Button>
      </div>

      {/* Key marker summary cards */}
      {Object.keys(latestByKey).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {keyTests.filter(k => latestByKey[k]).map(key => {
            const r = latestByKey[key]
            const known = getLabTest(key)
            const status = labStatus(r.value, r.refRangeLow, r.refRangeHigh)
            return (
              <Card key={key} className={`${status === 'high' || status === 'low' ? 'border-red-200 bg-red-50/30' : ''}`}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-gray-500 truncate">{known?.name ?? r.testName}</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">{r.value}</p>
                  <p className="text-xs text-gray-400">{r.unit}</p>
                  <div className="mt-1.5">
                    <StatusBadge value={r.value} low={r.refRangeLow} high={r.refRangeHigh} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{d(r.testDate)}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Results by date */}
      {loading ? (
        <div className="animate-pulse text-gray-400 text-center py-12">Loading lab results…</div>
      ) : sortedDates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16 space-y-3">
            <FlaskConical className="w-10 h-10 text-gray-200 mx-auto" />
            <p className="text-gray-400">No lab results yet.</p>
            <Button onClick={openAddPanel} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Add your first results
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedDates.map(date => {
            const dateResults = byDate[date]
            const expanded = expandedDates.has(date)
            const panel = dateResults[0]?.panelName
            const lab = dateResults[0]?.labName
            const outOfRange = dateResults.filter(r => {
              const s = labStatus(r.value, r.refRangeLow, r.refRangeHigh)
              return s === 'high' || s === 'low'
            }).length

            return (
              <Card key={date} className={outOfRange > 0 ? 'border-orange-200' : ''}>
                <button
                  type="button"
                  onClick={() => setExpandedDates(prev => {
                    const next = new Set(prev)
                    next.has(date) ? next.delete(date) : next.add(date)
                    return next
                  })}
                  className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 rounded-t-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{d(date)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {panel && <span className="text-xs text-gray-500">{panel}</span>}
                        {lab && <span className="text-xs text-gray-400">· {lab}</span>}
                        <span className="text-xs text-gray-400">· {dateResults.length} test{dateResults.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    {outOfRange > 0 && (
                      <Badge className="bg-orange-100 text-orange-700 text-xs">{outOfRange} out of range</Badge>
                    )}
                  </div>
                  {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {expanded && (
                  <div className="border-t border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">Test</th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Result</th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Reference</th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Status</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Notes</th>
                          <th className="py-2 px-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {dateResults.map((r, i) => {
                          const known = r.testKey ? getLabTest(r.testKey) : undefined
                          return (
                            <tr key={r.id} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                              <td className="py-2 px-4">
                                <div className="font-medium text-gray-800">{r.testName}</div>
                                {known?.clinicalNote && (
                                  <div className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-0.5">
                                    <Info className="w-2.5 h-2.5" />{known.clinicalNote}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-gray-900">
                                {r.value} <span className="font-normal text-xs text-gray-500">{r.unit}</span>
                              </td>
                              <td className="py-2 px-3 text-center text-xs text-gray-500">
                                {r.refRangeLow != null || r.refRangeHigh != null
                                  ? `${r.refRangeLow ?? '?'} – ${r.refRangeHigh ?? '?'}`
                                  : '—'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <StatusBadge value={r.value} low={r.refRangeLow} high={r.refRangeHigh} />
                              </td>
                              <td className="py-2 px-3 text-xs text-gray-500">{r.notes ?? ''}</td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(r.id)}
                                  className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                  aria-label="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Panel Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Lab Results</DialogTitle>
            <p className="text-sm text-gray-500">Enter all results from a single blood draw. Add rows for each test.</p>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Panel metadata */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Date of draw</Label>
                <Input type="date" value={panelDate} onChange={e => setPanelDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Panel / Order name <span className="text-gray-400">(optional)</span></Label>
                <Input placeholder="e.g. Hormone Panel" value={panelName} onChange={e => setPanelName(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lab / Ordering provider <span className="text-gray-400">(optional)</span></Label>
                <Input placeholder="e.g. Quest, LabCorp" value={labName} onChange={e => setLabName(e.target.value)} className="h-9" />
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Individual Tests</Label>
              {rows.map((row, idx) => {
                const known = row.testKey ? getLabTest(row.testKey) : undefined
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg">
                    {/* Test selector */}
                    <div className="col-span-4 space-y-1">
                      <Label className="text-[10px] text-gray-500">Test</Label>
                      <select
                        className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white"
                        value={row.testKey}
                        onChange={e => selectTest(idx, e.target.value)}
                      >
                        <option value="">— Select test —</option>
                        {LAB_CATEGORIES.map(cat => (
                          <optgroup key={cat} label={cat}>
                            {KNOWN_LAB_TESTS.filter(t => t.category === cat).map(t => (
                              <option key={t.key} value={t.key}>{t.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {row.testKey === 'other' && (
                        <Input
                          placeholder="Test name"
                          value={row.testName}
                          onChange={e => updateRow(idx, 'testName', e.target.value)}
                          className="h-8 text-sm mt-1"
                        />
                      )}
                    </div>

                    {/* Value */}
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] text-gray-500">Result</Label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={row.value}
                        onChange={e => updateRow(idx, 'value', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Unit */}
                    <div className="col-span-1 space-y-1">
                      <Label className="text-[10px] text-gray-500">Unit</Label>
                      <Input
                        placeholder={known?.unit ?? 'unit'}
                        value={row.unit}
                        onChange={e => updateRow(idx, 'unit', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Ref range */}
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] text-gray-500">Ref range</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="any"
                          placeholder="low"
                          value={row.refRangeLow}
                          onChange={e => updateRow(idx, 'refRangeLow', e.target.value)}
                          className="h-8 text-xs"
                        />
                        <span className="text-gray-400 text-xs">–</span>
                        <Input
                          type="number"
                          step="any"
                          placeholder="high"
                          value={row.refRangeHigh}
                          onChange={e => updateRow(idx, 'refRangeHigh', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] text-gray-500">Notes</Label>
                      <Input
                        placeholder="optional"
                        value={row.notes}
                        onChange={e => updateRow(idx, 'notes', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Remove row */}
                    <div className="col-span-1 pt-5">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Clinical note hint */}
                    {known?.clinicalNote && (
                      <div className="col-span-12 text-[10px] text-blue-600 bg-blue-50 rounded px-2 py-1 flex items-start gap-1">
                        <Info className="w-3 h-3 shrink-0 mt-0.5" />{known.clinicalNote}
                      </div>
                    )}
                  </div>
                )
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows(prev => [...prev, EMPTY_ROW()])}
                className="gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another test
              </Button>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="bg-rose-600 hover:bg-rose-700 flex-1">
                {saving ? 'Saving…' : `Save ${rows.filter(r => r.value).length || ''} Result${rows.filter(r => r.value).length !== 1 ? 's' : ''}`}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
