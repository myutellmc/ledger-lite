import { NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Receipt,
  CreditCard,
  Users,
  BarChart2,
  Settings,
  LogOut,
  TrendingDown,
  ClipboardList,
  Banknote,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: BookOpen, label: 'Chart of Accounts' },
  { to: '/journal', icon: FileText, label: 'Journal Entries' },
  { to: '/quotes', icon: ClipboardList, label: 'Quotes' },
  { to: '/invoices', icon: Receipt, label: 'Invoices' },
  { to: '/payments', icon: Banknote, label: 'Payments' },
  { to: '/bills', icon: CreditCard, label: 'Bills' },
  { to: '/expenses', icon: TrendingDown, label: 'Expenses' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/reports', icon: BarChart2, label: 'Reports' },
]

const adminItems = [
  { to: '/users', icon: Users, label: 'User Management' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { profile, signOut, isAdmin } = useAuth()

  return (
    <aside
      className="w-56 min-h-screen flex flex-col"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
    >
      {/* Logo */}
      <div className="px-4 py-5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: '#1e1b4b' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              {/* pivot post */}
              <rect x="9.25" y="11" width="1.5" height="6" rx="0.75" fill="#fbbf24"/>
              {/* base */}
              <rect x="6" y="16" width="8" height="1.5" rx="0.75" fill="rgba(251,191,36,0.4)"/>
              {/* beam */}
              <rect x="3.5" y="8.5" width="13" height="1.5" rx="0.75" fill="#fbbf24"/>
              {/* left arm */}
              <line x1="4.5" y1="10" x2="3.5" y2="13.5" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round"/>
              <rect x="1" y="13" width="5" height="1.25" rx="0.625" fill="rgba(251,191,36,0.55)"/>
              {/* right arm — slightly higher */}
              <line x1="15.5" y1="10" x2="16.5" y2="12.5" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round"/>
              <rect x="14" y="12" width="5" height="1.25" rx="0.625" fill="rgba(251,191,36,0.55)"/>
              {/* pivot dot */}
              <circle cx="10" cy="8.5" r="1.5" fill="#fde68a"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight" style={{ color: '#f1f5f9', letterSpacing: '-0.01em' }}>
              Ledger Lite
            </p>
            <p className="text-xs leading-tight mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>
              Accounting
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100 group"
            style={({ isActive }) => ({
              color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
              background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--sidebar-active-border)' : '2px solid transparent',
              paddingLeft: '10px',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon
                  className="w-4 h-4 shrink-0 transition-colors"
                  style={{ color: isActive ? '#a5b4fc' : 'var(--sidebar-text)' }}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-5 pb-1.5 px-3">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(100,116,139,0.6)', fontSize: '10px' }}
              >
                Admin
              </p>
            </div>
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100"
                style={({ isActive }) => ({
                  color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                  background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                  borderLeft: isActive ? '2px solid var(--sidebar-active-border)' : '2px solid transparent',
                  paddingLeft: '10px',
                })}
              >
                {({ isActive }) => (
                  <>
                    <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? '#a5b4fc' : 'var(--sidebar-text)' }} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}
          >
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight" style={{ color: '#cbd5e1' }}>
              {profile?.full_name ?? 'User'}
            </p>
            <p className="text-xs capitalize leading-tight mt-0.5" style={{ color: 'rgba(100,116,139,0.8)' }}>
              {profile?.role ?? 'viewer'}
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sm transition-all duration-100"
          style={{ color: 'var(--sidebar-text)' }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--sidebar-hover-bg)'
            e.currentTarget.style.color = '#ef4444'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--sidebar-text)'
          }}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
