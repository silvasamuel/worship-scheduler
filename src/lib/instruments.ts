export const INSTRUMENTS = [
  'Vocalista',
  'Violão',
  'Backing',
  'Guitarra',
  'Baixo',
  'Teclado',
  'Bateria',
  'Mídia',
  'Mesa',
] as const

export function norm(str: string): string {
  return str.trim().toLowerCase()
}

export function instrumentLabelForKey(key: string): string {
  const match = INSTRUMENTS.find(label => norm(label) === norm(key))
  return match || key
}

export function isVocalInstrument(label: string): boolean {
  return ['vocalista', 'backing'].includes(norm(label))
}
