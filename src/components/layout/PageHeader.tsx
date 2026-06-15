import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-8 py-5"
      style={{
        background: 'var(--card-bg)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <div>
        <h1
          className="font-semibold leading-tight"
          style={{ fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
        >
          {title}
        </h1>
        {description && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
