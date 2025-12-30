import * as React from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'default' | 'secondary' | 'destructive' | 'ghost'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'default' | 'icon'
}

const base =
  'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap shadow-sm hover:shadow-md'
const variants: Record<ButtonVariant, string> = {
  default: 'bg-gray-900 text-white hover:bg-gray-800 focus-visible:ring-gray-400 active:scale-95',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-300 active:scale-95',
  destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400 active:scale-95',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-900 shadow-none hover:shadow-none',
}
const sizes = {
  default: 'h-9 px-4 py-2',
  icon: 'h-9 w-9 p-0',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  )
)
Button.displayName = 'Button'
