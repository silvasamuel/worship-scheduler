export type Availability = 'weekdays' | 'weekends' | 'both'

export interface Member {
  id: string
  name: string
  instruments: string[]
  availability: Availability
  targetCount: number
  assignedCount: number
  canSingAndPlay?: boolean
  /**
   * Optional Louveapp integration fields.
   * - louveUserId: Louve user _id
   * - louveFunctionsByInstrument: map of instrument (normalized label) -> Louve function _id
   */
  louveUserId?: string
  louveFunctionsByInstrument?: Record<string, string>
}

export interface AssignmentSlot {
  id: string
  instrument: string
  memberId?: string
}

export interface Schedule {
  id: string
  name: string
  date: string // ISO yyyy-mm-dd
  time: string // HH:mm (24h)
  requiredInstruments: string[]
  assignments: AssignmentSlot[]
  status: 'empty' | 'partial' | 'complete'
  issues: string[]
}
