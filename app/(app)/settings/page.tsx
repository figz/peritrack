'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PlusCircle, Download } from 'lucide-react'

interface Definition {
  key: string
  label: string
  category: string | null
  isActive: boolean
  sortOrder: number | null
}

function DefinitionItem({ def, type, onToggle }: { def: Definition; type: string; onToggle: (key: string, isActive: boolean, type: string) => void }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
      <div>
        <p className="text-sm font-medium text-gray-800">{def.label}</p>
        {def.category && <p className="text-xs text-gray-400">{def.category}</p>}
      </div>
      <Switch
        checked={def.isActive}
        onCheckedChange={(checked) => onToggle(def.key, checked, type)}
        aria-label={`${def.isActive ? 'Disable' : 'Enable'} ${def.label}`}
      />
    </div>
  )
}

const emptySymptomForm = { key: '', label: '', category: '' }

export default function SettingsPage() {
  const [symptoms, setSymptoms] = useState<Definition[]>([])
  const [sideEffects, setSideEffects] = useState<Definition[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [addType, setAddType] = useState<'symptom' | 'side_effect'>('symptom')
  const [form, setForm] = useState(emptySymptomForm)
  const [saving, setSaving] = useState(false)
  const [clearInput, setClearInput] = useState('')
  const [clearing, setClearing] = useState(false)

  const load = () => {
    fetch('/api/settings').then((r) => r.json()).then(({ symptoms: s, sideEffects: se }) => {
      setSymptoms(s)
      setSideEffects(se)
      setLoading(false)
    })
  }

  useEffect(load, [])

  async function handleToggle(key: string, isActive: boolean, type: string) {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, key, isActive }),
    })
    load()
  }

  async function handleAdd() {
    if (!form.key || !form.label) return toast.error('Key and label are required')
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: addType, ...form, isActive: true }),
      })
      if (!res.ok) throw new Error()
      toast.success('Added successfully')
      setAddOpen(false)
      setForm(emptySymptomForm)
      load()
    } catch {
      toast.error('Failed to add. Key may already exist.')
    } finally { setSaving(false) }
  }

  function exportData(format: 'json' | 'csv') {
    window.open(`/api/export?format=${format}`, '_blank')
  }

  const groupByCategory = (defs: Definition[]) => {
    const groups: Record<string, Definition[]> = {}
    defs.forEach((d) => {
      const cat = d.category ?? 'Other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(d)
    })
    return groups
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <Tabs defaultValue="symptoms">
        <TabsList>
          <TabsTrigger value="symptoms">Symptoms</TabsTrigger>
          <TabsTrigger value="side-effects">Side Effects</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        {/* Symptoms Tab */}
        <TabsContent value="symptoms" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Toggle symptoms on/off or add custom ones.</p>
            <Dialog open={addOpen && addType === 'symptom'} onOpenChange={(o) => { setAddOpen(o); setAddType('symptom') }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setAddType('symptom')} className="min-h-[44px]">
                  <PlusCircle className="w-4 h-4 mr-2" />Add Custom
                </Button>
              </DialogTrigger>
              <AddDialog form={form} setForm={setForm} onSave={handleAdd} saving={saving} title="Add Custom Symptom" />
            </Dialog>
          </div>
          {loading ? (
            <div className="animate-pulse text-gray-400 py-8 text-center">Loading…</div>
          ) : (
            Object.entries(groupByCategory(symptoms)).map(([cat, defs]) => (
              <Card key={cat}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm text-gray-600">{cat}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="divide-y divide-gray-50">
                    {defs.map((def) => (
                      <DefinitionItem key={def.key} def={def} type="symptom" onToggle={handleToggle} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Side Effects Tab */}
        <TabsContent value="side-effects" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Toggle side effects on/off or add custom ones.</p>
            <Dialog open={addOpen && addType === 'side_effect'} onOpenChange={(o) => { setAddOpen(o); setAddType('side_effect') }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setAddType('side_effect')} className="min-h-[44px]">
                  <PlusCircle className="w-4 h-4 mr-2" />Add Custom
                </Button>
              </DialogTrigger>
              <AddDialog form={form} setForm={setForm} onSave={handleAdd} saving={saving} title="Add Custom Side Effect" />
            </Dialog>
          </div>
          {loading ? (
            <div className="animate-pulse text-gray-400 py-8 text-center">Loading…</div>
          ) : (
            Object.entries(groupByCategory(sideEffects)).map(([cat, defs]) => (
              <Card key={cat}>
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm text-gray-600">{cat}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="divide-y divide-gray-50">
                    {defs.map((def) => (
                      <DefinitionItem key={def.key} def={def} type="side_effect" onToggle={handleToggle} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">Download all your data for backup or to share with your healthcare provider.</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => exportData('json')} className="min-h-[44px]">
                  <Download className="w-4 h-4 mr-2" />Export JSON
                </Button>
                <Button variant="outline" onClick={() => exportData('csv')} className="min-h-[44px]">
                  <Download className="w-4 h-4 mr-2" />Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-base text-red-700">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">Delete all log entries. This cannot be undone.</p>
              <p className="text-sm text-gray-500">Type <strong>DELETE ALL DATA</strong> to confirm:</p>
              <Input
                value={clearInput}
                onChange={(e) => setClearInput(e.target.value)}
                placeholder="Type to confirm"
                className="min-h-[44px]"
              />
              <Button
                variant="destructive"
                disabled={clearInput !== 'DELETE ALL DATA' || clearing}
                onClick={async () => {
                  setClearing(true)
                  try {
                    const res = await fetch('/api/log?deleteAll=1', { method: 'DELETE' })
                    if (res.ok) { toast.success('All log data cleared'); setClearInput('') }
                    else toast.error('Failed to clear data')
                  } catch {
                    toast.error('Failed to clear data')
                  } finally { setClearing(false) }
                }}
                className="min-h-[44px]"
              >
                {clearing ? 'Clearing…' : 'Clear All Log Data'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AddDialog({ form, setForm, onSave, saving, title }: {
  form: { key: string; label: string; category: string }
  setForm: (f: { key: string; label: string; category: string }) => void
  onSave: () => void
  saving: boolean
  title: string
}) {
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="add-key">Key (snake_case, unique) *</Label>
          <Input id="add-key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="e.g. joint_pain" className="min-h-[44px]" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="add-label">Display Label *</Label>
          <Input id="add-label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Joint pain" className="min-h-[44px]" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="add-cat">Category</Label>
          <Input id="add-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Musculoskeletal" className="min-h-[44px]" />
        </div>
        <Button onClick={onSave} disabled={saving || !form.key || !form.label} className="w-full bg-rose-600 hover:bg-rose-700 min-h-[44px]">
          {saving ? 'Saving…' : 'Add'}
        </Button>
      </div>
    </DialogContent>
  )
}
