import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  success: (title: string, message?: string) => void
  error:   (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info:    (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4" style={{ color: '#16a34a' }} />,
  error:   <XCircle     className="w-4 h-4" style={{ color: '#dc2626' }} />,
  warning: <AlertTriangle className="w-4 h-4" style={{ color: '#d97706' }} />,
  info:    <Info        className="w-4 h-4" style={{ color: '#2563eb' }} />,
}

const STYLES: Record<ToastType, { border: string; bg: string; title: string }> = {
  success: { border: '#bbf7d0', bg: '#f0fdf4', title: '#15803d' },
  error:   { border: '#fecaca', bg: '#fef2f2', title: '#dc2626' },
  warning: { border: '#fde68a', bg: '#fffbeb', title: '#b45309' },
  info:    { border: '#bfdbfe', bg: '#eff6ff', title: '#1d4ed8' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const add = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, type, title, message }])
    setTimeout(() => remove(id), 4000)
  }, [remove])

  const ctx: ToastContextValue = {
    success: (t, m) => add('success', t, m),
    error:   (t, m) => add('error',   t, m),
    warning: (t, m) => add('warning', t, m),
    info:    (t, m) => add('info',    t, m),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Portal */}
      <div
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px',
          width: '340px', pointerEvents: 'none',
        }}
      >
        {toasts.map(toast => {
          const s = STYLES[toast.type]
          return (
            <div
              key={toast.id}
              className="toast-in"
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: '10px',
                padding: '12px 14px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                pointerEvents: 'all',
              }}
            >
              <span style={{ flexShrink: 0, marginTop: '1px' }}>{ICONS[toast.type]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: s.title, lineHeight: 1.4 }}>
                  {toast.title}
                </p>
                {toast.message && (
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => remove(toast.id)}
                style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#94a3b8', lineHeight: 0 }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
