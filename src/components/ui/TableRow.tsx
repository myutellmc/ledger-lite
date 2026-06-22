import { cn } from '@/lib/utils'

export function Th({ children, className, right }: { children?: React.ReactNode; className?: string; right?: boolean }) {
  return (
    <th
      className={cn('px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap', right && 'text-right', className)}
      style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}
    >
      {children}
    </th>
  )
}

export function Td({ children, className, right, mono, style }: { children?: React.ReactNode; className?: string; right?: boolean; mono?: boolean; style?: React.CSSProperties }) {
  return (
    <td
      className={cn('px-5 py-3.5 text-sm', right && 'text-right', mono && 'font-mono', className)}
      style={{ color: 'var(--text-secondary)', ...style }}
    >
      {children}
    </td>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <tr>
      <td colSpan={99} className="px-6 py-16 text-center">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
          style={{ background: '#f1f5f9' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{title}</p>
        {description && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      </td>
    </tr>
  )
}

export function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">{children}</table>
    </div>
  )
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-default)' }}>
      <tr>{children}</tr>
    </thead>
  )
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y" style={{ borderColor: 'var(--border-light)' }}>{children}</tbody>
}

export function DataRow({ children, className, onClick, style }: { children: React.ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <tr
      className={cn('transition-colors duration-75 hover:bg-slate-50/70', className)}
      onClick={onClick}
      style={style}
    >
      {children}
    </tr>
  )
}
