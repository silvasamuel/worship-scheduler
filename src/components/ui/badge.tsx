import * as React from 'react'
import { cn } from '@/lib/cn'

type BadgeVariant = 'default' | 'secondary' | 'outline'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-gray-900 text-white',
  secondary: 'bg-gray-200 text-gray-900',
  outline: 'border border-gray-300 text-gray-800',
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn('inline-flex items-center rounded-xl px-2 py-1 text-xs', variants[variant], className)}
      {...props}
    />
  )
}
