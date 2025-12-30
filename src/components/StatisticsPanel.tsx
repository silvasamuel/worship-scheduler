import React, { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Member, Schedule } from '@/types'
import { useI18n } from '@/lib/i18n'

type Props = {
  members: Member[]
  schedules: Schedule[]
}

export default function StatisticsPanel({ members, schedules }: Props) {
  const { t } = useI18n()

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

  const maxCount = memberStats.length > 0 ? Math.max(...memberStats.map(s => s.count), 1) : 1
  const barMaxWidth = 200
  const barHeight = 30

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5" />
          <h2 className="font-semibold">{t('statistics.title')}</h2>
        </div>

        {memberStats.length === 0 ? (
          <p className="text-sm text-gray-500">{t('statistics.empty')}</p>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">{t('statistics.description')}</div>

            <div className="space-y-3">
              {memberStats.map(stat => {
                const width = maxCount > 0 ? (stat.count / maxCount) * barMaxWidth : 0
                return (
                  <div key={stat.member.id} className="flex items-center gap-3">
                    <div className="w-32 text-sm font-medium text-gray-700 truncate" title={stat.member.name}>
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
                        <div className="text-sm text-gray-600 min-w-[3rem] text-right">
                          {stat.count} {stat.count === 1 ? t('statistics.schedule') : t('statistics.schedules')}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {memberStats.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">{t('statistics.totalMembers')}:</span>
                    <span className="ml-2 font-semibold">{members.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('statistics.totalSchedules')}:</span>
                    <span className="ml-2 font-semibold">{schedules.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('statistics.totalAssignments')}:</span>
                    <span className="ml-2 font-semibold">
                      {schedules.reduce((sum, s) => sum + s.assignments.filter(a => a.memberId).length, 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('statistics.averagePerMember')}:</span>
                    <span className="ml-2 font-semibold">
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
