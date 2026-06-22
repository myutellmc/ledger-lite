import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'

interface QuoteItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  amount: number
}

interface QuoteData {
  id: string
  number: string
  issue_date: string
  expiry_date: string | null
  status: string
  subtotal: number
  tax_amount: number
  total: number
  notes: string | null
  contacts: { name: string; email: string | null } | null
  settings: {
    company_name: string
    company_email: string | null
    company_phone: string | null
    company_address: string | null
    logo_url: string | null
  }
  items: QuoteItem[]
}

type PageState = 'loading' | 'found' | 'not_found' | 'responding' | 'accepted' | 'declined' | 'already_responded'

export function QuoteCustomerPage() {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<PageState>('loading')
  const [data, setData] = useState<QuoteData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setState('not_found'); return }
    loadQuote()
  }, [token])

  async function loadQuote() {
    try {
      const { data: result, error: err } = await supabase.functions.invoke('get-quote-by-token', {
        body: { token },
      })
      if (err || !result?.quote) {
        setState('not_found')
        return
      }
      setData(result.quote)
      const status = result.quote.status
      if (status === 'accepted') setState('already_responded')
      else if (status === 'declined') setState('already_responded')
      else setState('found')
    } catch {
      setState('not_found')
    }
  }

  async function respond(action: 'accept' | 'decline') {
    setState('responding')
    try {
      const { error: err } = await supabase.functions.invoke('respond-to-quote', {
        body: { token, action },
      })
      if (err) throw err
      setState(action === 'accept' ? 'accepted' : 'declined')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setState('found')
    }
  }

  const isExpired = data?.expiry_date ? new Date(data.expiry_date) < new Date() : false

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#4f46e5' }} />
      </div>
    )
  }

  if (state === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#f8fafc' }}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#fef2f2' }}>
            <XCircle className="w-8 h-8" style={{ color: '#ef4444' }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: '#1e293b' }}>Quote Not Found</h1>
          <p style={{ color: '#64748b' }}>This quote link is invalid or has expired. Please contact the sender for a new link.</p>
        </div>
      </div>
    )
  }

  if (state === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#f0fdf4' }}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#dcfce7' }}>
            <CheckCircle className="w-8 h-8" style={{ color: '#16a34a' }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: '#166534' }}>Quote Accepted!</h1>
          <p style={{ color: '#15803d' }}>Thank you! You have accepted quote <strong>{data?.number}</strong>. {data?.settings?.company_name} will be in touch shortly.</p>
        </div>
      </div>
    )
  }

  if (state === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#fef2f2' }}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#fee2e2' }}>
            <XCircle className="w-8 h-8" style={{ color: '#ef4444' }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: '#991b1b' }}>Quote Declined</h1>
          <p style={{ color: '#b91c1c' }}>You have declined quote <strong>{data?.number}</strong>. Please contact {data?.settings?.company_name} if you'd like to discuss further.</p>
        </div>
      </div>
    )
  }

  if (state === 'already_responded' && data) {
    const isAccepted = data.status === 'accepted'
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: isAccepted ? '#f0fdf4' : '#fef2f2' }}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: isAccepted ? '#dcfce7' : '#fee2e2' }}>
            {isAccepted
              ? <CheckCircle className="w-8 h-8" style={{ color: '#16a34a' }} />
              : <XCircle className="w-8 h-8" style={{ color: '#ef4444' }} />}
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: isAccepted ? '#166534' : '#991b1b' }}>
            Already {isAccepted ? 'Accepted' : 'Declined'}
          </h1>
          <p style={{ color: isAccepted ? '#15803d' : '#b91c1c' }}>
            This quote ({data.number}) has already been {data.status}.
          </p>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Brand bar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {data.settings.logo_url && (
          <img src={data.settings.logo_url} alt="Logo" style={{ maxHeight: '36px', maxWidth: '120px', objectFit: 'contain' }} />
        )}
        <span style={{ fontWeight: 700, fontSize: '15px', color: '#1e1b4b' }}>{data.settings.company_name}</span>
      </div>

      <div style={{ maxWidth: '700px', margin: '32px auto', padding: '0 16px' }}>

        {/* Status banner */}
        {isExpired && (
          <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-xl" style={{ background: '#fef9c3', border: '1px solid #fbbf24' }}>
            <Clock className="w-4 h-4 flex-shrink-0" style={{ color: '#92400e' }} />
            <p className="text-sm font-medium" style={{ color: '#92400e' }}>This quote expired on {formatDate(data.expiry_date!)}. Contact {data.settings.company_name} for an updated quote.</p>
          </div>
        )}

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' }}>
            {error}
          </div>
        )}

        {/* Quote card */}
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          {/* Quote header */}
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#059669', marginBottom: '4px' }}>
                Quotation
              </p>
              <p style={{ fontSize: '22px', fontWeight: 800, color: '#1e1b4b' }}>{data.number}</p>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                Prepared for: <strong style={{ color: '#1e293b' }}>{data.contacts?.name}</strong>
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '13px', color: '#64748b' }}>
              <p>Issued: <strong style={{ color: '#1e293b' }}>{formatDate(data.issue_date)}</strong></p>
              {data.expiry_date && (
                <p style={{ color: isExpired ? '#dc2626' : undefined }}>
                  Valid until: <strong>{formatDate(data.expiry_date)}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Line items */}
          <div style={{ padding: '0 28px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ padding: '12px 0', textAlign: 'left', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Description</th>
                  <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', width: '50px' }}>Qty</th>
                  <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', width: '100px' }}>Unit Price</th>
                  <th style={{ padding: '12px 0', textAlign: 'right', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', width: '90px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: i < data.items.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '12px 0', fontSize: '14px', color: '#1e293b' }}>{item.description}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.unit_price)}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontSize: '14px', fontWeight: 600, color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ padding: '16px 28px', borderTop: '2px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#64748b' }}>
                <span>Subtotal</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(data.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#64748b' }}>
                <span>Tax</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(data.tax_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '4px', borderTop: '2px solid #1e1b4b', fontSize: '16px', fontWeight: 800, color: '#1e1b4b' }}>
                <span>Total</span>
                <span style={{ color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(data.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {data.notes && (
            <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '6px' }}>Notes</p>
              <p style={{ fontSize: '13px', color: '#475569', whiteSpace: 'pre-line', lineHeight: '1.7' }}>{data.notes}</p>
            </div>
          )}

          {/* Action buttons */}
          {!isExpired && (
            <div style={{ padding: '24px 28px', borderTop: '2px solid #f1f5f9', display: 'flex', gap: '12px' }}>
              <button
                onClick={() => respond('accept')}
                disabled={state === 'responding'}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: state === 'responding' ? 'not-allowed' : 'pointer',
                  background: '#16a34a',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: state === 'responding' ? 0.7 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <CheckCircle style={{ width: '20px', height: '20px' }} />
                Accept Quote
              </button>
              <button
                onClick={() => respond('decline')}
                disabled={state === 'responding'}
                style={{
                  padding: '14px 20px',
                  borderRadius: '10px',
                  border: '2px solid #e2e8f0',
                  cursor: state === 'responding' ? 'not-allowed' : 'pointer',
                  background: 'white',
                  color: '#64748b',
                  fontSize: '15px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: state === 'responding' ? 0.7 : 1,
                }}
              >
                <XCircle style={{ width: '18px', height: '18px' }} />
                Decline
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '24px' }}>
          Questions? Contact {data.settings.company_name}
          {data.settings.company_email && <> at <a href={`mailto:${data.settings.company_email}`} style={{ color: '#4f46e5' }}>{data.settings.company_email}</a></>}
          {data.settings.company_phone && <> · {data.settings.company_phone}</>}
        </p>
      </div>
    </div>
  )
}
