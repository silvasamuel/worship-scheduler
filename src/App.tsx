import React from 'react'
import { Sparkles, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MembersPanel from '@/components/MembersPanel'
import SchedulesPanel from '@/components/SchedulesPanel'
import { useSchedulerState } from '@/state/useSchedulerState'
import { isWeekend } from '@/lib/date'
import { norm } from '@/lib/instruments'
import { AssignmentSlot, Member, Schedule } from '@/types'
import { I18nProvider, useI18n } from '@/lib/i18n'

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
    autoFill,
    mAssigned,
    importData,
    resetAll,
  } = useSchedulerState()
  const { t, lang, setLang, locale } = useI18n()

  function eligibleForSlot(schedule: Schedule, slot: AssignmentSlot): Member[] {
    const weekend = isWeekend(schedule.date)
    const taken = new Set(schedule.assignments.filter((a) => a.memberId).map((a) => a.memberId!))
    return members
      .filter((m) => m.instruments.map(norm).includes(norm(slot.instrument)))
      .filter((m) => (m.availability === 'both' ? true : m.availability === 'weekends' ? weekend : !weekend))
      .filter((m) => !taken.has(m.id))
      .sort((a, b) => (mAssigned(a) - mAssigned(b)) || a.name.localeCompare(b.name))
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
              <Download className="w-4 h-4" />{t('actions.export')}
            </Button>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(ev) => {
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
                <Upload className="w-4 h-4" />{t('actions.import')}
              </span>
            </label>
            <div className="flex items-center gap-2 ml-2">
              <label className="text-xs text-gray-600">{t('language.label')}</label>
              <select
                className="h-9 rounded-xl border border-gray-300 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                value={lang}
                onChange={(e) => setLang(e.target.value as any)}
              >
                <option value="en">{t('language.english')}</option>
                <option value="pt-BR">{t('language.portuguese')}</option>
              </select>
            </div>
            <Button variant="destructive" onClick={resetAll} className="gap-2">
              {t('actions.reset')}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 grid md:grid-cols-2 gap-6">
        <MembersPanel
          members={members}
          onAdd={addMember}
          onRemove={removeMember}
          onUpdate={updateMember}
          mAssigned={mAssigned}
        />
        <SchedulesPanel
          schedules={schedules}
          members={members}
          onAddSchedule={addSchedule}
          onRemoveSchedule={removeSchedule}
          onSetAssign={setAssignmentMember}
          autoFill={autoFill}
          eligibleForSlot={eligibleForSlot}
        />
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-10 text-xs text-gray-500">
        Built with 💜
      </footer>
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
