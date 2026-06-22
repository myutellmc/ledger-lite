import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ToastProvider } from '@/components/ui/Toast'

export function AppLayout() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen" style={{ background: 'var(--page-bg)' }}>
        <Sidebar />
        <main className="flex-1 overflow-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  )
}
