import React, { useState, useRef } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Availability, Member } from '@/types'
import { INSTRUMENTS, instrumentLabelForKey } from '@/lib/instruments'
import { useI18n } from '@/lib/i18n'

type Props = {
  members: Member[]
  onAdd: (m: Omit<Member, 'id' | 'assignedCount'>) => void
  onRemove: (id: string) => void
  onUpdate: (m: Member) => void
  mAssigned: (m: Member) => number
}

export function availabilityLabel(a: Availability): string {
  switch (a) {
    case 'both': return 'Weekdays & Weekends'
    case 'weekdays': return 'Weekdays only'
    case 'weekends': return 'Weekends only'
    default: return String(a)
  }
}

export default function MembersPanel({ members, onAdd, onRemove, onUpdate, mAssigned }: Props) {
  const { t, instrumentLabel } = useI18n()
  const [mName, setMName] = useState('')
  const [mInstruments, setMInstruments] = useState<string[]>([])
  const [mAvailability, setMAvailability] = useState<Availability | ''>('')
  const [mTargetCount, setMTargetCount] = useState<number | ''>('')
  const [mCanSingAndPlay, setMCanSingAndPlay] = useState(false)
  const canAddMember = Boolean(mName.trim()) && mInstruments.length > 0
  const [showAddMemberTip, setShowAddMemberTip] = useState(false)
  const [memberTipPlacement, setMemberTipPlacement] = useState<'top' | 'bottom'>('top')
  const addMemberWrapperRef = useRef<HTMLSpanElement | null>(null)

  const [editing, setEditing] = useState<Member | null>(null)
  const [eInstruments, setEInstruments] = useState<string>('')
  const [eName, setEName] = useState('')
  const [eAvailability, setEAvailability] = useState<Availability>('both')
  const [eTarget, setETarget] = useState<number>(2)
  const [eCanSingAndPlay, setECanSingAndPlay] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null)

  function addMember() {
    if (!canAddMember) return
    const instruments = Array.from(new Set(mInstruments.map((x) => x.trim()).filter(Boolean))).map((x) => x.toLowerCase())
    onAdd({ name: mName.trim(), instruments, availability: (mAvailability || 'both') as Availability, targetCount: Math.max(0, Number(mTargetCount || 2) | 0), canSingAndPlay: mCanSingAndPlay })
    setMName(''); setMInstruments([]); setMAvailability(''); setMTargetCount(''); setMCanSingAndPlay(false)
  }

  function maybeShowMemberTooltip(e: React.MouseEvent) {
    if (canAddMember) return
    e.preventDefault()
    e.stopPropagation()
    const el = addMemberWrapperRef.current
    if (el) {
      const rect = el.getBoundingClientRect()
      setMemberTipPlacement(rect.top < 40 ? 'bottom' : 'top')
    } else {
      setMemberTipPlacement('top')
    }
    setShowAddMemberTip(true)
    window.setTimeout(() => setShowAddMemberTip(false), 1800)
  }

  function openEdit(m: Member) {
    setEditing(m)
    setEName(m.name)
    setEInstruments(m.instruments.map(instrumentLabelForKey).join(', '))
    setEAvailability(m.availability)
    setETarget(m.targetCount)
    setECanSingAndPlay(!!m.canSingAndPlay)
  }

  function saveEdit() {
    if (!editing) return
    const instruments = eInstruments.split(',').map((x) => x.trim()).filter(Boolean).map((x) => x.toLowerCase())
    onUpdate({ ...editing, name: eName.trim(), instruments, availability: eAvailability, targetCount: Math.max(0, eTarget | 0), canSingAndPlay: eCanSingAndPlay })
    setEditing(null)
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-semibold">{t('members.title')}</h2>
        </div>

        <div className="grid gap-3 mb-3">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs text-gray-600">{t('members.name')}</label>
            <Input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="e.g. Ana" />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs text-gray-600">{t('members.instruments')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[...INSTRUMENTS].sort((a,b)=>instrumentLabel(a).localeCompare(instrumentLabel(b))).map((inst) => {
                const active = mInstruments.includes(inst)
                return (
                  <button key={inst} type="button" className={`rounded-xl border px-3 py-2 text-sm text-center w-full ${active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-900 hover:bg-gray-50'}`} onClick={() => setMInstruments((prev) => active ? prev.filter((i) => i !== inst) : [...prev, inst])}>{instrumentLabel(inst)}</button>
                )
              })}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3 md:col-span-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">{t('members.availability')}</label>
              <Select value={(mAvailability as any) || ''} onValueChange={(v: string) => setMAvailability(v as Availability)} valueLabel={mAvailability ? availabilityLabel(mAvailability as Availability) : undefined}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={t('members.availability')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">{t('availability.both')}</SelectItem>
                  <SelectItem value="weekdays">{t('availability.weekdays')}</SelectItem>
                  <SelectItem value="weekends">{t('availability.weekends')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">{t('members.target')}</label>
              <Input type="number" min={0} placeholder="e.g. 2" value={mTargetCount as any} onChange={(e) => setMTargetCount(e.target.value === '' ? '' : parseInt(e.target.value || '0', 10))} />
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-gray-700 mt-6">
              <input type="checkbox" checked={mCanSingAndPlay} onChange={(e) => setMCanSingAndPlay(e.target.checked)} />
              {t('members.allowSingPlay')}
            </label>
          </div>
        </div>

        <span ref={addMemberWrapperRef} className="relative inline-block" onClick={maybeShowMemberTooltip}>
          <Button
            onClick={addMember}
            disabled={!canAddMember}
            title={!canAddMember ? t('members.tooltip.add') : undefined}
            className="gap-2"
          >
            <Plus className="w-4 h-4"/>{t('members.add')}
          </Button>
          {!canAddMember && showAddMemberTip && (
            <span
              role="tooltip"
              className={`pointer-events-none absolute z-30 rounded-md bg-gray-900 text-white text-xs px-2 py-1 shadow-lg border border-white/10 whitespace-nowrap ${memberTipPlacement === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' : 'top-full mt-2 left-1/2 -translate-x-1/2'}`}
            >
              {t('members.tooltip.add')}
              <span className={`absolute w-2 h-2 bg-gray-900 rotate-45 border border-white/10 ${memberTipPlacement === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-px' : 'bottom-full left-1/2 -translate-x-1/2 -mb-px'}`}></span>
            </span>
          )}
        </span>

        <div className="mt-4 space-y-2">
          {members.length === 0 && <p className="text-sm text-gray-500">{t('members.empty')}</p>}
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 bg-gray-100 rounded-2xl p-3">
              <div className="flex-1">
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-gray-600 flex flex-wrap gap-1 mt-1">
                  {m.instruments.map((i) => (<Badge key={i} variant="secondary" className="rounded-full">{instrumentLabel(i)}</Badge>))}
                </div>
                <div className="text-xs text-gray-500 mt-1 flex gap-2 items-center">
                  <Badge variant="outline" className="rounded-full">{availabilityLabel(m.availability)}</Badge>
                  <span>{t('members.target')}: {m.targetCount}</span>
                  <span>{t('members.assigned')}: {mAssigned(m)}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setConfirmRemove(m)}><Trash2 className="w-4 h-4"/></Button>
              <Button variant="secondary" size="icon" onClick={() => openEdit(m)}><Edit2 className="w-4 h-4"/></Button>
            </div>
          ))}
        </div>

        <Modal open={!!editing} onOpenChange={(o)=>!o && setEditing(null)} title="Edit band member">
          {editing && (
            <div className="space-y-3">
              <Input placeholder="Name" value={eName} onChange={(e) => setEName(e.target.value)} />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600">{t('members.instruments')}</label>
                <div className="flex flex-wrap gap-2">
                  {INSTRUMENTS.map((inst) => {
                    const active = eInstruments.split(',').map((x)=>x.trim()).filter(Boolean).some((x)=> x.toLowerCase() === inst.toLowerCase())
                    return (
                      <button key={inst} type="button" className={`rounded-full border px-3 py-1 text-sm ${active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-900 hover:bg-gray-50'}`} onClick={() => setEInstruments((prev) => {
                        const arr = prev.split(',').map((x)=>x.trim()).filter(Boolean)
                        const set = new Set(arr.map((x)=> instrumentLabelForKey(x)))
                        if (Array.from(set).some((x)=> x.toLowerCase() === inst.toLowerCase())) {
                          return Array.from(set).filter((x)=> x.toLowerCase() !== inst.toLowerCase()).join(', ')
                        } else {
                          return Array.from(new Set([...set, instrumentLabelForKey(inst)])).join(', ')
                        }
                      })}>{instrumentLabel(inst)}</button>
                    )
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600">{t('members.availability')}</label>
                <Select value={eAvailability} onValueChange={(v: string) => setEAvailability(v as Availability)} valueLabel={availabilityLabel(eAvailability)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select availability" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">{t('availability.both')}</SelectItem>
                    <SelectItem value="weekdays">{t('availability.weekdays')}</SelectItem>
                    <SelectItem value="weekends">{t('availability.weekends')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600">{t('members.target')}</label>
                <Input type="number" min={0} placeholder="e.g. 2" value={eTarget} onChange={(e) => setETarget(parseInt(e.target.value || '0', 10))} />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={eCanSingAndPlay} onChange={(e) => setECanSingAndPlay(e.target.checked)} />
                {t('members.allowSingPlay')}
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" onClick={() => setEditing(null)}>{t('actions.cancel')}</Button>
                <Button onClick={saveEdit}>{t('actions.save')}</Button>
              </div>
            </div>
          )}
        </Modal>
      </CardContent>
      <ConfirmDialog
        open={!!confirmRemove}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
        title={t('confirm.member.title')}
        description={confirmRemove ? (<span>{t('confirm.member.desc', { name: confirmRemove.name })}</span>) : undefined}
        confirmLabel={t('actions.delete')}
        confirmVariant="destructive"
        onConfirm={() => {
          if (confirmRemove) {
            onRemove(confirmRemove.id)
            setConfirmRemove(null)
          }
        }}
      />
    </Card>
  )
}


