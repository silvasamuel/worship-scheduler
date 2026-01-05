import type { Member } from '@/types'
import { norm } from '@/lib/instruments'

export const LOUVE_MINISTRY_ID = '64dc22dd83ab820008d35f04'

/**
 * Louve "funções" (role/instrument IDs) for this ministry.
 * Keys are normalized instrument labels used in this app.
 */
export const LOUVE_FUNCTIONS_BY_INSTRUMENT: Record<string, string> = {
  [norm('Vocalista')]: '5f31e1d17803d600172af717',
  [norm('Backing')]: '64eeab19479eee0008490f98',
  [norm('Violão')]: '5f31e5d27803d600172af724',
  [norm('Guitarra')]: '5f31e5db7803d600172af725',
  [norm('Baixo')]: '5f31e5e47803d600172af726',
  [norm('Bateria')]: '5f31e5ed7803d600172af727',
  [norm('Teclado')]: '5f31e5fd7803d600172af728',
  [norm('Mesa de Som')]: '5f31e6377803d600172af72f',
  [norm('Mídia')]: '64ed5ae519c9940008c3159a',
}

function louveMember(
  louveUserId: string,
  name: string,
  functions: Array<{ id: string; nome: string }>,
  availability: Member['availability'] = 'both',
  canSingAndPlay: boolean = false
): Member {
  const instruments = functions.map(f => {
    const n = f.nome.trim()
    // Normalize Louve naming quirks
    if (norm(n) === norm('mesa de som')) return norm('Mesa de Som')
    if (norm(n) === norm('mídia')) return norm('Mídia')
    if (norm(n) === norm('mídia ')) return norm('Mídia')
    return norm(n)
  })

  const louveFunctionsByInstrument: Record<string, string> = {}
  functions.forEach(f => {
    const key = (() => {
      const n = f.nome.trim()
      if (norm(n) === norm('mesa de som')) return norm('Mesa de Som')
      if (norm(n) === norm('mídia')) return norm('Mídia')
      if (norm(n) === norm('mídia ')) return norm('Mídia')
      return norm(n)
    })()
    louveFunctionsByInstrument[key] = f.id
  })

  return {
    id: louveUserId,
    louveUserId,
    name,
    instruments,
    availability,
    targetCount: 6,
    assignedCount: 0,
    canSingAndPlay,
    louveFunctionsByInstrument,
  }
}

/**
 * Default members are seeded from Louve users list provided by the team.
 * IDs are stable (the Louve user _id), so schedule assignments can map directly.
 */
