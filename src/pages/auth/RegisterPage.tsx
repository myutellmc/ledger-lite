import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  const fieldStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#f1f5f9',
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0d1117' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
              <rect x="7" y="7" width="4" height="4" rx="1" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <span className="font-semibold text-white">Ledger Lite</span>
        </div>

        <h1 className="text-2xl font-semibold mb-1 text-center" style={{ color: '#f1f5f9', letterSpacing: '-0.03em' }}>
          Create your account
        </h1>
        <p className="text-sm mb-8 text-center" style={{ color: 'rgba(100,116,139,0.9)' }}>
          Get started — free forever, no credit card
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Full name', type: 'text', value: fullName, onChange: setFullName, placeholder: 'Jane Smith', autoComplete: 'name' },
            { label: 'Email address', type: 'email', value: email, onChange: setEmail, placeholder: 'you@example.com', autoComplete: 'email' },
            { label: 'Password', type: 'password', value: password, onChange: setPassword, placeholder: 'Min. 8 characters', autoComplete: 'new-password' },
          ].map(field => (
            <div key={field.label}>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>{field.label}</label>
              <input
                type={field.type}
                value={field.value}
                onChange={e => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                required
                className="w-full h-10 px-3.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={fieldStyle}
              />
            </div>
          ))}

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
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'rgba(100,116,139,0.8)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-medium" style={{ color: '#818cf8' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
