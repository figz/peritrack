'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PlusCircle, Edit2, Trash2, AlertCircle, Utensils, Dumbbell, Plane, Thermometer, MoreHorizontal } from 'lucide-react'

interface LifeEvent {
  id: string
  eventDate: string
  category: string
  title: string
  description: string | null
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  stressor: { label: 'Stressor', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
  nutrition: { label: 'Nutrition', icon: Utensils, color: 'bg-green-100 text-green-700' },
  exercise: { label: 'Exercise', icon: Dumbbell, color: 'bg-blue-100 text-blue-700' },
  travel: { label: 'Travel', icon: Plane, color: 'bg-purple-100 text-purple-700' },
  illness: { label: 'Illness', icon: Thermometer, color: 'bg-orange-100 text-orange-700' },
  other: { label: 'Other', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-600' },
}

const emptyForm = { eventDate: format(new Date(), 'yyyy-MM-dd'), category: 'stressor', title: '', description: '' }

export default function EventsPage() {
  const [events, setEvents] = useState<LifeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch('/api/events').then((r) => r.json()).then((d) => { setEvents(d); setLoading(false) })
  }

  useEffect(load, [])

  function openNew() { setEditingId(null); setForm(emptyForm); setDialogOpen(true) }
  function openEdit(e: LifeEvent) {
    setEditingId(e.id)
    setForm({ eventDate: format(new Date(e.eventDate), 'yyyy-MM-dd'), category: e.category, title: e.title, description: e.description ?? '' })
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const url = editingId ? `/api/events/${editingId}` : '/api/events'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      toast.success(editingId ? 'Event updated' : 'Event added')
      setDialogOpen(false)
      load()
    } catch {
      toast.error('Failed to save event')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this event?')) return
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Event deleted'); load() }
    else toast.error('Failed to delete')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Life Events</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track stressors, nutrition changes, exercise, and more</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-rose-600 hover:bg-rose-700 min-h-[44px]">
              <PlusCircle className="w-4 h-4 mr-2" />Add Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Event' : 'Add Life Event'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="event-date">Date *</Label>
                  <Input id="event-date" type="date" value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} className="min-h-[44px]" />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="event-title">Title *</Label>
                <Input id="event-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Brief description" className="min-h-[44px]" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="event-desc">Description</Label>
                <Textarea id="event-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Additional details…" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving || !form.title} className="flex-1 bg-rose-600 hover:bg-rose-700">
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
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-400 mb-4">No life events logged yet.</p>
            <Button onClick={openNew} variant="outline">Add your first event</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const cfg = CATEGORY_CONFIG[event.category] ?? CATEGORY_CONFIG.other
            const Icon = cfg.icon
            return (
              <Card key={event.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`mt-0.5 p-2 rounded-lg ${cfg.color} shrink-0`}>
                        <Icon className="w-4 h-4" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">{event.title}</span>
                          <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{format(new Date(event.eventDate), 'EEEE, MMM d, yyyy')}</p>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(event)} className="min-h-[44px]">
                        <Edit2 className="w-4 h-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(event.id)} className="min-h-[44px] text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
