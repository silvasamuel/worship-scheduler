import React, { useState } from 'react'
import { Plus, CalendarPlus, Music, Trash2, Wand2, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Schedule, AssignmentSlot, Member } from '@/types'
import { INSTRUMENTS } from '@/lib/instruments'
import { dayLabel } from '@/lib/date'

type Props = {
  schedules: Schedule[]
  members: Member[]
  onAddSchedule: (date: string, req: string[]) => void
  onRemoveSchedule: (id: string) => void
  onSetAssign: (scheduleId: string, slotId: string, memberId?: string) => void
  autoFill: () => void
  eligibleForSlot: (s: Schedule, slot: AssignmentSlot) => Member[]
}

export default function SchedulesPanel({ schedules, members, onAddSchedule, onRemoveSchedule, onSetAssign, autoFill, eligibleForSlot }: Props) {
  const [sDate, setSDate] = useState('')
  const [sInstruments, setSInstruments] = useState<string[]>([])

  function addSchedule() {
    if (!sDate) return
    onAddSchedule(sDate, sInstruments)
    setSDate(''); setSInstruments([])
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarPlus className="w-5 h-5"/>
          <h2 className="font-semibold">Schedules</h2>
        </div>

        <div className="grid md:grid-cols-[1fr_auto_auto] gap-3 mb-3 items-start">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:col-span-2 order-1 md:order-none">
            {[...INSTRUMENTS].sort((a,b)=>a.localeCompare(b)).map((inst) => {
              const active = sInstruments.includes(inst)
              return (
                <button key={inst} type="button" className={`rounded-xl border px-3 py-2 text-sm text-center w-full ${active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-900 hover:bg-gray-50'}`} onClick={() => setSInstruments((prev) => active ? prev.filter((i) => i !== inst) : [...prev, inst])}>{inst}</button>
              )
            })}
          </div>
          <div className="flex items-center justify-end gap-2 order-3 md:order-none shrink-0">
            <Button variant="secondary" onClick={() => setSInstruments((prev) => prev.length === INSTRUMENTS.length ? [] : [...INSTRUMENTS])} className="gap-2 shrink-0">{sInstruments.length === INSTRUMENTS.length ? 'Unselect All' : 'Select All'}</Button>
          </div>

          <div className="flex items-center justify-end gap-2 order-2 md:order-none shrink-0">
            <div className="w-40"><Input type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} /></div>
            <Button onClick={addSchedule} className="gap-2 shrink-0"><Plus className="w-4 h-4"/>Add Schedule</Button>
          </div>
        </div>

        <div className="space-y-3">
          {schedules.length === 0 && <p className="text-sm text-gray-500">No schedules yet. Add a date and instruments above.</p>}
          {schedules.map((s) => (
            <div key={s.id} className="rounded-2xl border p-3 bg-white">
              <div className="flex items-center gap-2">
                <div className="font-semibold">{dayLabel(s.date)}</div>
                <Badge className={s.status === 'complete' ? 'bg-green-600' : s.status === 'partial' ? 'bg-amber-500' : 'bg-gray-400'}>{s.status}</Badge>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onRemoveSchedule(s.id)}><Trash2 className="w-4 h-4"/></Button>
                </div>
              </div>

              <div className="mt-2 grid md:grid-cols-2 gap-3">
                {s.assignments.map((slot) => (
                  <div key={slot.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                    <Music className="w-4 h-4"/>
                    <span className="text-sm font-medium mr-1">{slot.instrument}</span>
                    <Select value={slot.memberId || ''} onValueChange={(v) => onSetAssign(s.id, slot.id, v || undefined)} valueLabel={slot.memberId ? (members.find((m) => m.id === slot.memberId)?.name || slot.memberId) : undefined}>
                      <SelectTrigger className="h-8 w-full"><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Unassigned —</SelectItem>
                        {eligibleForSlot(s, slot).map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {s.issues.length > 0 && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-2 text-sm text-amber-900 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5" />
                  <ul className="list-disc pl-4">
                    {s.issues.map((issue, idx) => (<li key={idx}>{issue}</li>))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {schedules.length > 0 && (
          <div className="mt-4">
            <Button onClick={autoFill} className="gap-2"><Wand2 className="w-4 h-4"/>Auto‑Fill Schedules</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