export const DEFAULT_MEMBERS: Member[] = [
  louveMember('64de3d725d75c70008f08675', 'Ana Clara', [
    { id: '5f31e1d17803d600172af717', nome: 'Vocalista' },
    { id: '5f31e5ca7803d600172af723', nome: 'Ministro' },
    { id: '5f31e6377803d600172af72f', nome: 'Mesa de Som' },
    { id: '64ed5ae519c9940008c3159a', nome: 'Mídia' },
    { id: '64eeab19479eee0008490f98', nome: 'Backing' },
  ]),
  louveMember('6928f8576c8fbbba8b6f6a9a', 'André Bornhausen', [{ id: '64eeab19479eee0008490f98', nome: 'Backing' }]),
  louveMember('64ee0c008e9ef80008e7852e', 'Davi Gonçalves', [
    { id: '5f31e5ed7803d600172af727', nome: 'Bateria' },
    { id: '5f31e6377803d600172af72f', nome: 'Mesa de Som' },
  ]),
  louveMember(
    '67507447a6d3a10008392b1b',
    'Emanuely Victoria',
    [
      { id: '5f31e1d17803d600172af717', nome: 'Vocalista' },
      { id: '5f31e6377803d600172af72f', nome: 'Mesa de Som' },
      { id: '64ed5ae519c9940008c3159a', nome: 'Mídia' },
      { id: '64eeab19479eee0008490f98', nome: 'Backing' },
    ],
    'weekends'
  ),
  louveMember(
    '653d91a5d75c600008f09469',
    'Gabriel Henrique',
    [
      { id: '5f31e5db7803d600172af725', nome: 'Guitarra' },
      { id: '5f31e6377803d600172af72f', nome: 'Mesa de Som' },
      { id: '64ed5ae519c9940008c3159a', nome: 'Mídia' },
    ],
    'weekends'
  ),
  louveMember('686c1f125dda6a376f8ca2c8', 'Gil Perroud', [
    { id: '5f31e5e47803d600172af726', nome: 'Baixo' },
    { id: '5f31e6377803d600172af72f', nome: 'Mesa de Som' },
  ]),
  louveMember('654480bcf93170000839495e', 'Gilmar Santos', [{ id: '5f31e5d27803d600172af724', nome: 'Violão' }]),
  louveMember('68e1bf5a445e5a84f3e3c333', 'Hillary Pimenta', [{ id: '64ed5ae519c9940008c3159a', nome: 'Mídia' }]),
  louveMember('686bf3d59e98c2e51b3bd959', 'Jackson Silva', [{ id: '5f31e6377803d600172af72f', nome: 'Mesa de Som' }]),
  louveMember(
    '6548ee310fea5f0008106925',
    'Johan',
    [
      { id: '5f31e1d17803d600172af717', nome: 'Vocalista' },
      { id: '5f31e5d27803d600172af724', nome: 'Violão' },
      { id: '5f31e5e47803d600172af726', nome: 'Baixo' },
    ],
    'weekends'
  ),
  louveMember(
    '64ee5d025c3a580008630586',
    'Juliano Henrique',
    [
      { id: '5f31e1d17803d600172af717', nome: 'Vocalista' },
      { id: '5f31e5ca7803d600172af723', nome: 'Ministro' },
      { id: '5f31e5d27803d600172af724', nome: 'Violão' },
      { id: '5f31e5e47803d600172af726', nome: 'Baixo' },
      { id: '64eeab19479eee0008490f98', nome: 'Backing' },
    ],
    'both',
    true
  ),
  louveMember(
    '64ee06f1c80a060008d79969',
    'Marcos Matheus',
    [
      { id: '5f31e1d17803d600172af717', nome: 'Vocalista' },
      { id: '5f31e5d27803d600172af724', nome: 'Violão' },
      { id: '5f31e5db7803d600172af725', nome: 'Guitarra' },
      { id: '5f31e5e47803d600172af726', nome: 'Baixo' },
      { id: '5f31e5ed7803d600172af727', nome: 'Bateria' },
      { id: '64eeab19479eee0008490f98', nome: 'Backing' },
    ],
    'both',
    true
  ),
  louveMember('6838e268acde4d79eabd6045', 'Nathaly Patricio', [{ id: '64eeab19479eee0008490f98', nome: 'Backing' }]),
  louveMember(
    '64dc22c1356d5800088328d9',
    'Samuel Silva',
    [
      { id: '5f31e1d17803d600172af717', nome: 'Vocalista' },
      { id: '5f31e5ca7803d600172af723', nome: 'Ministro' },
      { id: '5f31e5d27803d600172af724', nome: 'Violão' },
      { id: '5f31e5e47803d600172af726', nome: 'Baixo' },
      { id: '5f31e5fd7803d600172af728', nome: 'Teclado' },
      { id: '64eeab19479eee0008490f98', nome: 'Backing' },
    ],
    'both',
    true
  ),
  louveMember('6853536dc01c8104d4cfd8e1', 'Solange Patrício', [
    { id: '5f31e1d17803d600172af717', nome: 'Vocalista' },
    { id: '64eeab19479eee0008490f98', nome: 'Backing' },
  ]),
  louveMember(
    '660af79c2d05d1000775fc1e',
    'Tauyli Costa',
    [
      { id: '5f31e1d17803d600172af717', nome: 'Vocalista' },
      { id: '64eeab19479eee0008490f98', nome: 'Backing' },
    ],
    'weekends'
  ),
  louveMember('64ee59c765019c0008bec0d6', 'Wendel Guilherme', [
    { id: '5f31e5ed7803d600172af727', nome: 'Bateria' },
    { id: '5f31e6377803d600172af72f', nome: 'Mesa de Som' },
  ]),
]
