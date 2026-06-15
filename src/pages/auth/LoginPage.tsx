import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
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
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
              <rect x="7" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="1" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="7" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <span className="font-semibold text-white" style={{ letterSpacing: '-0.01em' }}>Ledger Lite</span>
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
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
                <rect x="7" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
            <span className="font-semibold text-white">Ledger Lite</span>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg text-sm font-semibold transition-all duration-100 active:scale-[0.99] disabled:opacity-50 mt-2"
              style={{ background: '#6366f1', color: 'white' }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
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
