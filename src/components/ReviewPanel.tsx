import React, { useRef, useMemo } from 'react'
import { Schedule, Member } from '@/types'
import { norm } from '@/lib/instruments'
import { dayLabel } from '@/lib/date'
import { useI18n } from '@/lib/i18n'
import html2canvas from 'html2canvas'

type Props = {
  schedules: Schedule[]
  members: Member[]
}

export default function ReviewPanel({ schedules, members }: Props) {
  const reviewRef = useRef<HTMLDivElement>(null)
  const { t, locale, instrumentLabel } = useI18n()

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

  if (schedules.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>{t('review.noSchedules')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={exportAsImage}
          className="px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
        >
          {t('review.export')}
        </button>
      </div>

      <div
        ref={reviewRef}
        className="bg-white p-6 rounded-lg shadow-sm"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-900">{t('review.title')}</h2>

        <table className="w-full border-collapse" style={{ fontSize: '14px' }}>
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-3 px-4 font-semibold text-gray-900" style={{ minWidth: '120px' }}>
                {t('review.date')}
              </th>
              {instruments.map(instrument => (
                <th
                  key={instrument}
                  className="text-left py-3 px-4 font-semibold text-gray-900"
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
                className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                style={{ borderBottom: '1px solid #e5e7eb' }}
              >
                <td className="py-3 px-4 font-medium text-gray-900">{dayLabel(schedule.date, locale)}</td>
                {instruments.map(instrument => {
                  const assignments = getAssignmentsForInstrument(schedule, instrument)
                  if (assignments.length === 0) {
                    return (
                      <td key={instrument} className="py-3 px-4 text-gray-500">
                        —
                      </td>
                    )
                  }
                  return (
                    <td key={instrument} className="py-3 px-4 text-gray-900">
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
          <div className="mt-8 pt-6 border-t-2 border-gray-300">
            <h3 className="text-xl font-bold mb-4 text-gray-900">{t('statistics.title')}</h3>
            <div className="text-sm text-gray-600 mb-4">{t('statistics.description')}</div>

            <div className="space-y-3">
              {memberStats.map(stat => {
                const maxCount = memberStats.length > 0 ? Math.max(...memberStats.map(s => s.count), 1) : 1
                const barMaxWidth = 200
                const barHeight = 30
                const width = maxCount > 0 ? (stat.count / maxCount) * barMaxWidth : 0
                return (
                  <div key={stat.member.id} className="flex items-center gap-3">
                    <div
                      className="min-w-[140px] text-sm font-medium text-gray-700 whitespace-nowrap"
                      title={stat.member.name}
                    >
                      {stat.member.name}
                    </div>
                    <div className="flex-1 relative">
                      <div className="flex items-center gap-2">
                        <div className="relative" style={{ width: barMaxWidth, height: barHeight }}>
                          <div
                            className="bg-blue-500 rounded-lg h-full flex items-center justify-end pr-2 transition-all duration-300"
                            style={{ width: `${width}px` }}
                          >
                            {stat.count > 0 && <span className="text-xs font-semibold text-white">{stat.count}</span>}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 min-w-[3rem] text-right whitespace-nowrap">
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
    </div>
  )
}
