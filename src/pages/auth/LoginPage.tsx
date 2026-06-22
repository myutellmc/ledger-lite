import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { FileText, Package, Users, BarChart2, Shield, CheckCircle } from 'lucide-react'

const FEATURES = [
  {
    icon: FileText,
    label: 'Quotes & Invoices',
    desc: 'Send, track, and get paid faster',
  },
  {
    icon: Package,
    label: 'Inventory',
    desc: 'Stock levels linked to every sale',
  },
  {
    icon: Users,
    label: 'Payroll',
    desc: 'PAYE, NAPSA & NHIMA auto-calculated',
  },
  {
    icon: BarChart2,
    label: 'Reports',
    desc: 'P&L, balance sheet, cash flow',
  },
]

const LedgerIcon = () => (
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
)

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError('Enter your email address first'); return }
    setResetLoading(true)
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    setResetLoading(false)
    setResetSent(true)
    setShowReset(false)
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0f172a' }}>

      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', boxShadow: '0 0 0 1px rgba(99,102,241,0.25)' }}
          >
            <LedgerIcon />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight" style={{ color: '#f1f5f9', letterSpacing: '-0.02em' }}>Ledger Lite</p>
            <p className="text-xs leading-tight mt-0.5" style={{ color: 'rgba(148,163,184,0.45)' }}>Zambia · ZMW · ZRA Compliant</p>
          </div>
        </div>

        {/* Centre block */}
        <div>
          {/* Headline */}
          <h2
            className="text-4xl font-bold leading-[1.15] mb-4"
            style={{ color: '#f1f5f9', letterSpacing: '-0.04em' }}
          >
            Your finances,<br />under control.
          </h2>
          <p className="text-sm mb-10 max-w-xs" style={{ color: 'rgba(148,163,184,0.65)', lineHeight: '1.65' }}>
            Cloud accounting built for Zambian small businesses — from quotes to ZRA-compliant tax reporting, all in one place.
          </p>

          {/* Feature rows */}
          <div className="space-y-2 mb-10">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-center gap-3.5 rounded-lg px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.15)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: '#a5b4fc' }} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium leading-tight" style={{ color: '#e2e8f0' }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(100,116,139,0.75)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust indicators */}
          <div
            className="rounded-lg px-4 py-3 flex items-start gap-3"
            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}
          >
            <Shield className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#34d399' }} strokeWidth={1.5} />
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(148,163,184,0.65)' }}>
              <span style={{ color: '#6ee7b7', fontWeight: 600 }}>ZRA Smart Invoice compliant.</span>{' '}
              VAT 16% · NAPSA · NHIMA · PAYE — all statutory obligations handled automatically.
            </p>
          </div>
        </div>

        {/* Bottom trust pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {['Double-entry bookkeeping', 'Real-time reporting', 'Role-based access'].map(t => (
            <span
              key={t}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(148,163,184,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <CheckCircle className="w-3 h-3" style={{ color: '#6ee7b7' }} strokeWidth={2} />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#1e1b4b' }}>
              <LedgerIcon />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight" style={{ color: '#f1f5f9' }}>Ledger Lite</p>
              <p className="text-xs leading-tight mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>Accounting</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9', letterSpacing: '-0.03em' }}>
            Welcome back
          </h1>
          <p className="text-sm mb-8" style={{ color: 'rgba(100,116,139,0.85)' }}>
            Sign in to your account to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'rgba(148,163,184,0.6)', letterSpacing: '0.06em' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full h-11 px-3.5 rounded-lg text-sm transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: '#f1f5f9',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'rgba(148,163,184,0.6)', letterSpacing: '0.06em' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full h-11 px-3.5 rounded-lg text-sm transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: '#f1f5f9',
                }}
              />
            </div>

            {error && (
              <div className="rounded-lg px-3.5 py-2.5 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                {error}
              </div>
            )}
            {resetSent && (
              <div className="rounded-lg px-3.5 py-2.5 text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
                Password reset link sent — check your email.
              </div>
            )}

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => { setShowReset(s => !s); setError('') }}
                className="text-xs transition-colors"
                style={{ color: 'rgba(148,163,184,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#a5b4fc')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.55)')}
              >
                Forgot password?
              </button>
            </div>

            {showReset && (
              <div className="rounded-lg px-3.5 py-3" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
                <p className="text-xs mb-2" style={{ color: '#a5b4fc' }}>A reset link will be sent to the email address above.</p>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(99,102,241,0.18)', color: '#a5b4fc', border: 'none', cursor: 'pointer' }}
                >
                  {resetLoading ? 'Sending…' : 'Send reset link'}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg text-sm font-semibold transition-all duration-100 active:scale-[0.99] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: 'white',
                boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 2px 12px rgba(99,102,241,0.3)',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'rgba(100,116,139,0.7)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-medium" style={{ color: '#818cf8' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
