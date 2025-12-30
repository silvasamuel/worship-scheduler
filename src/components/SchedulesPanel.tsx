import React, { useState, useRef } from 'react'
import { Plus, CalendarPlus, Music, Trash2, Wand2, Info, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Schedule, AssignmentSlot, Member } from '@/types'
import { INSTRUMENTS } from '@/lib/instruments'
import { dayLabel } from '@/lib/date'
import { useI18n } from '@/lib/i18n'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type Props = {
  schedules: Schedule[]
  members: Member[]
  onAddSchedule: (date: string, req: string[]) => void
  onRemoveSchedule: (id: string) => void
  onSetAssign: (scheduleId: string, slotId: string, memberId?: string) => void
  onAddSlot: (scheduleId: string, instrument: string) => void
  onRemoveSlot: (scheduleId: string, slotId: string) => void
  autoFill: (
    t?: (key: string, params?: Record<string, string | number>) => string,
    instrumentLabel?: (key: string) => string
  ) => void
  eligibleForSlot: (s: Schedule, slot: AssignmentSlot) => Member[]
}

export default function SchedulesPanel({
  schedules,
  members,
  onAddSchedule,
  onRemoveSchedule,
  onSetAssign,
  onAddSlot,
  onRemoveSlot,
  autoFill,
  eligibleForSlot,
}: Props) {
  const { t, locale, instrumentLabel } = useI18n()
  const [sDate, setSDate] = useState('')
  const [sInstruments, setSInstruments] = useState<string[]>([])
  const canAddSchedule = Boolean(sDate) && sInstruments.length > 0
  const [showAddScheduleTip, setShowAddScheduleTip] = useState(false)
  const [scheduleTipPlacement, setScheduleTipPlacement] = useState<'top' | 'bottom'>('top')
  const addScheduleWrapperRef = useRef<HTMLSpanElement | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [addSlotValues, setAddSlotValues] = useState<Record<string, string>>({})

  function addSchedule() {
    if (!canAddSchedule) return
    onAddSchedule(sDate, sInstruments)
    setSDate('')
    setSInstruments([])
  }

  function openDatePicker(e: React.MouseEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const showPicker = (input as HTMLInputElement).showPicker
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
    <Card className="shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <CalendarPlus className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900">{t('schedules.title')}</h2>
        </div>

        <div className="grid md:grid-cols-[auto_auto_1fr_auto] gap-3 mb-3 items-start">
          <div className="flex items-center gap-2 order-1 shrink-0">
            <div className="w-40">
              <input
                type="date"
                value={sDate}
                onChange={e => setSDate(e.target.value)}
                onFocus={openDatePicker}
                onClick={openDatePicker}
                lang={locale}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm transition-all duration-200 hover:border-gray-400"
              />
            </div>
            <span ref={addScheduleWrapperRef} className="relative inline-block" onClick={maybeShowScheduleTooltip}>
              <Button
                onClick={addSchedule}
                disabled={!canAddSchedule}
                title={!canAddSchedule ? t('schedules.tooltip.add') : undefined}
                className="gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                {t('schedules.add')}
              </Button>
              {!canAddSchedule && showAddScheduleTip && (
                <span
                  role="tooltip"
                  className={`pointer-events-none absolute z-30 rounded-md bg-gray-900 text-white text-xs px-2 py-1 shadow-lg border border-white/10 whitespace-nowrap ${scheduleTipPlacement === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' : 'top-full mt-2 left-1/2 -translate-x-1/2'}`}
                >
                  {t('schedules.tooltip.add')}
                  <span
                    className={`absolute w-2 h-2 bg-gray-900 rotate-45 border border-white/10 ${scheduleTipPlacement === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-px' : 'bottom-full left-1/2 -translate-x-1/2 -mb-px'}`}
                  ></span>
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2 order-2 shrink-0">
            <Button
              variant="secondary"
              onClick={() => setSInstruments(prev => (prev.length === INSTRUMENTS.length ? [] : [...INSTRUMENTS]))}
              className="gap-2 shrink-0"
            >
              <span className="grid">
                <span className="col-start-1 row-start-1 whitespace-nowrap">
                  {sInstruments.length === INSTRUMENTS.length ? t('schedules.unselectAll') : t('schedules.selectAll')}
                </span>
                <span className="col-start-1 row-start-1 opacity-0 pointer-events-none select-none whitespace-nowrap">
                  {t('schedules.unselectAll')}
                </span>
              </span>
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 order-3">
            {[...INSTRUMENTS]
              .sort((a, b) => a.localeCompare(b))
              .map(inst => {
                const active = sInstruments.includes(inst)
                return (
                  <button
                    key={inst}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-sm text-center w-full ${active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-900 hover:bg-gray-50'}`}
                    onClick={() => setSInstruments(prev => (active ? prev.filter(i => i !== inst) : [...prev, inst]))}
                  >
                    {instrumentLabel(inst)}
                  </button>
                )
              })}
          </div>
        </div>

        <div className="space-y-3">
          {schedules.length === 0 && <p className="text-sm text-gray-500">{t('schedules.empty')}</p>}
          {schedules.map(s => (
            <div
              key={s.id}
              className="rounded-2xl border border-gray-200/60 p-4 bg-gradient-to-br from-white to-gray-50/50 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <div className="font-semibold">{dayLabel(s.date, locale)}</div>
                <Badge
                  className={
                    s.status === 'complete' ? 'bg-green-600' : s.status === 'partial' ? 'bg-amber-500' : 'bg-gray-400'
                  }
                >
                  {t(`status.${s.status}`)}
                </Badge>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setConfirmRemoveId(s.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-2 grid md:grid-cols-2 gap-3">
                {s.assignments.map(slot => {
                  return (
                    <div
                      key={slot.id}
                      className="flex items-center gap-2 bg-white border border-gray-200/60 rounded-xl p-3 shadow-sm"
                    >
                      <Music className="w-4 h-4" />
                      <span className="text-sm font-medium mr-1">{instrumentLabel(slot.instrument)}</span>
                      <Select
                        value={slot.memberId || ''}
                        onValueChange={v => onSetAssign(s.id, slot.id, v || undefined)}
                        valueLabel={
                          slot.memberId ? members.find(m => m.id === slot.memberId)?.name || slot.memberId : undefined
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('select.member.placeholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">{t('select.unassigned')}</SelectItem>
                          {eligibleForSlot(s, slot).map(m => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => onRemoveSlot(s.id, slot.id)}
                        title={t('schedules.removeSlot')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Select
                  value={addSlotValues[s.id] || ''}
                  onValueChange={instrument => {
                    if (instrument) {
                      onAddSlot(s.id, instrument)
                      setAddSlotValues(prev => ({ ...prev, [s.id]: '' }))
                    }
                  }}
                >
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue placeholder={t('schedules.addInstrument')} />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUMENTS.map(inst => (
                      <SelectItem key={inst} value={inst}>
                        {instrumentLabel(inst)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {s.issues.length > 0 && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-2 text-sm text-amber-900 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5" />
                  <ul className="list-disc pl-4">
                    {s.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {schedules.length > 0 && (
          <div className="mt-4">
            <Button onClick={() => autoFill(t, instrumentLabel)} className="gap-2">
              <Wand2 className="w-4 h-4" />
              Auto‑Fill Schedules
            </Button>
          </div>
        )}
        <ConfirmDialog
          open={!!confirmRemoveId}
          onOpenChange={o => !o && setConfirmRemoveId(null)}
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
