import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}

const variants: Record<string, string> = {
  default: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger:  'bg-red-50 text-red-600 ring-red-200',
  info:    'bg-sky-50 text-sky-700 ring-sky-200',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export function Badge({ children, className, variant = 'neutral' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

type BadgeVariant = BadgeProps['variant']

export function statusBadge(status: string): { variant: BadgeVariant } {
  const map: Record<string, BadgeVariant> = {
    draft:     'neutral',
    sent:      'info',
    paid:      'success',
    overdue:   'danger',
    cancelled: 'neutral',
    received:  'warning',
    active:    'success',
    inactive:  'neutral',
  }
  return { variant: map[status] ?? 'neutral' }
}
