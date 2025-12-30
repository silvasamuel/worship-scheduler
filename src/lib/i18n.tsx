import * as React from 'react'
import { norm } from '@/lib/instruments'

export type Lang = 'en' | 'pt-BR'

type Messages = Record<string, string>

const MESSAGES: Record<Lang, Messages> = {
  en: {
    'app.title': 'Worship Team Scheduler',

    'actions.export': 'Export',
    'actions.import': 'Import',
    'actions.reset': 'Reset',
    'actions.save': 'Save',
    'actions.delete': 'Delete',
    'actions.cancel': 'Cancel',
    'actions.autoFill': 'Auto‑Fill Schedules',

    'members.title': 'Band Members',
    'members.name': 'Name',
    'members.instruments': 'Instruments',
    'members.availability': 'Availability',
    'members.target': 'Target times to schedule',
    'members.allowSingPlay': 'Allow sing + play on same date',
    'members.add': 'Add Member',
    'members.tooltip.add': 'Enter a name and select at least one instrument',
    'members.empty': 'No members yet. Add some above.',
    'members.assigned': 'Assigned',

    'availability.both': 'Weekdays & Weekends',
    'availability.weekdays': 'Weekdays only',
    'availability.weekends': 'Weekends only',

    'schedules.title': 'Schedules',
    'schedules.selectAll': 'Select All',
    'schedules.unselectAll': 'Unselect All',
    'schedules.add': 'Add Schedule',
    'schedules.empty': 'No schedules yet. Add a date and instruments above.',
    'schedules.tooltip.add': 'Select a date and at least one instrument',
    'schedules.addInstrument': 'Add instrument...',
    'schedules.removeSlot': 'Remove slot',

    'status.complete': 'Complete',
    'status.partial': 'Partial',
    'status.empty': 'Empty',

    'select.member.placeholder': 'Select member',
    'select.unassigned': '— Unassigned —',

    'confirm.member.title': 'Remove member?',
    'confirm.member.desc': 'Are you sure you want to remove {name}? This cannot be undone.',
    'confirm.schedule.title': 'Remove schedule?',
    'confirm.schedule.desc': 'Are you sure you want to remove this schedule? This cannot be undone.',
    'confirm.reset.title': 'Reset all data?',
    'confirm.reset.desc':
      'Are you sure you want to reset all members and schedules? This action cannot be undone and all data will be permanently deleted.',
    'language.english': 'English',
    'language.portuguese': 'Português (BR)',
    'language.label': 'Language',

    'tabs.members': 'Members',
    'tabs.schedules': 'Schedules',
    'tabs.statistics': 'Statistics',
    'tabs.review': 'Review',

    'statistics.title': 'Statistics',
    'statistics.description': 'Number of schedule assignments per member',
    'statistics.empty': 'No statistics available. Add members and schedules first.',
    'statistics.schedule': 'schedule',
    'statistics.schedules': 'schedules',
    'statistics.totalMembers': 'Total Members',
    'statistics.totalSchedules': 'Total Schedules',
    'statistics.totalAssignments': 'Total Assignments',
    'statistics.averagePerMember': 'Average per Member',

    'review.title': 'Worship Team Schedules',
    'review.date': 'Date',
    'review.export': 'Export as Image',
    'review.noSchedules': 'No schedules available to review.',
  },
  'pt-BR': {
    'app.title': 'Gerador de Escalas de Ministério de Louvor',

    'actions.export': 'Exportar',
    'actions.import': 'Importar',
    'actions.reset': 'Limpar',
    'actions.save': 'Salvar',
    'actions.delete': 'Excluir',
    'actions.cancel': 'Cancelar',
    'actions.autoFill': 'Auto‑preencher Escalas',

    'members.title': 'Membros da Banda',
    'members.name': 'Nome',
    'members.instruments': 'Instrumentos',
    'members.availability': 'Disponibilidade',
    'members.target': 'Qtd. desejada de escala',
    'members.allowSingPlay': 'Permitir cantar + tocar na mesma data',
    'members.add': 'Adicionar Membro',
    'members.tooltip.add': 'Informe um nome e selecione pelo menos um instrumento',
    'members.empty': 'Nenhum membro ainda. Adicione acima.',
    'members.assigned': 'Atribuído',

    'availability.both': 'Dias de semana e finais de semana',
    'availability.weekdays': 'Somente dias de semana',
    'availability.weekends': 'Somente finais de semana',

    'schedules.title': 'Escalas',
    'schedules.selectAll': 'Selecionar Todos',
    'schedules.unselectAll': 'Desmarcar Todos',
    'schedules.add': 'Adicionar Escala',
    'schedules.empty': 'Nenhuma escala ainda. Adicione uma data e instrumentos acima.',
    'schedules.tooltip.add': 'Selecione uma data e pelo menos um instrumento',
    'schedules.addInstrument': 'Adicionar instrumento...',
    'schedules.removeSlot': 'Remover slot',

    'status.complete': 'Completa',
    'status.partial': 'Parcial',
    'status.empty': 'Vazia',

    'select.member.placeholder': 'Selecione o membro',
    'select.unassigned': '— Sem atribuição —',

    'confirm.member.title': 'Remover membro?',
    'confirm.member.desc': 'Tem certeza que deseja remover {name}? Esta ação não pode ser desfeita.',
    'confirm.schedule.title': 'Remover escala?',
    'confirm.schedule.desc': 'Tem certeza que deseja remover esta escala? Esta ação não pode ser desfeita.',
    'confirm.reset.title': 'Limpar todos os dados?',
    'confirm.reset.desc':
      'Tem certeza que deseja limpar todos os membros e escalas? Esta ação não pode ser desfeita e todos os dados serão permanentemente excluídos.',
    'language.english': 'English',
    'language.portuguese': 'Português (BR)',
    'language.label': 'Idioma',

    'tabs.members': 'Membros',
    'tabs.schedules': 'Escalas',
    'tabs.statistics': 'Estatísticas',
    'tabs.review': 'Revisar',

    'statistics.title': 'Estatísticas',
    'statistics.description': 'Número de atribuições de escala por membro',
    'statistics.empty': 'Nenhuma estatística disponível. Adicione membros e escalas primeiro.',
    'statistics.schedule': 'escala',
    'statistics.schedules': 'escalas',
    'statistics.totalMembers': 'Total de Membros',
    'statistics.totalSchedules': 'Total de Escalas',
    'statistics.totalAssignments': 'Total de Atribuições',
    'statistics.averagePerMember': 'Média por Membro',

    'review.title': 'Escalas do Ministério de Louvor',
    'review.date': 'Data',
    'review.export': 'Exportar como Imagem',
    'review.noSchedules': 'Nenhuma escala disponível para revisar.',
  },
}

