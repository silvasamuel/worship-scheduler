import type { Member, Schedule } from '@/types'
import { normalizeInstrumentKey, norm } from '@/lib/instruments'
import { LOUVE_FUNCTIONS_BY_INSTRUMENT, LOUVE_MINISTRY_ID } from '@/lib/louve-defaults'

export type LouveScheduleUserPayload = {
  usuario: string
  instrumentos: string[]
  confirmacao: null
  permissoes: { gerenciarMusicas: boolean }
  falta: null
}

export type LouveSchedulePayload = {
  _id: null
  descricao: string
  data: string
  usuarios: LouveScheduleUserPayload[]
  musicasEscala: unknown[]
  ministerio: string
  solicitarConfirmacao: boolean
  fechada: boolean
  observacoes: string
  equipesIds: string[]
  paletaDeCores: null
  roteiro: { _id: null; modeloRoteiroId: null; itens: unknown[] }
  __v: null
}

export type LouveSyncOptions = {
  ministryId?: string
  solicitarConfirmacao?: boolean
  observacoes?: string
}

function normalizeBearerToken(input: string): string {
  const raw = String(input || '').trim()
  // Accept: "<jwt>" or "bearer <jwt>" or "Bearer <jwt>" or "authorization: bearer <jwt>"
  const cleaned = raw.replace(/^authorization\s*:\s*/i, '').trim()
  return cleaned.replace(/^bearer\s+/i, '').trim()
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  try {
    return decodeURIComponent(
      atob(padded)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    )
  } catch {
    return atob(padded)
  }
}

function deviceHeaderFromJwt(token: string): string | undefined {
  const parts = token.split('.')
  if (parts.length < 2) return undefined
  try {
    const payload: unknown = JSON.parse(base64UrlDecode(parts[1]))
    if (!payload || typeof payload !== 'object') return undefined
    const device = (payload as Record<string, unknown>).device
    return typeof device === 'string' && device.trim().length > 0 ? device.trim() : undefined
  } catch {
    return undefined
  }
}

function defaultTimeForDate(dateISO: string): string {
  const d = new Date(dateISO + 'T00:00:00')
  const dow = d.getDay()
  if (dow === 0) return '09:00' // Sunday
  if (dow === 4) return '19:30' // Thursday
  return '19:30'
}

function buildDateTime(date: string, time: string): string {
  const t = time.trim()
  // Louve example uses: "2026-01-08T19:30:00.000" (no timezone suffix)
  return `${date}T${t}:00.000`
}

export function buildLouveSchedulePayload(
  schedule: Schedule,
  members: Member[],
  opts: LouveSyncOptions = {}
): LouveSchedulePayload {
  const ministryId = opts.ministryId || LOUVE_MINISTRY_ID
  const solicitarConfirmacao = opts.solicitarConfirmacao ?? true
  const observacoes = opts.observacoes ?? ''
  const time = (schedule.time && String(schedule.time).trim()) || defaultTimeForDate(schedule.date)

  const byId = new Map(members.map(m => [m.id, m]))

  const grouped = new Map<string, Set<string>>() // memberId -> functionIds

  schedule.assignments.forEach(a => {
    if (!a.memberId) throw new Error(`Schedule "${schedule.name}" has unassigned slots.`)
    const m = byId.get(a.memberId)
    if (!m) throw new Error(`Assigned member "${a.memberId}" not found in members list.`)
    const louveUserId = m.louveUserId
    if (!louveUserId) throw new Error(`Member "${m.name}" is missing Louve user id.`)

    const instKey = normalizeInstrumentKey(a.instrument)
    const functionId =
      (m.louveFunctionsByInstrument && m.louveFunctionsByInstrument[norm(instKey)]) ||
      LOUVE_FUNCTIONS_BY_INSTRUMENT[norm(instKey)]
    if (!functionId) throw new Error(`No Louve function id mapping for instrument "${a.instrument}".`)

    const set = grouped.get(m.id) || new Set<string>()
    set.add(functionId)
    grouped.set(m.id, set)
  })

  const usuarios: LouveScheduleUserPayload[] = Array.from(grouped.entries()).map(([memberId, functionIds]) => {
    const m = byId.get(memberId)!
    return {
      usuario: m.louveUserId!,
      instrumentos: Array.from(functionIds),
      confirmacao: null,
      permissoes: { gerenciarMusicas: false },
      falta: null,
    }
  })

  return {
    _id: null,
    descricao: schedule.name,
    data: buildDateTime(schedule.date, time),
    usuarios,
    musicasEscala: [],
    ministerio: ministryId,
    solicitarConfirmacao,
    fechada: false,
    observacoes,
    equipesIds: [],
    paletaDeCores: null,
    roteiro: { _id: null, modeloRoteiroId: null, itens: [] },
    __v: null,
  }
}

export async function createLouveSchedule(payload: LouveSchedulePayload, bearerToken: string): Promise<unknown> {
  const apiBase = import.meta.env.VITE_LOUVE_API_BASE || (import.meta.env.DEV ? '/louveapi' : '/api/louve')
  const louvePath = `ministry/${payload.ministerio}/schedules`
  const url = apiBase === '/api/louve' ? `${apiBase}?path=${encodeURIComponent(louvePath)}` : `${apiBase}/${louvePath}`
  const token = normalizeBearerToken(bearerToken)
  const device = deviceHeaderFromJwt(token)
  const locale =
    typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('pt') ? 'pt' : 'en'
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `bearer ${token}`,
        ...(device ? { device } : {}),
        'x-platform': 'web',
        locale,
        // Keep a stable value; Louve uses this for analytics/compat and some deployments validate it.
        'build-number': '197',
      },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (String(msg).toLowerCase().includes('failed to fetch')) {
      throw new Error(
        'Network/CORS error: the browser blocked the request. If you are running locally, start the dev server and use the built-in /louveapi proxy.'
      )
    }
    throw e instanceof Error ? e : new Error(msg)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    // Helpful hint when the production proxy route isn't deployed/configured
    if (res.status === 404 && url.includes('/api/louve/')) {
      throw new Error(
        'Proxy endpoint not found (404). Ensure Vercel deployed the `api/louve/[...path].js` serverless function and that the project Root Directory is set to the repo folder that contains the `api/` directory, then redeploy.'
      )
    }
    try {
      type LouveErrorResponse = { error?: boolean; key?: string; message?: string }
      const data: unknown = JSON.parse(text)
      const parsed = (data && typeof data === 'object' ? (data as LouveErrorResponse) : undefined) || undefined
      const message = parsed?.message || parsed?.key || text || res.statusText
      throw new Error(`Louve API error (${res.status}): ${message}`)
    } catch {
      throw new Error(`Louve API error (${res.status}): ${text || res.statusText}`)
    }
  }

  // Louve returns created schedule JSON; keep it generic
  return await res.json().catch(() => null)
}
