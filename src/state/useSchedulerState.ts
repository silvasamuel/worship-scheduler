import { useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Availability, AssignmentSlot, Member, Schedule } from '@/types'
import { dayLabel, isWeekend } from '@/lib/date'
import { INSTRUMENTS, instrumentLabelForKey, isVocalInstrument, norm } from '@/lib/instruments'

export function useSchedulerState() {
  const [members, setMembers] = useState<Member[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])

  // Derived
  const allInstruments = useMemo(() => {
    const set = new Set<string>()
    members.forEach((m) => m.instruments.forEach((i) => set.add(i)))
    schedules.forEach((s) => s.requiredInstruments.forEach((i) => set.add(i)))
    return Array.from(set).sort()
  }, [members, schedules])

  function mAssigned(m: Member): number {
    return schedules.reduce((acc, s) => acc + s.assignments.filter((a) => a.memberId === m.id).length, 0)
  }

  function computeStatus(assignments: AssignmentSlot[]): { status: Schedule['status']; issues: string[] } {
    const unfilled = assignments.filter((a) => !a.memberId).length
    return {
      status: assignments.length === 0 ? 'empty' : unfilled === 0 ? 'complete' : 'partial',
      issues: unfilled === 0 ? [] : [`${unfilled} position(s) unfilled.`],
    }
  }

  function addMember(newMember: Omit<Member, 'id' | 'assignedCount'>) {
    const m: Member = { ...newMember, id: uuidv4(), assignedCount: 0 }
    setMembers((prev) => [...prev, m])
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
    setSchedules((prev) =>
      prev.map((s) => ({
        ...s,
        assignments: s.assignments.map((a) => (a.memberId === id ? { ...a, memberId: undefined } : a)),
      })),
    )
  }

  function updateMember(updated: Member) {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }

  function addSchedule(dateISO: string, req: string[]) {
    const requiredInstruments = Array.from(new Set(req.map((x) => x.trim().toLowerCase()).filter((x) => x.length > 0)))
    const assignments: AssignmentSlot[] = requiredInstruments.map((inst) => ({ id: uuidv4(), instrument: inst }))
    const newSchedule: Schedule = {
      id: uuidv4(),
      date: dateISO,
      requiredInstruments,
      assignments,
      status: assignments.length ? 'partial' : 'empty',
      issues: [],
    }
    setSchedules((prev) => [...prev, newSchedule].sort((a, b) => a.date.localeCompare(b.date)))
  }

  function removeSchedule(id: string) {
    setSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  function setAssignmentMember(scheduleId: string, slotId: string, memberId?: string) {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== scheduleId) return s
        const assignments = s.assignments.map((a) => (a.id === slotId ? { ...a, memberId } : a))
        const { status, issues } = computeStatus(assignments)
        return { ...s, assignments, status, issues }
      }),
    )
  }

  // Autofill respecting canSingAndPlay between vocal and instrument
  function autoFill() {
    const counts: Record<string, number> = {}
    members.forEach((m) => (counts[m.id] = 0))
    schedules.forEach((s) => s.assignments.forEach((a) => a.memberId && (counts[a.memberId] = (counts[a.memberId] || 0) + 1)))

    const canServeDate = (m: Member, dateISO: string) => {
      const weekend = isWeekend(dateISO)
      if (m.availability === 'both') return true
      if (m.availability === 'weekends') return weekend
      if (m.availability === 'weekdays') return !weekend
      return true
    }

    const eligibleFor = (instrument: string, dateISO: string, takenIds: Set<string>): Member[] =>
      members
        .filter((m) => m.instruments.map(norm).includes(norm(instrument)))
        .filter((m) => canServeDate(m, dateISO))
        .filter((m) => counts[m.id] < m.targetCount)
        .filter((m) => !takenIds.has(m.id))
        .sort((a, b) => counts[a.id] - counts[b.id] || a.name.localeCompare(b.name))

    const updated: Schedule[] = schedules.map((s) => {
      const taken = new Set<string>()
      const perDateByRole: Record<string, { vocal: number; instrument: number }> = {}
      s.assignments.forEach((a) => {
        if (!a.memberId) return
        taken.add(a.memberId)
        const role = isVocalInstrument(a.instrument) ? 'vocal' : 'instrument'
        perDateByRole[a.memberId] = perDateByRole[a.memberId] || { vocal: 0, instrument: 0 }
        perDateByRole[a.memberId][role] += 1
      })

      const newAssignments = s.assignments.map((slot) => {
        if (slot.memberId) return slot
        const candidates = eligibleFor(slot.instrument, s.date, taken)
        if (candidates.length > 0) {
          const chosen = candidates[0]
          const role = isVocalInstrument(slot.instrument) ? 'vocal' : 'instrument'
          const countsByRole = perDateByRole[chosen.id] || { vocal: 0, instrument: 0 }
          if (countsByRole.vocal > 0 && countsByRole.instrument > 0) return slot
          const chosenMember = members.find((m) => m.id === chosen.id)
          if ((countsByRole.vocal > 0 || countsByRole.instrument > 0) && !chosenMember?.canSingAndPlay) return slot
          counts[chosen.id] = (counts[chosen.id] || 0) + 1
          perDateByRole[chosen.id] = countsByRole
          perDateByRole[chosen.id][role] += 1
          taken.add(chosen.id)
          return { ...slot, memberId: chosen.id }
        }
        return slot
      })

      const missing = newAssignments.filter((a) => !a.memberId)
      const issues: string[] = []
      missing.forEach((m) => {
        const noInstrument = members.filter((mem) => mem.instruments.map(norm).includes(norm(m.instrument))).length === 0
        if (noInstrument) {
          issues.push(`No member plays "${m.instrument}".`)
          return
        }
        const availMatch = members.filter((mem) => mem.instruments.map(norm).includes(norm(m.instrument)) && canServeDate(mem, s.date)).length > 0
        if (!availMatch) {
          issues.push(`No eligible member for "${m.instrument}" is available on ${dayLabel(s.date)}.`)
          return
        }
        const remainingCap = members.filter((mem) => mem.instruments.map(norm).includes(norm(m.instrument)) && canServeDate(mem, s.date) && counts[mem.id] < mem.targetCount).length > 0
        if (!remainingCap) {
          issues.push(`All eligible members for "${m.instrument}" reached their target count.`)
          return
        }
        issues.push(`Conflict prevented assignment for "${m.instrument}".`)
      })

      const { status } = computeStatus(newAssignments)
      return { ...s, assignments: newAssignments, status, issues }
    })

    const newCounts: Record<string, number> = {}
    members.forEach((m) => (newCounts[m.id] = 0))
    updated.forEach((s) => s.assignments.forEach((a) => a.memberId && (newCounts[a.memberId] = (newCounts[a.memberId] || 0) + 1)))
    setMembers((prev) => prev.map((m) => ({ ...m, assignedCount: newCounts[m.id] || 0 })))
    setSchedules(updated)
  }

  function importData(payload: { members: Member[]; schedules: Schedule[] }) {
    setMembers(payload.members || [])
    setSchedules((payload.schedules || []).sort((a, b) => a.date.localeCompare(b.date)))
  }

  function resetAll() {
    setMembers([])
    setSchedules([])
  }

  return {
    members,
    schedules,
    allInstruments,
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
  }
}


