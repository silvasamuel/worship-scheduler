import { useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { AssignmentSlot, Member, Schedule } from '@/types'
import { dayLabel, isWeekend, isoWeekKey } from '@/lib/date'
import { isVocalInstrument, norm, normalizeInstrumentKey } from '@/lib/instruments'
import { DEFAULT_MEMBERS } from '@/lib/louve-defaults'

export function useSchedulerState() {
  const [members, setMembers] = useState<Member[]>(DEFAULT_MEMBERS)
  const [schedules, setSchedules] = useState<Schedule[]>([])

  // Derived
  const allInstruments = useMemo(() => {
    const set = new Set<string>()
    members.forEach(m => m.instruments.forEach(i => set.add(i)))
    schedules.forEach(s => s.requiredInstruments.forEach(i => set.add(i)))
    return Array.from(set).sort()
  }, [members, schedules])

  function mAssigned(m: Member): number {
    return schedules.reduce((acc, s) => acc + s.assignments.filter(a => a.memberId === m.id).length, 0)
  }

  function computeStatus(
    assignments: AssignmentSlot[],
    t?: (key: string, params?: Record<string, string | number>) => string
  ): { status: Schedule['status']; issues: string[] } {
    const unfilled = assignments.filter(a => !a.memberId).length
    const issues =
      unfilled === 0
        ? []
        : t
          ? [t('autofill.positionsUnfilled', { count: unfilled })]
          : [`${unfilled} position(s) unfilled.`]
    return {
      status: assignments.length === 0 ? 'empty' : unfilled === 0 ? 'complete' : 'partial',
      issues,
    }
  }

  function addMember(newMember: Omit<Member, 'id' | 'assignedCount'>) {
    const m: Member = { ...newMember, id: uuidv4(), assignedCount: 0 }
    setMembers(prev => [...prev, m])
  }

  function removeMember(id: string) {
    setMembers(prev => prev.filter(m => m.id !== id))
    setSchedules(prev =>
      prev.map(s => ({
        ...s,
        assignments: s.assignments.map(a => (a.memberId === id ? { ...a, memberId: undefined } : a)),
      }))
    )
  }

  function updateMember(updated: Member) {
    setMembers(prev => prev.map(m => (m.id === updated.id ? updated : m)))
  }

  function addSchedule(dateISO: string, time: string, name: string, req: string[]) {
    const requiredInstruments = Array.from(new Set(req.map(x => normalizeInstrumentKey(x)).filter(x => x.length > 0)))
    const assignments: AssignmentSlot[] = requiredInstruments.map(inst => ({ id: uuidv4(), instrument: inst }))
    const newSchedule: Schedule = {
      id: uuidv4(),
      name: name.trim(),
      date: dateISO,
      time: time.trim(),
      requiredInstruments,
      assignments,
      status: assignments.length ? 'partial' : 'empty',
      issues: [],
    }
    setSchedules(prev =>
      [...prev, newSchedule].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    )
  }

  function removeSchedule(id: string) {
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  function updateScheduleMeta(scheduleId: string, patch: { name?: string; date?: string; time?: string }) {
    setSchedules(prev => {
      const updated = prev.map(s => {
        if (s.id !== scheduleId) return s
        const nextName = typeof patch.name === 'string' ? patch.name.trim() : s.name
        const nextDate = typeof patch.date === 'string' ? patch.date : s.date
        const nextTime = typeof patch.time === 'string' ? patch.time.trim() : s.time
        return { ...s, name: nextName, date: nextDate, time: nextTime }
      })
      return updated.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    })
  }

  function setAssignmentMember(scheduleId: string, slotId: string, memberId?: string) {
    setSchedules(prev =>
      prev.map(s => {
        if (s.id !== scheduleId) return s
        const assignments = s.assignments.map(a => (a.id === slotId ? { ...a, memberId } : a))
        const { status, issues } = computeStatus(assignments)
        return { ...s, assignments, status, issues }
      })
    )
  }

  function addSlotToSchedule(scheduleId: string, instrument: string) {
    setSchedules(prev =>
      prev.map(s => {
        if (s.id !== scheduleId) return s
        const newSlot: AssignmentSlot = { id: uuidv4(), instrument: normalizeInstrumentKey(instrument) }
        const assignments = [...s.assignments, newSlot]
        const { status, issues } = computeStatus(assignments)
        return { ...s, assignments, status, issues }
      })
    )
  }

  function removeSlotFromSchedule(scheduleId: string, slotId: string) {
    setSchedules(prev =>
      prev.map(s => {
        if (s.id !== scheduleId) return s
        const assignments = s.assignments.filter(a => a.id !== slotId)
        const { status, issues } = computeStatus(assignments)
        return { ...s, assignments, status, issues }
      })
    )
  }

  // Autofill respecting canSingAndPlay between vocal and instrument
  function autoFill(
    t?: (key: string, params?: Record<string, string | number>) => string,
    instrumentLabel?: (key: string) => string
  ) {
    const counts: Record<string, number> = {}
    members.forEach(m => (counts[m.id] = 0))
    schedules.forEach(s =>
      s.assignments.forEach(a => a.memberId && (counts[a.memberId] = (counts[a.memberId] || 0) + 1))
    )

    const VOCALISTA = norm('Vocalista')
    const ACOUSTIC_GUITAR = norm('Violão')

    // Constraint: avoid same Vocalista twice in the same ISO week
    const vocalistByWeek = new Map<string, Set<string>>() // weekKey -> memberIds
    schedules.forEach(s => {
      const wk = isoWeekKey(s.date)
      s.assignments.forEach(a => {
        if (!a.memberId) return
        if (norm(a.instrument) !== VOCALISTA) return
        const set = vocalistByWeek.get(wk) || new Set<string>()
        set.add(a.memberId)
        vocalistByWeek.set(wk, set)
      })
    })

    const canServeDate = (m: Member, dateISO: string) => {
      const weekend = isWeekend(dateISO)
      if (m.availability === 'both') return true
      if (m.availability === 'weekends') return weekend
      if (m.availability === 'weekdays') return !weekend
      return true
    }

    const canAssignInSchedule = (scheduleAssignments: AssignmentSlot[], m: Member, instrument: string): boolean => {
      const inst = norm(instrument)
      const assigned = scheduleAssignments.filter(a => a.memberId === m.id).map(a => norm(a.instrument))
      if (assigned.length === 0) return true

      // Special rule: if the member is the Vocalista and can play acoustic guitar, allow Vocalista+Acoustic Guitar even if canSingAndPlay=false
      const hasAcousticGuitarSkill = m.instruments.map(norm).includes(ACOUSTIC_GUITAR)
      const isVocalistaPair =
        hasAcousticGuitarSkill &&
        ((inst === VOCALISTA && assigned.includes(ACOUSTIC_GUITAR)) ||
          (inst === ACOUSTIC_GUITAR && assigned.includes(VOCALISTA)))
      if (isVocalistaPair) return true

      // Otherwise, only allow 2 roles if canSingAndPlay and roles are different (vocal vs instrument)
      if (!m.canSingAndPlay) return false
      const alreadyHasVocal = assigned.some(a => isVocalInstrument(a))
      const alreadyHasInstrument = assigned.some(a => !isVocalInstrument(a))
      const wantsVocal = isVocalInstrument(inst)
      const wantsInstrument = !wantsVocal
      if ((alreadyHasVocal && wantsVocal) || (alreadyHasInstrument && wantsInstrument)) return false
      // Prevent stacking beyond one vocal + one instrument
      if (alreadyHasVocal && alreadyHasInstrument) return false
      return true
    }

    const eligibleFor = (scheduleAssignments: AssignmentSlot[], instrument: string, dateISO: string): Member[] => {
      const inst = norm(instrument)
      const wk = isoWeekKey(dateISO)
      const takenVocalists = vocalistByWeek.get(wk) || new Set<string>()

      return members
        .filter(m => m.instruments.map(norm).includes(norm(instrument)))
        .filter(m => canServeDate(m, dateISO))
        .filter(m => counts[m.id] < m.targetCount)
        .filter(m => canAssignInSchedule(scheduleAssignments, m, inst))
        .filter(m => (inst === VOCALISTA ? !takenVocalists.has(m.id) : true))
        .sort((a, b) => counts[a.id] - counts[b.id] || a.name.localeCompare(b.name))
    }

    const enforceVocalistOnAcousticGuitar = (scheduleAssignments: AssignmentSlot[]) => {
      const vocalistSlot = scheduleAssignments.find(a => norm(a.instrument) === VOCALISTA && a.memberId)
      if (!vocalistSlot?.memberId) return
      const m = members.find(mm => mm.id === vocalistSlot.memberId)
      if (!m) return
      const playsAcousticGuitar = m.instruments.map(norm).includes(ACOUSTIC_GUITAR)
      if (!playsAcousticGuitar) return

      const acousticGuitarSlot = scheduleAssignments.find(a => norm(a.instrument) === ACOUSTIC_GUITAR)
      if (!acousticGuitarSlot) return
      if (acousticGuitarSlot.memberId === m.id) return

      if (acousticGuitarSlot.memberId) {
        counts[acousticGuitarSlot.memberId] = Math.max(0, (counts[acousticGuitarSlot.memberId] || 0) - 1)
      }
      acousticGuitarSlot.memberId = m.id
      counts[m.id] = (counts[m.id] || 0) + 1
    }

    const updated: Schedule[] = schedules.map(s => {
      const wk = isoWeekKey(s.date)
      const newAssignments: AssignmentSlot[] = s.assignments.map(a => ({ ...a }))

      const fillUnassigned = () => {
        for (let i = 0; i < newAssignments.length; i++) {
          const slot = newAssignments[i]
          if (slot.memberId) continue
          const candidates = eligibleFor(newAssignments, slot.instrument, s.date)
          if (candidates.length === 0) continue
          const chosen = candidates[0]
          slot.memberId = chosen.id
          counts[chosen.id] = (counts[chosen.id] || 0) + 1
          if (norm(slot.instrument) === VOCALISTA) {
            const set = vocalistByWeek.get(wk) || new Set<string>()
            set.add(chosen.id)
            vocalistByWeek.set(wk, set)
          }
        }
      }

      // First pass: fill normally
      fillUnassigned()
      // Enforce: if Vocalista can play acoustic guitar, assign them to acoustic guitar too (may unassign someone else)
      enforceVocalistOnAcousticGuitar(newAssignments)
      // Second pass: fill any now-empty slots after enforcement
      fillUnassigned()

      const missing = newAssignments.filter(a => !a.memberId)
      const issues: string[] = []
      missing.forEach(m => {
        const instLabel = instrumentLabel ? instrumentLabel(m.instrument) : m.instrument
        const noInstrument = members.filter(mem => mem.instruments.map(norm).includes(norm(m.instrument))).length === 0
        if (noInstrument) {
          issues.push(t ? t('autofill.noMemberPlays', { instrument: instLabel }) : `No member plays "${instLabel}".`)
          return
        }
        const availMatch =
          members.filter(mem => mem.instruments.map(norm).includes(norm(m.instrument)) && canServeDate(mem, s.date))
            .length > 0
        if (!availMatch) {
          issues.push(
            t
              ? t('autofill.noEligibleMember', { instrument: instLabel, date: dayLabel(s.date) })
              : `No eligible member for "${instLabel}" is available on ${dayLabel(s.date)}.`
          )
          return
        }
        const remainingCap =
          members.filter(
            mem =>
              mem.instruments.map(norm).includes(norm(m.instrument)) &&
              canServeDate(mem, s.date) &&
              counts[mem.id] < mem.targetCount
          ).length > 0
        if (!remainingCap) {
          issues.push(
            t
              ? t('autofill.allReachedTarget', { instrument: instLabel })
              : `All eligible members for "${instLabel}" reached their target count.`
          )
          return
        }
        issues.push(
          t
            ? t('autofill.conflictPrevented', { instrument: instLabel })
            : `Conflict prevented assignment for "${instLabel}".`
        )
      })

      const { status } = computeStatus(newAssignments, t)
      return { ...s, assignments: newAssignments, status, issues }
    })

    const newCounts: Record<string, number> = {}
    members.forEach(m => (newCounts[m.id] = 0))
    updated.forEach(s =>
      s.assignments.forEach(a => a.memberId && (newCounts[a.memberId] = (newCounts[a.memberId] || 0) + 1))
    )
    setMembers(prev => prev.map(m => ({ ...m, assignedCount: newCounts[m.id] || 0 })))
    setSchedules(updated)
  }

  function importData(payload: { members: Member[]; schedules: Schedule[] }) {
    // Migration: older exports may have different instrument keys (e.g. "mesa")
    setMembers(
      (payload.members || []).map(m => ({
        ...m,
        instruments: (m.instruments || []).map(normalizeInstrumentKey),
      }))
    )
    // Migration: older exports may not include schedule.name
    setSchedules(
      (payload.schedules || [])
        .map(s => ({
          ...s,
          requiredInstruments: (s.requiredInstruments || []).map(normalizeInstrumentKey),
          assignments: (s.assignments || []).map(a => ({ ...a, instrument: normalizeInstrumentKey(a.instrument) })),
          time:
            typeof (s as Schedule).time === 'string' && (s as Schedule).time.trim().length > 0
              ? (s as Schedule).time
              : (() => {
                  const d = new Date(`${s.date}T00:00:00`)
                  const dow = d.getDay()
                  if (dow === 0) return '09:00' // Sunday
                  if (dow === 4) return '19:30' // Thursday
                  return '19:30'
                })(),
          name:
            typeof (s as Schedule).name === 'string' && (s as Schedule).name.trim().length > 0
              ? (s as Schedule).name
              : dayLabel(s.date),
        }))
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    )
  }

  function resetAll() {
    setMembers(DEFAULT_MEMBERS)
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
    updateScheduleMeta,
    setAssignmentMember,
    addSlotToSchedule,
    removeSlotFromSchedule,
    autoFill,
    mAssigned,
    importData,
    resetAll,
  }
}
