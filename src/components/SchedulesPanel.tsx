import React, { useState, useRef } from 'react'
import { Plus, CalendarPlus, Music, Trash2, Wand2, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Schedule, AssignmentSlot, Member } from '@/types'
import { INSTRUMENTS, instrumentLabelForKey } from '@/lib/instruments'
import { dayLabel } from '@/lib/date'
import { useI18n } from '@/lib/i18n'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

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
  const { t, locale, instrumentLabel } = useI18n()
  const [sDate, setSDate] = useState('')
  const [sInstruments, setSInstruments] = useState<string[]>([])
  const canAddSchedule = Boolean(sDate) && sInstruments.length > 0
  const [showAddScheduleTip, setShowAddScheduleTip] = useState(false)
  const [scheduleTipPlacement, setScheduleTipPlacement] = useState<'top' | 'bottom'>('top')
  const addScheduleWrapperRef = useRef<HTMLSpanElement | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  function addSchedule() {
    if (!canAddSchedule) return
    onAddSchedule(sDate, sInstruments)
    setSDate(''); setSInstruments([])
  }

  function openDatePicker(e: React.MouseEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const showPicker = (input as any).showPicker
    if (typeof showPicker === 'function') {
      try {
        showPicker.call(input)
      } catch {
        // no-op
      }
    } else {
      input.focus()
    }
  }

  function maybeShowScheduleTooltip(e: React.MouseEvent) {
    if (canAddSchedule) return
    e.preventDefault()
    e.stopPropagation()
    const el = addScheduleWrapperRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      // If there isn't enough space above, show below
      setScheduleTipPlacement(rect.top < 40 ? 'bottom' : 'top')
    } else {
      setScheduleTipPlacement('top')
    }
    setShowAddScheduleTip(true)
    window.setTimeout(() => setShowAddScheduleTip(false), 1800)
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarPlus className="w-5 h-5"/>
          <h2 className="font-semibold">{t('schedules.title')}</h2>
        </div>

        <div className="grid md:grid-cols-[1fr_auto_auto] gap-3 mb-3 items-start">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:col-span-2 order-1 md:order-none">
            {[...INSTRUMENTS].sort((a,b)=>a.localeCompare(b)).map((inst) => {
              const active = sInstruments.includes(inst)
              return (
                <button key={inst} type="button" className={`rounded-xl border px-3 py-2 text-sm text-center w-full ${active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-900 hover:bg-gray-50'}`} onClick={() => setSInstruments((prev) => active ? prev.filter((i) => i !== inst) : [...prev, inst])}>{instrumentLabel(inst)}</button>
              )
            })}
          </div>
          <div className="flex items-center justify-end gap-2 order-3 md:order-none shrink-0">
            <Button
              variant="secondary"
              onClick={() => setSInstruments((prev) => prev.length === INSTRUMENTS.length ? [] : [...INSTRUMENTS])}
              className="gap-2 shrink-0"
            >
              <span className="grid">
                <span className="col-start-1 row-start-1 whitespace-nowrap">
                  {sInstruments.length === INSTRUMENTS.length ? t('schedules.unselectAll') : t('schedules.selectAll')}
                </span>
                <span className="col-start-1 row-start-1 opacity-0 pointer-events-none select-none whitespace-nowrap">{t('schedules.unselectAll')}</span>
              </span>
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2 order-2 md:order-none shrink-0">
            <div className="w-40">
              <input
                type="date"
                value={sDate}
                onChange={(e) => setSDate(e.target.value)}
                onFocus={openDatePicker}
                onClick={openDatePicker}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span ref={addScheduleWrapperRef} className="relative inline-block" onClick={maybeShowScheduleTooltip}>
              <Button
                onClick={addSchedule}
                disabled={!canAddSchedule}
                title={!canAddSchedule ? t('schedules.tooltip.add') : undefined}
                className="gap-2 shrink-0"
              >
                <Plus className="w-4 h-4"/>{t('schedules.add')}
              </Button>
              {!canAddSchedule && showAddScheduleTip && (
                <span
                  role="tooltip"
                  className={`pointer-events-none absolute z-30 rounded-md bg-gray-900 text-white text-xs px-2 py-1 shadow-lg border border-white/10 whitespace-nowrap ${scheduleTipPlacement === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' : 'top-full mt-2 left-1/2 -translate-x-1/2'}`}
                >
                  {t('schedules.tooltip.add')}
                  <span className={`absolute w-2 h-2 bg-gray-900 rotate-45 border border-white/10 ${scheduleTipPlacement === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-px' : 'bottom-full left-1/2 -translate-x-1/2 -mb-px'}`}></span>
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {schedules.length === 0 && <p className="text-sm text-gray-500">{t('schedules.empty')}</p>}
          {schedules.map((s) => (
            <div key={s.id} className="rounded-2xl border p-3 bg-white">
              <div className="flex items-center gap-2">
                <div className="font-semibold">{dayLabel(s.date, locale)}</div>
                <Badge className={s.status === 'complete' ? 'bg-green-600' : s.status === 'partial' ? 'bg-amber-500' : 'bg-gray-400'}>{t(`status.${s.status}`)}</Badge>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setConfirmRemoveId(s.id)}><Trash2 className="w-4 h-4"/></Button>
                </div>
              </div>

              <div className="mt-2 grid md:grid-cols-2 gap-3">
                {s.assignments.map((slot) => (
                  <div key={slot.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                    <Music className="w-4 h-4"/>
                    <span className="text-sm font-medium mr-1">{instrumentLabel(slot.instrument)}</span>
                    <Select value={slot.memberId || ''} onValueChange={(v) => onSetAssign(s.id, slot.id, v || undefined)} valueLabel={slot.memberId ? (members.find((m) => m.id === slot.memberId)?.name || slot.memberId) : undefined}>
                      <SelectTrigger className="w-full"><SelectValue placeholder={t('select.member.placeholder')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t('select.unassigned')}</SelectItem>
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
        <ConfirmDialog
          open={!!confirmRemoveId}
          onOpenChange={(o) => !o && setConfirmRemoveId(null)}
          title={t('confirm.schedule.title')}
          description={confirmRemoveId ? t('confirm.schedule.desc') : undefined}
          confirmLabel={t('actions.delete')}
          confirmVariant="destructive"
          onConfirm={() => {
            if (confirmRemoveId) {
              onRemoveSchedule(confirmRemoveId)
              setConfirmRemoveId(null)
            }
          }}
        />
      </CardContent>
    </Card>
  )
}


