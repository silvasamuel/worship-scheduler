import React, { useState, useRef } from 'react'
import { Plus, CalendarPlus, Music, Trash2, Wand2, Info, X, CalendarDays, Pencil, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Schedule, AssignmentSlot, Member } from '@/types'
import { INSTRUMENTS } from '@/lib/instruments'
import { dayLabel } from '@/lib/date'
import { useI18n } from '@/lib/i18n'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'

type Props = {
  schedules: Schedule[]
  members: Member[]
  onAddSchedule: (date: string, time: string, name: string, req: string[]) => void
  onRemoveSchedule: (id: string) => void
  onUpdateSchedule: (id: string, patch: { name?: string; date?: string; time?: string }) => void
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
  onUpdateSchedule,
  onSetAssign,
  onAddSlot,
  onRemoveSlot,
  autoFill,
  eligibleForSlot,
}: Props) {
  const { t, locale, instrumentLabel } = useI18n()
  const [sDateTime, setSDateTime] = useState('')
  const [sName, setSName] = useState('')
  const [sInstruments, setSInstruments] = useState<string[]>([])
  const canAddSchedule = Boolean(sDateTime) && Boolean(sName.trim()) && sInstruments.length > 0
  const [showAddScheduleTip, setShowAddScheduleTip] = useState(false)
  const [scheduleTipPlacement, setScheduleTipPlacement] = useState<'top' | 'bottom'>('top')
  const addScheduleWrapperRef = useRef<HTMLSpanElement | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [addSlotValues, setAddSlotValues] = useState<Record<string, string>>({})
  const [monthOpen, setMonthOpen] = useState(false)
  const [monthYear, setMonthYear] = useState(String(new Date().getFullYear()))
  const [monthMonth, setMonthMonth] = useState('')
  const [monthResultOpen, setMonthResultOpen] = useState(false)
  const [monthResult, setMonthResult] = useState<{ created: number; skipped: number; ignored: number } | null>(null)
  const [monthIgnore, setMonthIgnore] = useState<Array<'Freedom' | 'Somos Fortes' | 'Entre Elas'>>([])
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('') // yyyy-mm-dd
  const [editTime, setEditTime] = useState('') // HH:mm

  const AUTO_SUNDAY_NAME = 'DOMINGO DE CELEBRAÇÃO'
  const AUTO_FIRST_THURSDAY_NAME = 'FAROL DE ORAÇÃO'
  const AUTO_THURSDAY_NAME = 'QUINTA DE CRESCIMENTO'

  function autoNameForDate(dateISO: string): string | undefined {
    if (!dateISO) return undefined
    const d = new Date(dateISO + 'T00:00:00')
    const dow = d.getDay() // 0=Sun ... 4=Thu
    if (dow === 0) return AUTO_SUNDAY_NAME
    if (dow !== 4) return undefined

    // First Thursday of the month?
    const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1)
    const firstDow = firstOfMonth.getDay()
    const firstThursdayDate = 1 + ((4 - firstDow + 7) % 7)
    return d.getDate() === firstThursdayDate ? AUTO_FIRST_THURSDAY_NAME : AUTO_THURSDAY_NAME
  }

  function maybeAutofillNameFromDate(nextDateISO: string) {
    const nextAuto = autoNameForDate(nextDateISO)
    if (!nextAuto) return
    // Only overwrite if the user didn't type a custom name (empty or already one of our auto names)
    if (!sName.trim() || [AUTO_SUNDAY_NAME, AUTO_FIRST_THURSDAY_NAME, AUTO_THURSDAY_NAME].includes(sName.trim())) {
      setSName(nextAuto)
    }
  }

  function addSchedule() {
    if (!canAddSchedule) return
    const [date, time] = sDateTime.split('T')
    onAddSchedule(date, time || '19:30', sName, sInstruments)
    setSDateTime('')
    setSName('')
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

  function generateMonthSchedules() {
    const year = Number(monthYear)
    const month = Number(monthMonth) // 1-12
    if (!year || !month) return

    const existing = new Set(schedules.map(s => `${s.date}|${s.time}`))
    let created = 0
    let skipped = 0
    let ignored = 0

    const last = new Date(year, month, 0) // last day of month
    let firstThursdayDone = false

    const pad2 = (n: number) => String(n).padStart(2, '0')
    const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

    const addIfMissing = (date: string, time: string, name: string, instruments: string[]) => {
      const key = `${date}|${time}`
      if (existing.has(key)) {
        skipped++
        return
      }
      onAddSchedule(date, time, name, instruments)
      existing.add(key)
      created++
    }

    const nthWeekdayOfMonth = (weekday: number, nth: number): Date | null => {
      // weekday: 0=Sun..6=Sat
      const first = new Date(year, month - 1, 1)
      const firstDow = first.getDay()
      const firstWanted = 1 + ((weekday - firstDow + 7) % 7)
      const dayOfMonth = firstWanted + 7 * (nth - 1)
      const d = new Date(year, month - 1, dayOfMonth)
      return d.getMonth() === month - 1 ? d : null
    }

    for (let day = 1; day <= last.getDate(); day++) {
      const d = new Date(year, month - 1, day)
      const dow = d.getDay() // 0=Sun ... 4=Thu
      if (dow !== 0 && dow !== 4) continue

      const date = toISODate(d)
      const name =
        dow === 0 ? 'DOMINGO DE CELEBRAÇÃO' : !firstThursdayDone ? 'FAROL DE ORAÇÃO' : 'QUINTA DE CRESCIMENTO'
      const time = dow === 0 ? '09:00' : '19:30'
      const key = `${date}|${time}`

      if (existing.has(key)) {
        skipped++
        if (dow === 4 && !firstThursdayDone) firstThursdayDone = true
        continue
      }

      const instrumentsForDate =
        dow === 4 ? INSTRUMENTS.filter(i => !['Guitarra', 'Teclado', 'Baixo'].includes(i)) : [...INSTRUMENTS]
      onAddSchedule(date, time, name, instrumentsForDate)
      existing.add(key)
      created++
      if (dow === 4 && !firstThursdayDone) firstThursdayDone = true
    }

    // Extra monthly events:
    // - 1st Saturday: Freedom @ 18:30
    const firstSaturday = nthWeekdayOfMonth(6, 1)
    if (monthIgnore.includes('Freedom')) {
      ignored++
    } else if (firstSaturday)
      addIfMissing(
        toISODate(firstSaturday),
        '18:30',
        'Freedom',
        INSTRUMENTS.filter(i => !['Teclado'].includes(i))
      )

    // - 2nd Friday: Somos Fortes @ 19:30
    const secondFriday = nthWeekdayOfMonth(5, 2)
    if (monthIgnore.includes('Somos Fortes')) {
      ignored++
    } else if (secondFriday)
      addIfMissing(
        toISODate(secondFriday),
        '19:30',
        'Somos Fortes',
        INSTRUMENTS.filter(i => !['Guitarra', 'Teclado', 'Baixo', 'Backing'].includes(i))
      )

    // - 2nd Saturday: Entre Elas @ 16:30
    const secondSaturday = nthWeekdayOfMonth(6, 2)
    if (monthIgnore.includes('Entre Elas')) {
      ignored++
    } else if (secondSaturday)
      addIfMissing(
        toISODate(secondSaturday),
        '16:30',
        'Entre Elas',
        INSTRUMENTS.filter(i => !['Guitarra', 'Teclado', 'Baixo', 'Bateria', 'Backing'].includes(i))
      )

    // - 3rd Saturday: Ensaio @ 16:45 and @ 18:30
    const thirdSaturday = nthWeekdayOfMonth(6, 3)
    if (thirdSaturday) {
      const date = toISODate(thirdSaturday)
      addIfMissing(date, '16:45', 'Ensaio', [...INSTRUMENTS])
      addIfMissing(date, '18:30', 'Ensaio', [...INSTRUMENTS])
    }

    setMonthOpen(false)
    setMonthYear('')
    setMonthMonth('')
    setMonthResult({ created, skipped, ignored })
    setMonthResultOpen(true)
  }

  function openEdit(s: Schedule) {
    setEditId(s.id)
    setEditName(s.name || '')
    setEditDate(s.date || '')
    setEditTime(s.time || '')
    setEditOpen(true)
  }

  function saveEdit() {
    if (!editId) return
    const name = editName.trim()
    const date = editDate
    const time = editTime.trim()
    if (!name || !date || !time) return
    onUpdateSchedule(editId, { name, date, time })
    setEditOpen(false)
  }

  return (
    <Card className="shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <CalendarPlus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('schedules.title')}</h2>
        </div>

        <div className="flex flex-wrap items-start gap-2 mb-3">
          <div className="w-60">
            <input
              type="datetime-local"
              value={sDateTime}
              onChange={e => {
                const next = e.target.value
                setSDateTime(next)
                const [date] = next.split('T')
                maybeAutofillNameFromDate(date)
              }}
              onFocus={openDatePicker}
              onClick={openDatePicker}
              lang={locale}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-600"
            />
          </div>
          <input
            type="text"
            value={sName}
            onChange={e => setSName(e.target.value)}
            placeholder={t('schedules.namePlaceholder')}
            className="w-56 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-600"
          />
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
          <Button variant="secondary" onClick={() => setMonthOpen(true)} className="gap-2 shrink-0">
            <CalendarDays className="w-4 h-4" />
            {t('schedules.generateMonth')}
          </Button>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setSInstruments(prev => (prev.length === INSTRUMENTS.length ? [] : [...INSTRUMENTS]))}
              className="gap-2"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
            {[...INSTRUMENTS]
              .sort((a, b) => a.localeCompare(b))
              .map(inst => {
                const active = sInstruments.includes(inst)
                return (
                  <button
                    key={inst}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-sm text-center w-full transition-all duration-200 shadow-sm hover:shadow-md ${active ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-700'}`}
                    onClick={() => setSInstruments(prev => (active ? prev.filter(i => i !== inst) : [...prev, inst]))}
                  >
                    {instrumentLabel(inst)}
                  </button>
                )
              })}
          </div>
        </div>

        <div className="space-y-3">
          {schedules.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">{t('schedules.empty')}</p>}
          {schedules.map(s => (
            <div
              key={s.id}
              className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-4 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <div className="font-semibold">
                  {s.name} • {dayLabel(s.date, locale)} • {s.time}
                </div>
                <Badge
                  className={
                    s.status === 'complete' ? 'bg-green-600' : s.status === 'partial' ? 'bg-amber-500' : 'bg-gray-400'
                  }
                >
                  {t(`status.${s.status}`)}
                </Badge>
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title={t('schedules.edit')}>
                    <Pencil className="w-4 h-4" />
                  </Button>
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
                      className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-3 shadow-sm"
                    >
                      <Music className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      <span className="text-sm font-medium mr-1 text-gray-900 dark:text-gray-100">
                        {instrumentLabel(slot.instrument)}
                      </span>
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
        <Modal open={monthOpen} onOpenChange={setMonthOpen} title={t('schedules.generateMonth')}>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Select value={monthYear} onValueChange={setMonthYear}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('schedules.year')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 7 }).map((_, idx) => {
                      const y = String(new Date().getFullYear() + idx)
                      return (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <Select value={monthMonth} onValueChange={setMonthMonth}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('schedules.month')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }).map((_, idx) => {
                      const m = String(idx + 1).padStart(2, '0')
                      const label = new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2020, idx, 1))
                      return (
                        <SelectItem key={m} value={m}>
                          {label}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-gray-600 dark:text-gray-400">{t('schedules.generateIgnoreLabel')}</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['Freedom', 'Somos Fortes', 'Entre Elas'] as const).map(name => {
                  const checked = monthIgnore.includes(name)
                  return (
                    <label
                      key={name}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition-all duration-200 ${
                        checked
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-blue-600"
                        checked={checked}
                        onChange={e => {
                          const next = e.target.checked
                          setMonthIgnore(prev => (next ? [...prev, name] : prev.filter(x => x !== name)))
                        }}
                      />
                      <span className="font-medium">{name}</span>
                    </label>
                  )
                })}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('schedules.generateIgnoreHelp')}</div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setMonthOpen(false)
                  setMonthYear('')
                  setMonthMonth('')
                }}
              >
                {t('actions.cancel')}
              </Button>
              <Button onClick={generateMonthSchedules} disabled={!monthYear || !monthMonth}>
                {t('schedules.generate')}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={monthResultOpen}
          onOpenChange={o => {
            setMonthResultOpen(o)
            if (!o) setMonthResult(null)
          }}
          title={t('schedules.generateResultTitle')}
          className="max-w-md"
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border border-gray-200/70 dark:border-gray-700/70 bg-gradient-to-br from-white to-gray-50/60 dark:from-gray-800 dark:to-gray-900/60 p-4 shadow-sm">
              <div className="mt-0.5 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('schedules.generateResultSubtitle')}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge className="bg-green-600">
                    {t('schedules.generateResultCreated', { count: monthResult?.created ?? 0 })}
                  </Badge>
                  <Badge className="bg-gray-500">
                    {t('schedules.generateResultSkipped', { count: monthResult?.skipped ?? 0 })}
                  </Badge>
                  <Badge className="bg-blue-600">
                    {t('schedules.generateResultIgnored', { count: monthResult?.ignored ?? 0 })}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setMonthResultOpen(false)}>{t('actions.close')}</Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={editOpen}
          onOpenChange={o => {
            setEditOpen(o)
            if (!o) {
              setEditId(null)
              setEditName('')
              setEditDate('')
              setEditTime('')
            }
          }}
          title={t('schedules.editTitle')}
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-gray-400">{t('schedules.editName')}</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-gray-400">{t('schedules.editDate')}</label>
              <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} lang={locale} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-gray-400">{t('schedules.editTime')}</label>
              <Input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setEditOpen(false)}>
                {t('actions.cancel')}
              </Button>
              <Button onClick={saveEdit} disabled={!editId || !editName.trim() || !editDate || !editTime.trim()}>
                {t('actions.save')}
              </Button>
            </div>
          </div>
        </Modal>
      </CardContent>
    </Card>
  )
}
