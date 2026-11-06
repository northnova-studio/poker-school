import { Link } from 'react-router-dom'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 font-semibold tracking-tight transition-[transform,background-color,color,border-color] duration-200 ease-out active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none min-h-11 rounded-[var(--r-card)] select-none'
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:brightness-110',
  secondary: 'border border-line bg-surface text-ink hover:border-accent hover:text-accent',
  ghost: 'text-ink hover:text-accent',
  danger: 'bg-danger text-on-accent hover:brightness-110',
}
const sizes: Record<Size, string> = {
  sm: 'px-3 text-sm min-h-9',
  md: 'px-5 text-[0.95rem]',
  lg: 'px-7 text-base min-h-13',
}

interface Common {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', icon, className, children, ...rest }: Common & ComponentProps<'button'>) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
      {icon}
    </button>
  )
}

export function ButtonLink({ variant = 'primary', size = 'md', icon, className, children, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
      {icon}
    </Link>
  )
}
