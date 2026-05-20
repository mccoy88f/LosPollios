import { buttonClassName } from '@/components/ui/buttonStyles'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  className,
  children,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={buttonClassName(variant, size, className)}
      {...rest}
    >
      {icon && iconPosition === 'left' ? <span className="shrink-0">{icon}</span> : null}
      {children}
      {icon && iconPosition === 'right' ? <span className="shrink-0">{icon}</span> : null}
    </button>
  )
}
