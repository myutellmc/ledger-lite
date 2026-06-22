import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

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

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { needsPasswordReset } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => navigate('/'), 2000)
  }

  if (!needsPasswordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
        <div className="text-center">
          <p className="text-sm" style={{ color: 'rgba(148,163,184,0.6)' }}>
            This link has expired or already been used.{' '}
            <a href="/login" style={{ color: '#818cf8' }}>Return to login</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0f172a' }}>
      <div className="w-full max-w-sm">

        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#1e1b4b' }}>
            <LedgerIcon />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight" style={{ color: '#f1f5f9' }}>Ledger Lite</p>
            <p className="text-xs leading-tight mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>Accounting</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-1" style={{ color: '#f1f5f9', letterSpacing: '-0.03em' }}>
          Set new password
        </h1>
        <p className="text-sm mb-8" style={{ color: 'rgba(100,116,139,0.85)' }}>
          Choose a strong password for your account.
        </p>

        {done ? (
          <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
            Password updated — redirecting you now…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'rgba(148,163,184,0.6)', letterSpacing: '0.06em' }}>
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                autoFocus
                className="w-full h-11 px-3.5 rounded-lg text-sm transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#f1f5f9' }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'rgba(148,163,184,0.6)', letterSpacing: '0.06em' }}>
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-11 px-3.5 rounded-lg text-sm transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#f1f5f9' }}
              />
            </div>

            {error && (
              <div className="rounded-lg px-3.5 py-2.5 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                {error}
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
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
