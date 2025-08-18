import * as React from 'react'
import { cn } from '@/lib/cn'

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children?: React.ReactNode
  className?: string
}

export function Modal({ open, onOpenChange, title, children, className }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className={cn('relative z-10 w-full max-w-xl rounded-2xl border bg-white p-4 shadow-lg', className)}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-semibold">{title}</h4>
          <button className="rounded-lg p-1 text-gray-600 hover:bg-gray-100" onClick={() => onOpenChange(false)} aria-label="Close">✕</button>
        </div>
        <div className="text-sm text-gray-800">
          {children}
        </div>
      </div>
    </div>
  )
}
