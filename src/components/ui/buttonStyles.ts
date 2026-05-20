import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 border border-transparent shadow-sm disabled:bg-brand-300',
  secondary:
    'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:text-gray-400 disabled:bg-gray-100',
  ghost: 'bg-transparent text-brand-700 hover:bg-brand-50 border border-transparent disabled:text-gray-400',
  danger:
    'bg-white text-red-700 border border-red-200 hover:bg-red-50 disabled:text-red-300 disabled:border-red-100',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
}

export function buttonClassName(
  variant: Variant = 'primary',
  size: Size = 'md',
  className?: string
): string {
  return cn(
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-70',
    variantClasses[variant],
    sizeClasses[size],
    className
  )
}
