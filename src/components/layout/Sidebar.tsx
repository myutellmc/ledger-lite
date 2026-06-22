import { NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, BookOpen, FileText, Receipt, CreditCard, Users,
  BarChart2, Settings, LogOut, TrendingDown, ClipboardList, Banknote,
  RotateCcw, UserCheck, Calculator, ChevronRight, FileCheck, Package,
} from 'lucide-react'

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard',        end: true },
  { to: '/accounts',     icon: BookOpen,        label: 'Chart of Accounts' },
  { to: '/journal',      icon: FileText,        label: 'Journal Entries' },
  { to: '/quotes',       icon: ClipboardList,   label: 'Quotes' },
  { to: '/invoices',     icon: Receipt,         label: 'Invoices' },
  { to: '/receipts',     icon: FileCheck,       label: 'Receipts' },
  { to: '/credit-notes', icon: RotateCcw,       label: 'Credit Notes' },
  { to: '/payments',     icon: Banknote,        label: 'Payments' },
  { to: '/bills',        icon: CreditCard,      label: 'Bills' },
  { to: '/expenses',     icon: TrendingDown,    label: 'Expenses' },
  { to: '/inventory',    icon: Package,         label: 'Inventory' },
  { to: '/contacts',     icon: Users,           label: 'Contacts' },
  { to: '/reports',      icon: BarChart2,       label: 'Reports' },
]
const payrollItems = [
  { to: '/employees', icon: UserCheck,  label: 'Employees' },
  { to: '/payroll',   icon: Calculator, label: 'Payroll' },
]
const adminItems = [
  { to: '/users',    icon: Users,    label: 'User Management' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

type NavItemDef = { to: string; icon: React.ElementType; label: string; end?: boolean }

function NavItem({ to, icon: Icon, label, end = false }: NavItemDef) {
  return (
    <NavLink
      to={to}
      end={end}
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
          <Icon className="w-4 h-4 shrink-0 transition-colors" style={{ color: isActive ? '#a5b4fc' : 'inherit' }} />
          <span className="flex-1 truncate">{label}</span>
          {isActive && <ChevronRight className="w-3 h-3 opacity-40" style={{ color: '#a5b4fc' }} />}
        </>
      )}
    </NavLink>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-4 pb-1 px-3">
      <p style={{ color: 'rgba(100,116,139,0.45)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {children}
      </p>
    </div>
  )
}

export function Sidebar() {
  const { profile, signOut, isAdmin } = useAuth()

  const initials = profile?.full_name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U'

  return (
    <aside
      className="w-56 min-h-screen flex flex-col shrink-0"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
    >
      {/* Logo */}
      <div className="px-4 py-5 shrink-0" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="9.25" y="11" width="1.5" height="6" rx="0.75" fill="#fbbf24"/>
              <rect x="6" y="16" width="8" height="1.5" rx="0.75" fill="rgba(251,191,36,0.4)"/>
              <rect x="3.5" y="8.5" width="13" height="1.5" rx="0.75" fill="#fbbf24"/>
              <line x1="4.5" y1="10" x2="3.5" y2="13.5" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round"/>
              <rect x="1" y="13" width="5" height="1.25" rx="0.625" fill="rgba(251,191,36,0.55)"/>
              <line x1="15.5" y1="10" x2="16.5" y2="12.5" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round"/>
              <rect x="14" y="12" width="5" height="1.25" rx="0.625" fill="rgba(251,191,36,0.55)"/>
              <circle cx="10" cy="8.5" r="1.5" fill="#fde68a"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: '#f1f5f9', letterSpacing: '-0.02em' }}>Ledger Lite</p>
            <p className="text-xs leading-tight mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>Zambia · ZMW</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-0.5">
        {navItems.map(({ to, icon, label, end }) => (
          <NavItem key={to} to={to} icon={icon} label={label} end={end} />
        ))}

        <SectionLabel>Payroll</SectionLabel>
        {payrollItems.map(({ to, icon, label }) => (
          <NavItem key={to} to={to} icon={icon} label={label} />
        ))}

        {isAdmin && (
          <>
            <SectionLabel>Admin</SectionLabel>
            {adminItems.map(({ to, icon, label }) => (
              <NavItem key={to} to={to} icon={icon} label={label} />
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))', color: '#a5b4fc' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate leading-tight" style={{ color: '#cbd5e1' }}>
              {profile?.full_name ?? 'User'}
            </p>
            <p className="text-xs capitalize leading-tight mt-0.5" style={{ color: 'rgba(100,116,139,0.65)' }}>
              {profile?.role ?? 'viewer'}
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-2 py-1.5 w-full rounded-lg text-xs font-medium transition-all duration-100"
          style={{ color: 'rgba(100,116,139,0.7)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(100,116,139,0.7)' }}
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
