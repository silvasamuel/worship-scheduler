import React, { useRef, useMemo, useState } from 'react'
import { Loader2, RefreshCcw } from 'lucide-react'
import { Schedule, Member } from '@/types'
import { norm } from '@/lib/instruments'
import { dayLabel } from '@/lib/date'
import { useI18n } from '@/lib/i18n'
import html2canvas from 'html2canvas'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { buildLouveSchedulePayload, createLouveSchedule, normalizeLouveBearerToken } from '@/lib/louve'
import { LOUVE_MINISTRY_ID } from '@/lib/louve-defaults'

type Props = {
  schedules: Schedule[]
  members: Member[]
}

const LOUVE_LOGIN_URL = 'https://app.louveapp.com.br/#/login'
const LOUVE_TOKEN_KEY = 'worship-scheduler.louve.bearer'
const LOUVE_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

type StoredToken = { token: string; exp: number }

type SyncResult = { scheduleId: string; name: string; variant: 'ok' | 'error' | 'info'; message?: string }

function sleep(ms: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, ms))
}

function readStoredToken(): StoredToken | null {
  try {
    const raw = window.localStorage.getItem(LOUVE_TOKEN_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const token = (parsed as Record<string, unknown>).token
    const exp = (parsed as Record<string, unknown>).exp
    if (typeof token !== 'string' || typeof exp !== 'number') return null
    if (exp <= Date.now()) return null
    return { token, exp }
  } catch {
    return null
  }
}

function writeStoredToken(token: string) {
  try {
    const payload: StoredToken = { token, exp: Date.now() + LOUVE_TOKEN_TTL_MS }
    window.localStorage.setItem(LOUVE_TOKEN_KEY, JSON.stringify(payload))
  } catch {
    // ignore
  }
}

function clearStoredToken() {
  try {
    window.localStorage.removeItem(LOUVE_TOKEN_KEY)
  } catch {
    // ignore
  }
}

export default function ReviewPanel({ schedules, members }: Props) {
  const reviewRef = useRef<HTMLDivElement>(null)
  const { t, locale, instrumentLabel } = useI18n()
  const [syncOpen, setSyncOpen] = useState(false)
  const [token, setToken] = useState('')
  const [rememberToken, setRememberToken] = useState(false)
  const [ministryId, setMinistryId] = useState(LOUVE_MINISTRY_ID)
  const [onlyComplete, setOnlyComplete] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [results, setResults] = useState<SyncResult[]>([])

  // Get all unique instruments from schedules, ordered: Vocalist, Backing, then rest
  const getAllInstruments = () => {
    const instrumentSet = new Set<string>()
    schedules.forEach(schedule => {
      schedule.assignments.forEach(assignment => {
        instrumentSet.add(assignment.instrument)
      })
    })

    const instruments = Array.from(instrumentSet)
    const vocalist = instruments.find(inst => norm(inst) === norm('Vocalista'))
    const backing = instruments.filter(inst => norm(inst) === norm('Backing'))
    const rest = instruments.filter(inst => norm(inst) !== norm('Vocalista') && norm(inst) !== norm('Backing'))

    const ordered: string[] = []
    if (vocalist) ordered.push(vocalist)
    ordered.push(...backing)
    ordered.push(...rest.sort((a, b) => instrumentLabel(a).localeCompare(instrumentLabel(b))))

    return ordered
  }

  const instruments = getAllInstruments()

  // Calculate member statistics
  const memberStats = useMemo(() => {
    const stats: Array<{ member: Member; count: number }> = []

    members.forEach(member => {
      // Count unique schedules where the member is assigned (regardless of number of roles)
      const assignedSchedules = new Set<string>()
      schedules.forEach(schedule => {
        const isAssigned = schedule.assignments.some(assignment => assignment.memberId === member.id)
        if (isAssigned) {
          assignedSchedules.add(schedule.id)
        }
      })
      stats.push({ member, count: assignedSchedules.size })
    })

    return stats.sort((a, b) => b.count - a.count)
  }, [members, schedules])

  const getMemberName = (memberId?: string) => {
    if (!memberId) return '—'
    return members.find(m => m.id === memberId)?.name || '—'
  }

  const getAssignmentsForInstrument = (schedule: Schedule, instrument: string) => {
    return schedule.assignments.filter(a => norm(a.instrument) === norm(instrument))
  }

  const exportAsImage = async () => {
    if (!reviewRef.current) return

    try {
      const canvas = await html2canvas(reviewRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      })

      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `worship-schedules-${new Date().toISOString().slice(0, 10)}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Error exporting image:', error)
      alert('Failed to export image. Please try again.')
    }
  }

  React.useEffect(() => {
    if (!syncOpen) return
    const stored = readStoredToken()
    if (stored?.token) {
      setToken(stored.token)
      setRememberToken(true)
    }
  }, [syncOpen])

  if (schedules.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        <p>{t('review.noSchedules')}</p>
      </div>
    )
  }

  const startSync = async () => {
    const bearer = normalizeLouveBearerToken(token)
    if (!bearer) {
      alert('Missing bearer token')
      return
    }
    if (rememberToken) writeStoredToken(bearer)
    const list = onlyComplete ? schedules.filter(s => s.status === 'complete') : schedules
    if (list.length === 0) {
      setResults([{ scheduleId: '__none__', name: t('review.sync.noSchedulesToSync'), variant: 'info' }])
      return
    }

    setSyncing(true)
    setResults([])
    try {
      for (let i = 0; i < list.length; i++) {
        const s = list[i]
        try {
          const payload = buildLouveSchedulePayload(s, members, { ministryId: ministryId.trim() })
          await createLouveSchedule(payload, bearer)
          setResults(prev => [...prev, { scheduleId: s.id, name: s.name, variant: 'ok' }])
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          setResults(prev => [...prev, { scheduleId: s.id, name: s.name, variant: 'error', message: msg }])
        }

        // Small human-like pacing between requests (avoid hammering the API)
        const isLast = i === list.length - 1
        if (!isLast) {
          const delayMs = 350 + Math.floor(Math.random() * 300) // 350-650ms
          await sleep(delayMs)
        }
      }
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="secondary" className="gap-2" onClick={() => setSyncOpen(true)} disabled={syncOpen || syncing}>
          <RefreshCcw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {t('review.sync')}
        </Button>
        <button
          onClick={exportAsImage}
          className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
        >
          {t('review.export')}
        </button>
      </div>

      <div
        ref={reviewRef}
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">{t('review.title')}</h2>

        <table className="w-full border-collapse" style={{ fontSize: '14px' }}>
          <thead>
            <tr className="border-b-2 border-gray-300 dark:border-gray-700">
              <th
                className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100"
                style={{ minWidth: '120px' }}
              >
                {t('review.date')}
              </th>
              {instruments.map(instrument => (
                <th
                  key={instrument}
                  className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100"
                  style={{ minWidth: '100px' }}
                >
                  {instrumentLabel(instrument)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule, idx) => (
              <tr
                key={schedule.id}
                className={`${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'} border-b border-gray-200 dark:border-gray-700`}
              >
                <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                  <div className="font-semibold">{schedule.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {dayLabel(schedule.date, locale)} • {schedule.time}
                  </div>
                </td>
                {instruments.map(instrument => {
                  const assignments = getAssignmentsForInstrument(schedule, instrument)
                  if (assignments.length === 0) {
                    return (
                      <td key={instrument} className="py-3 px-4 text-gray-500 dark:text-gray-400">
                        —
                      </td>
                    )
                  }
                  return (
                    <td key={instrument} className="py-3 px-4 text-gray-900 dark:text-gray-100">
                      {assignments.map((assignment, i) => (
                        <div key={assignment.id}>
                          {getMemberName(assignment.memberId)}
                          {i < assignments.length - 1 && ', '}
                        </div>
                      ))}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Statistics Section */}
        {memberStats.length > 0 && (
          <div className="mt-8 pt-6 border-t-2 border-gray-300 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">{t('statistics.title')}</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('statistics.description')}</div>

            <div className="space-y-3">
              {memberStats.map(stat => {
                const maxCount = memberStats.length > 0 ? Math.max(...memberStats.map(s => s.count), 1) : 1
                const barMaxWidth = 200
                const barHeight = 30
                const width = maxCount > 0 ? (stat.count / maxCount) * barMaxWidth : 0
                return (
                  <div key={stat.member.id} className="flex items-center gap-3">
                    <div
                      className="min-w-[140px] text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
                      title={stat.member.name}
                    >
                      {stat.member.name}
                    </div>
                    <div className="flex-1 relative">
                      <div className="flex items-center gap-2">
                        <div className="relative" style={{ width: barMaxWidth, height: barHeight }}>
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg h-full flex items-center justify-end pr-2 transition-all duration-300 shadow-sm"
                            style={{ width: `${width}px` }}
                          >
                            {stat.count > 0 && <span className="text-xs font-semibold text-white">{stat.count}</span>}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-right whitespace-nowrap">
                          {stat.count} {stat.count === 1 ? t('statistics.schedule') : t('statistics.schedules')}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={syncOpen}
        onOpenChange={o => {
          setSyncOpen(o)
          if (!o) {
            if (!rememberToken) setToken('')
            if (!rememberToken) clearStoredToken()
            setSyncing(false)
          }
        }}
        title={t('review.sync.title')}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-600 dark:text-gray-400">{t('review.sync.token')}</label>
            <Input
              value={token}
              onChange={e => setToken(e.target.value)}
              onBlur={() => {
                const normalized = normalizeLouveBearerToken(token)
                if (normalized && normalized !== token) setToken(normalized)
              }}
              placeholder="eyJhbGciOi..."
            />
            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between gap-2">
              <span>{t('review.sync.tokenHelp')}</span>
              <Button
                variant="secondary"
                className="h-7 px-2 text-xs"
                onClick={() => window.open(LOUVE_LOGIN_URL, '_blank', 'noopener,noreferrer')}
              >
                {t('review.sync.openLogin')}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-600 dark:text-gray-400">{t('review.sync.ministryId')}</label>
              <Input value={ministryId} onChange={e => setMinistryId(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-gray-700 dark:text-gray-300">{t('review.sync.rememberToken')}</div>
              <button
                type="button"
                role="switch"
                aria-checked={rememberToken}
                onClick={() => {
                  setRememberToken(prev => {
                    const next = !prev
                    if (!next) {
                      clearStoredToken()
                    } else {
                      const normalized = normalizeLouveBearerToken(token)
                      if (normalized) writeStoredToken(normalized)
                    }
                    return next
                  })
                }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${
                  rememberToken
                    ? 'bg-gray-900 border-gray-900 dark:bg-gray-100 dark:border-gray-100'
                    : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600/70'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full shadow-sm transition-transform ${
                    rememberToken ? 'bg-white dark:bg-gray-900' : 'bg-gray-900 dark:bg-white'
                  } ${rememberToken ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-gray-700 dark:text-gray-300">{t('review.sync.onlyComplete')}</div>
              <button
                type="button"
                role="switch"
                aria-checked={onlyComplete}
                onClick={() => setOnlyComplete(v => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${
                  onlyComplete
                    ? 'bg-gray-900 border-gray-900 dark:bg-gray-100 dark:border-gray-100'
                    : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600/70'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full shadow-sm transition-transform ${
                    onlyComplete ? 'bg-white dark:bg-gray-900' : 'bg-gray-900 dark:bg-white'
                  } ${onlyComplete ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setSyncOpen(false)} disabled={syncing}>
              {t('review.sync.close')}
            </Button>
            <Button onClick={startSync} disabled={syncing || !token.trim()} className="gap-2">
              {syncing && <Loader2 className="w-4 h-4 animate-spin" />}
              {syncing ? t('review.sync.running') : t('review.sync.start')}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Results</div>
              <div className="space-y-1">
                {results.map(r => (
                  <div key={r.scheduleId} className="text-xs">
                    <span
                      className={
                        r.variant === 'ok'
                          ? 'text-green-700 dark:text-green-400'
                          : r.variant === 'error'
                            ? 'text-red-700 dark:text-red-400'
                            : 'text-gray-700 dark:text-gray-300'
                      }
                    >
                      {r.variant === 'ok' ? 'OK' : r.variant === 'error' ? 'ERROR' : 'INFO'}
                    </span>{' '}
                    <span className="text-gray-800 dark:text-gray-200">{r.name}</span>
                    {r.variant === 'error' && r.message && (
                      <div className="text-red-700 dark:text-red-400 mt-0.5">{r.message}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
