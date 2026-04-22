'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { PlusCircle, Edit2, ChevronDown, ChevronUp, Clock } from 'lucide-react'

interface MedPeriod {
  id: string
  startDate: string
  endDate: string | null
  doseAtStart: string | null
  changeReason: string | null
  notes: string | null
}

interface Medication {
  id: string
  name: string
  type: string
  dose: string | null
  frequency: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  periods: MedPeriod[]
}

const TYPE_LABELS: Record<string, string> = {
  medication: 'Medication',
  hrt: 'HRT',
  supplement: 'Supplement',
  other: 'Other',
}
const TYPE_COLORS: Record<string, string> = {
  medication: 'bg-blue-100 text-blue-700',
  hrt: 'bg-purple-100 text-purple-700',
  supplement: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-600',
}

const emptyForm = { name: '', type: 'medication', dose: '', frequency: '', notes: '', startDate: format(new Date(), 'yyyy-MM-dd') }

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({})

  const load = () => {
    fetch('/api/medications')
      .then((r) => r.json())
      .then((d) => { setMedications(d); setLoading(false) })
  }

  useEffect(load, [])

  function openNew() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(med: Medication) {
    setEditingId(med.id)
    setForm({ name: med.name, type: med.type, dose: med.dose ?? '', frequency: med.frequency ?? '', notes: med.notes ?? '', startDate: med.periods[0]?.startDate ? format(new Date(med.periods[0].startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd') })
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (editingId) {
        const res = await fetch(`/api/medications/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        if (!res.ok) throw new Error()
        toast.success('Medication updated')
      } else {
        const res = await fetch('/api/medications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        if (!res.ok) throw new Error()
        toast.success('Medication added')
      }
      setDialogOpen(false)
      load()
    } catch {
      toast.error('Failed to save medication')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(med: Medication) {
    const res = await fetch(`/api/medications/${med.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...med, isActive: !med.isActive }),
    })
    if (res.ok) { toast.success(med.isActive ? 'Medication deactivated' : 'Medication activated'); load() }
    else toast.error('Failed to update')
  }

  const active = medications.filter((m) => m.isActive)
  const inactive = medications.filter((m) => !m.isActive)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Medications</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-rose-600 hover:bg-rose-700 min-h-[44px]">
              <PlusCircle className="w-4 h-4 mr-2" />Add Medication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Medication' : 'Add Medication'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="med-name">Name *</Label>
                <Input id="med-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Estradiol" className="min-h-[44px]" />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medication">Medication</SelectItem>
                    <SelectItem value="hrt">HRT</SelectItem>
                    <SelectItem value="supplement">Supplement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="med-dose">Dose</Label>
                  <Input id="med-dose" value={form.dose} onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))} placeholder="e.g. 1mg" className="min-h-[44px]" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="med-freq">Frequency</Label>
                  <Input id="med-freq" value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} placeholder="e.g. Daily" className="min-h-[44px]" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="med-start">Start Date</Label>
                <Input id="med-start" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="min-h-[44px]" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="med-notes">Notes</Label>
                <Textarea id="med-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving || !form.name} className="flex-1 bg-rose-600 hover:bg-rose-700">
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="animate-pulse text-gray-400 text-center py-12">Loading…</div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active ({active.length})</h2>
              {active.map((med) => <MedCard key={med.id} med={med} onEdit={openEdit} onToggle={toggleActive} expanded={expandedHistory[med.id]} onToggleHistory={(id) => setExpandedHistory((e) => ({ ...e, [id]: !e[id] }))} />)}
            </div>
          )}
          {inactive.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Inactive ({inactive.length})</h2>
              {inactive.map((med) => <MedCard key={med.id} med={med} onEdit={openEdit} onToggle={toggleActive} expanded={expandedHistory[med.id]} onToggleHistory={(id) => setExpandedHistory((e) => ({ ...e, [id]: !e[id] }))} />)}
            </div>
          )}
          {medications.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-400 mb-4">No medications added yet.</p>
                <Button onClick={openNew} variant="outline">Add your first medication</Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function MedCard({ med, onEdit, onToggle, expanded, onToggleHistory }: {
  med: Medication
  onEdit: (m: Medication) => void
  onToggle: (m: Medication) => void
  expanded: boolean
  onToggleHistory: (id: string) => void
}) {
  return (
    <Card className={!med.isActive ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{med.name}</span>
              <Badge className={`text-xs ${TYPE_COLORS[med.type]}`}>{TYPE_LABELS[med.type]}</Badge>
              {!med.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
            </div>
            {(med.dose || med.frequency) && (
              <p className="text-sm text-gray-500 mt-0.5">
                {[med.dose, med.frequency].filter(Boolean).join(' — ')}
              </p>
            )}
            {med.periods[0] && (
              <p className="text-xs text-gray-400 mt-0.5">
                Started {format(new Date(med.periods[0].startDate), 'MMM d, yyyy')}
                {!med.isActive && med.periods[0].endDate && ` · Ended ${format(new Date(med.periods[0].endDate), 'MMM d, yyyy')}`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={med.isActive} onCheckedChange={() => onToggle(med)} aria-label={`${med.isActive ? 'Deactivate' : 'Activate'} ${med.name}`} />
            <Button variant="ghost" size="sm" onClick={() => onEdit(med)} className="min-h-[44px]">
              <Edit2 className="w-4 h-4" />
              <span className="sr-only">Edit {med.name}</span>
            </Button>
          </div>
        </div>

        {med.periods.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => onToggleHistory(med.id)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors min-h-[32px]"
            >
              <Clock className="w-3 h-3" />
              {expanded ? 'Hide' : 'Show'} history ({med.periods.length} period{med.periods.length !== 1 ? 's' : ''})
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expanded && (
              <div className="mt-2 border-l-2 border-gray-100 pl-4 space-y-2">
                {med.periods.map((p) => (
                  <div key={p.id} className="text-xs text-gray-500">
                    <span className="font-medium">{format(new Date(p.startDate), 'MMM d, yyyy')}</span>
                    {p.endDate && <span> → {format(new Date(p.endDate), 'MMM d, yyyy')}</span>}
                    {p.doseAtStart && <span className="ml-2 text-gray-400">@ {p.doseAtStart}</span>}
                    {p.changeReason && <p className="text-gray-400 mt-0.5">{p.changeReason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
