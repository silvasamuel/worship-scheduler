import * as React from 'react'
import { cn } from '@/lib/cn'

interface BaseProps {
  children?: React.ReactNode
}

export interface SelectProps extends BaseProps {
  value?: string
  onValueChange?: (value: string) => void
  valueLabel?: string
}

type SelectContextType = {
  value: string
  setValue: (v: string) => void
  open: boolean
  setOpen: (o: boolean) => void
  registerLabel: (value: string, label: string) => void
  getLabel: (value: string) => string | undefined
  valueLabel?: string
}

const SelectContext = React.createContext<SelectContextType | null>(null)

export function Select({ value = '', onValueChange, valueLabel, children }: SelectProps) {
  const [internal, setInternal] = React.useState(value)
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const labelsRef = React.useRef<Map<string, string>>(new Map())

  React.useEffect(() => setInternal(value), [value])

  const setValue = (v: string) => {
    setInternal(v)
    onValueChange?.(v)
  }

  const registerLabel = (v: string, label: string) => {
    labelsRef.current.set(v, label)
  }
  const getLabel = (v: string) => labelsRef.current.get(v)

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <SelectContext.Provider value={{ value: internal, setValue, open, setOpen, registerLabel, getLabel, valueLabel }}>
      <div ref={containerRef} className="w-full">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(SelectContext)
  return (
    <div
      className={cn(
        'relative rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ring-offset-white',
        className
      )}
      role="button"
      aria-haspopup="listbox"
      aria-expanded={!!ctx?.open}
      tabIndex={0}
      {...props}
      onClick={() => ctx?.setOpen(!ctx.open)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          ctx?.setOpen(!ctx.open)
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          ctx?.setOpen(true)
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          ctx?.setOpen(false)
        }
      }}
    >
      {children}
    </div>
  )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(SelectContext)
  const label = ctx?.valueLabel && ctx.value ? ctx.valueLabel : ctx?.getLabel(ctx?.value || '')
  return (
    <div className="h-9 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 flex items-center text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis shadow-sm transition-all duration-200 hover:border-gray-400 cursor-pointer">
      {ctx?.value ? (label ?? ctx.value) : placeholder || 'Select'}
    </div>
  )
}

export function SelectContent({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(SelectContext)
  if (!ctx) return null
  if (!ctx.open) return null
  return (
    <div
      className={cn(
        'absolute z-10 mt-1 min-w-[12rem] w-max rounded-xl border border-gray-200 bg-white shadow-lg',
        className
      )}
      {...rest}
    >
      <div className="max-h-60 overflow-auto py-1">{children}</div>
    </div>
  )
}

export function SelectItem({ value, children }: { value: string; children?: React.ReactNode }) {
  const ctx = React.useContext(SelectContext)
  React.useEffect(() => {
    const label = extractText(children)
    if (ctx && label) ctx.registerLabel(value, label)
  }, [children, ctx, value])

  const selected = ctx?.value === value
  return (
    <div
      className={cn(
        'cursor-pointer select-none rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100',
        selected && 'bg-gray-100'
      )}
      onClick={() => {
        ctx?.setValue(value)
        ctx?.setOpen(false)
      }}
    >
      {children}
    </div>
  )
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (React.isValidElement(node)) return extractText(node.props.children)
  return ''
}