type I18nContextType = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, params?: Record<string, string | number>) => string
  locale: string
  instrumentLabel: (key: string) => string
}

const I18nContext = React.createContext<I18nContextType | null>(null)

const STORAGE_KEY = 'worship-scheduler.lang'

function initialLang(): Lang {
  const saved = (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY)) as Lang | null
  if (saved === 'en' || saved === 'pt-BR') return saved
  return 'pt-BR'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>(initialLang())
  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      window.localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // Ignore localStorage errors (e.g., in private browsing mode)
    }
  }
  const t = React.useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const dict = MESSAGES[lang] || MESSAGES.en
      let out = dict[key] ?? key
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
        })
      }
      return out
    },
    [lang]
  )
  const locale = lang === 'pt-BR' ? 'pt-BR' : 'en-US'
  const instrumentLabel = React.useCallback((key: string) => getInstrumentLabel(lang, key), [lang])
  const value = React.useMemo(
    () => ({ lang, setLang, t, locale, instrumentLabel }),
    [lang, setLang, t, locale, instrumentLabel]
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextType {
  const ctx = React.useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

const INSTRUMENT_TRANSLATIONS: Record<string, Record<Lang, string>> = {
  [norm('Vocalista')]: { 'pt-BR': 'Vocalista', en: 'Vocalist' },
  [norm('Violão')]: { 'pt-BR': 'Violão', en: 'Acoustic Guitar' },
  [norm('Backing')]: { 'pt-BR': 'Backing', en: 'Backing Vocals' },
  [norm('Guitarra')]: { 'pt-BR': 'Guitarra', en: 'Electric Guitar' },
  [norm('Baixo')]: { 'pt-BR': 'Baixo', en: 'Bass' },
  [norm('Teclado')]: { 'pt-BR': 'Teclado', en: 'Keys' },
  [norm('Bateria')]: { 'pt-BR': 'Bateria', en: 'Drums' },
  [norm('Mídia')]: { 'pt-BR': 'Mídia', en: 'Media' },
  [norm('Mesa')]: { 'pt-BR': 'Mesa', en: 'Sound' },
}

export function getInstrumentLabel(lang: Lang, key: string): string {
  const k = norm(key)
  const record = INSTRUMENT_TRANSLATIONS[k]
  return record ? record[lang] : key
}
