import React, { useMemo, useState } from 'react'
import { BarChart3, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Member, Schedule } from '@/types'
import { useI18n } from '@/lib/i18n'

type Props = {
  members: Member[]
  schedules: Schedule[]
}

export default function StatisticsPanel({ members, schedules }: Props) {
  const { t, instrumentLabel } = useI18n()
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set())

  const toggleMember = (memberId: string) => {
    setExpandedMembers(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  const memberStats = useMemo(() => {
    const stats: Array<{ member: Member; count: number; instrumentCounts: Record<string, number> }> = []

    members.forEach(member => {
      // Count unique schedules where the member is assigned (regardless of number of roles)
      const assignedSchedules = new Set<string>()
      const instrumentCounts: Record<string, number> = {}

      schedules.forEach(schedule => {
        const memberAssignments = schedule.assignments.filter(assignment => assignment.memberId === member.id)
        if (memberAssignments.length > 0) {
          assignedSchedules.add(schedule.id)
          // Count assignments per instrument
          memberAssignments.forEach(assignment => {
            const inst = assignment.instrument
            instrumentCounts[inst] = (instrumentCounts[inst] || 0) + 1
          })
        }
      })
      stats.push({ member, count: assignedSchedules.size, instrumentCounts })
    })

    return stats.sort((a, b) => b.count - a.count)
  }, [members, schedules])

  const maxCount = memberStats.length > 0 ? Math.max(...memberStats.map(s => s.count), 1) : 1
  const barMaxWidth = 200
  const barHeight = 30

  return (
    <Card className="shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('statistics.title')}</h2>
        </div>

        {memberStats.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('statistics.empty')}</p>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('statistics.description')}</div>

            <div className="space-y-3">
              {memberStats.map(stat => {
                const width = maxCount > 0 ? (stat.count / maxCount) * barMaxWidth : 0
                const isExpanded = expandedMembers.has(stat.member.id)
                const instrumentEntries = Object.entries(stat.instrumentCounts).sort((a, b) => b[1] - a[1])

                return (
                  <div key={stat.member.id} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleMember(stat.member.id)}
                        className="flex items-center justify-center w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        aria-label={isExpanded ? t('statistics.collapse') : t('statistics.expand')}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div
                        className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300 truncate"
                        title={stat.member.name}
                      >
                        {stat.member.name}
                      </div>
                      <div className="flex-1 relative">
                        <div className="flex items-center gap-2">
                          <div className="relative" style={{ width: barMaxWidth, height: barHeight }}>
                            <div
                              className="bg-blue-500 dark:bg-blue-600 rounded-lg h-full flex items-center justify-end pr-2 transition-all duration-300 shadow-sm"
                              style={{ width: `${width}px` }}
                            >
                              {stat.count > 0 && <span className="text-xs font-semibold text-white">{stat.count}</span>}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
                            {stat.count} {stat.count === 1 ? t('statistics.schedule') : t('statistics.schedules')}
                          </div>
                        </div>
                      </div>
                    </div>
                    {isExpanded && instrumentEntries.length > 0 && (
                      <div className="ml-7 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
                        {instrumentEntries.map(([instrument, count]) => (
                          <div
                            key={instrument}
                            className="flex items-center justify-between text-sm py-1 px-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                          >
                            <span className="text-gray-700 dark:text-gray-300">{instrumentLabel(instrument)}</span>
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                              {count} {count === 1 ? t('statistics.schedule') : t('statistics.schedules')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {memberStats.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t('statistics.totalMembers')}:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">{members.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t('statistics.totalSchedules')}:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">{schedules.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t('statistics.totalAssignments')}:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
                      {schedules.reduce((sum, s) => sum + s.assignments.filter(a => a.memberId).length, 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">{t('statistics.averagePerMember')}:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">
                      {members.length > 0
                        ? (memberStats.reduce((sum, s) => sum + s.count, 0) / members.length).toFixed(1)
                        : '0'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
