import React, { useState } from 'react'
import { Sparkles, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import MembersPanel from '@/components/MembersPanel'
import SchedulesPanel from '@/components/SchedulesPanel'
import StatisticsPanel from '@/components/StatisticsPanel'
import ReviewPanel from '@/components/ReviewPanel'
import { useSchedulerState } from '@/state/useSchedulerState'
import { isWeekend } from '@/lib/date'
import { norm, isVocalInstrument } from '@/lib/instruments'
import { AssignmentSlot, Member, Schedule } from '@/types'
import { I18nProvider, useI18n, type Lang } from '@/lib/i18n'

function AppInner() {
  const {
    members,
    schedules,
    addMember,
    removeMember,
    updateMember,
    addSchedule,
    removeSchedule,
    setAssignmentMember,
    addSlotToSchedule,
    removeSlotFromSchedule,
    autoFill,
    mAssigned,
    importData,
    resetAll,
  } = useSchedulerState()
  const { t, lang, setLang } = useI18n()
  const [activeTab, setActiveTab] = useState<'members' | 'schedules' | 'statistics' | 'review'>('members')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  function eligibleForSlot(schedule: Schedule, slot: AssignmentSlot): Member[] {
    const weekend = isWeekend(schedule.date)
    const slotIsVocal = isVocalInstrument(slot.instrument)
    const slotIsInstrument = !slotIsVocal

    // Get members already assigned in this schedule
    const assignedInSchedule = schedule.assignments
      .filter(a => a.memberId)
      .map(a => ({
        memberId: a.memberId!,
        isVocal: isVocalInstrument(a.instrument),
        isInstrument: !isVocalInstrument(a.instrument),
      }))

    const taken = new Set(assignedInSchedule.map(a => a.memberId))

    return members
      .filter(m => m.instruments.map(norm).includes(norm(slot.instrument)))
      .filter(m => (m.availability === 'both' ? true : m.availability === 'weekends' ? weekend : !weekend))
      .filter(m => {
        // If member is not assigned in this schedule, they're eligible
        if (!taken.has(m.id)) return true

        // If member is already assigned, check if they can sing and play
        if (!m.canSingAndPlay) return false

        // Member can sing and play, so check if they're assigned to a different role
        const memberAssignment = assignedInSchedule.find(a => a.memberId === m.id)
        if (!memberAssignment) return true

        // If slot is vocal and member is assigned to instrument, allow
        if (slotIsVocal && memberAssignment.isInstrument) return true

        // If slot is instrument and member is assigned to vocal, allow
        if (slotIsInstrument && memberAssignment.isVocal) return true

        // Same role, not allowed
        return false
      })
      .sort((a, b) => mAssigned(a) - mAssigned(b) || a.name.localeCompare(b.name))
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Sparkles className="w-6 h-6" />
          <h1 className="text-xl font-semibold">{t('app.title')}</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                const blob = new Blob([JSON.stringify({ members, schedules }, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `worship-scheduler-${new Date().toISOString().slice(0, 10)}.json`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {t('actions.export')}
            </Button>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={ev => {
                  const file = ev.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    try {
                      const data = JSON.parse(String(reader.result))
                      if (Array.isArray(data.members) && Array.isArray(data.schedules)) {
                        importData(data)
                      } else {
                        alert('Invalid file format')
                      }
                    } catch (e) {
                      alert('Failed to parse JSON')
                    }
                  }
                  reader.readAsText(file)
                  ;(ev.currentTarget as HTMLInputElement).value = ''
                }}
              />
              <span className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {t('actions.import')}
              </span>
            </label>
            <div className="flex items-center gap-2 ml-2">
              <label className="text-xs text-gray-600">{t('language.label')}</label>
              <select
                className="h-9 rounded-xl border border-gray-300 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                value={lang}
                onChange={e => setLang(e.target.value as Lang)}
              >
                <option value="en">{t('language.english')}</option>
                <option value="pt-BR">{t('language.portuguese')}</option>
              </select>
            </div>
            <Button variant="destructive" onClick={() => setShowResetConfirm(true)} className="gap-2">
              {t('actions.reset')}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        <div className="mb-4 border-b border-gray-200">
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'members'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('tabs.members')}
            </button>
            <button
              onClick={() => setActiveTab('schedules')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'schedules'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('tabs.schedules')}
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'statistics'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('tabs.statistics')}
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'review'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('tabs.review')}
            </button>
          </nav>
        </div>

        {activeTab === 'members' && (
          <MembersPanel
            members={members}
            onAdd={addMember}
            onRemove={removeMember}
            onUpdate={updateMember}
            mAssigned={mAssigned}
          />
        )}
        {activeTab === 'schedules' && (
          <SchedulesPanel
            schedules={schedules}
            members={members}
            onAddSchedule={addSchedule}
            onRemoveSchedule={removeSchedule}
            onSetAssign={setAssignmentMember}
            onAddSlot={addSlotToSchedule}
            onRemoveSlot={removeSlotFromSchedule}
            autoFill={autoFill}
            eligibleForSlot={eligibleForSlot}
          />
        )}
        {activeTab === 'statistics' && <StatisticsPanel members={members} schedules={schedules} />}
        {activeTab === 'review' && <ReviewPanel members={members} schedules={schedules} />}
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-10 text-xs text-gray-500">Built with 💜</footer>

      <ConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title={t('confirm.reset.title')}
        description={t('confirm.reset.desc')}
        confirmLabel={t('actions.reset')}
        cancelLabel={t('actions.cancel')}
        confirmVariant="destructive"
        onConfirm={() => {
          resetAll()
          setShowResetConfirm(false)
        }}
      />
    </div>
  )
}

export default function WorshipSchedulerApp() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  )
}
