export const INSTRUMENTS = [
  'Vocalista',
  'Violão',
  'Backing',
  'Guitarra',
  'Baixo',
  'Teclado',
  'Bateria',
  'Mídia',
  'Mesa de Som',
] as const

export function norm(str: string): string {
  return str.trim().toLowerCase()
}

/**
 * Canonicalizes instrument keys stored in state (lowercase).
 * This keeps backwards compatibility with older exports like "mesa".
 */
export function normalizeInstrumentKey(input: string): string {
  const k = norm(input)
  if (k === norm('mesa')) return norm('Mesa de Som')
  if (k === norm('mesa de som')) return norm('Mesa de Som')
  if (k === norm('midia')) return norm('Mídia')
  if (k === norm('mídia')) return norm('Mídia')
  if (k === norm('mídia ')) return norm('Mídia')
  return k
}

export function instrumentLabelForKey(key: string): string {
  const match = INSTRUMENTS.find(label => norm(label) === normalizeInstrumentKey(key))
  return match || key
}

export function isVocalInstrument(label: string): boolean {
  return ['vocalista', 'backing'].includes(norm(label))
}
