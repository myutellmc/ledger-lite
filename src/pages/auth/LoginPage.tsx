import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

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
    <div
      className="min-h-screen flex"
      style={{ background: '#0d1117' }}
    >
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#1e1b4b' }}>
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
            <p className="text-sm font-semibold leading-tight" style={{ color: '#f1f5f9', letterSpacing: '-0.01em' }}>Ledger Lite</p>
            <p className="text-xs leading-tight mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>Accounting</p>
          </div>
        </div>

        <div>
          <blockquote className="text-2xl font-light leading-relaxed mb-8" style={{ color: 'rgba(241,245,249,0.85)', letterSpacing: '-0.02em' }}>
            "Simple, clean accounting that gets out of your way."
          </blockquote>
          <div className="flex items-center gap-6">
            {[
              { label: 'Double-entry', desc: 'bookkeeping' },
              { label: 'Real-time', desc: 'reporting' },
              { label: 'Role-based', desc: 'access control' },
            ].map(({ label, desc }) => (
              <div key={label}>
                <p className="text-sm font-semibold" style={{ color: '#e0e7ff' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(100,116,139,0.9)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#1e1b4b' }}>
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
              <p className="text-sm font-semibold leading-tight" style={{ color: '#f1f5f9', letterSpacing: '-0.01em' }}>Ledger Lite</p>
              <p className="text-xs leading-tight mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>Accounting</p>
            </div>
          </div>

          <h1 className="text-2xl font-semibold mb-1" style={{ color: '#f1f5f9', letterSpacing: '-0.03em' }}>
            Welcome back
          </h1>
          <p className="text-sm mb-8" style={{ color: 'rgba(100,116,139,0.9)' }}>
            Sign in to your account to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full h-10 px-3.5 rounded-lg text-sm transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f1f5f9',
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full h-10 px-3.5 rounded-lg text-sm transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f1f5f9',
                }}
              />
            </div>

            {error && (
              <div className="rounded-lg px-3.5 py-2.5 text-sm" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                {error}
              </div>
            )}
            {resetSent && (
              <div className="rounded-lg px-3.5 py-2.5 text-sm" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}>
                Password reset link sent — check your email.
              </div>
            )}

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => { setShowReset(s => !s); setError('') }}
                className="text-xs transition-colors"
                style={{ color: 'rgba(148,163,184,0.7)', background: 'none', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#a5b4fc')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(148,163,184,0.7)')}
              >
                Forgot password?
              </button>
            </div>

            {showReset && (
              <div className="rounded-lg px-3.5 py-3 text-sm slide-down" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p className="text-xs mb-2" style={{ color: '#a5b4fc' }}>A reset link will be sent to your email address above.</p>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: 'none', cursor: 'pointer' }}
                >
                  {resetLoading ? 'Sending...' : 'Send reset link'}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg text-sm font-semibold transition-all duration-100 active:scale-[0.99] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'rgba(100,116,139,0.8)' }}>
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
