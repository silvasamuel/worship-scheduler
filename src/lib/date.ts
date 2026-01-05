export function isWeekend(dateISO: string): boolean {
  const d = new Date(dateISO + 'T00:00:00')
  const day = d.getDay()
  return day === 0 || day === 6
}

export function dayLabel(dateISO: string, locale?: string): string {
  const d = new Date(dateISO + 'T00:00:00')
  return d.toLocaleDateString(locale || undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/**
 * ISO week key (e.g. "2026-W02") to group dates by week.
 * Uses UTC to avoid timezone edge cases.
 */
export function isoWeekKey(dateISO: string): string {
  const d = new Date(dateISO + 'T00:00:00.000Z')
  // ISO: Monday=1..Sunday=7
  const day = d.getUTCDay() || 7
  // Move to Thursday of the same week
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const year = d.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${year}-W${String(weekNo).padStart(2, '0')}`
}
