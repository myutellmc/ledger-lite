import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Printer, ArrowLeft } from 'lucide-react'

interface QuoteItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  amount: number
}

interface QuoteDetail {
  id: string
  number: string
  issue_date: string
  expiry_date: string | null
  status: string
  subtotal: number
  tax_amount: number
  total: number
  notes: string | null
  contacts: {
    name: string
    email: string | null
    phone: string | null
    address: string | null
  } | null
}

interface Settings {
  company_name: string
  company_email: string | null
  company_phone: string | null
  company_address: string | null
  company_website: string | null
  tax_number: string | null
  tax_label: string | null
  default_tax_rate: number | null
  currency_code: string
  logo_url: string | null
}

export function QuotePrintPage() {
  const { id } = useParams<{ id: string }>()
  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [items, setItems] = useState<QuoteItem[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('quotes').select('*, contacts(name, email, phone, address)').eq('id', id).single(),
      supabase.from('quote_items').select('*').eq('quote_id', id),
      supabase.from('settings').select('*').single(),
    ]).then(([{ data: q }, { data: lineItems }, { data: cfg }]) => {
      setQuote(q as QuoteDetail)
      setItems(lineItems ?? [])
      setSettings(cfg as Settings)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: '#64748b' }}>Loading quote…</p>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: '#ef4444' }}>Quote not found.</p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { box-shadow: none !important; }
        }
        body { background: #f1f5f9; }
        @page { size: A4; margin: 0; }
      `}</style>

      {/* Toolbar */}
      <div
        className="no-print fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-6 py-3"
        style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}
      >
        <Link to="/quotes" className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#64748b' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Quotes
        </Link>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#4f46e5', color: 'white' }}
        >
          <Printer className="w-4 h-4" /> Download / Print PDF
        </button>
      </div>

      <div className="no-print pt-16" />
      <div
        className="print-page mx-auto my-8"
        style={{
          width: '210mm',
          minHeight: '297mm',
          background: 'white',
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          padding: '20mm 18mm',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '13px',
          color: '#1e293b',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10mm' }}>
          <div>
            {settings?.logo_url && (
              <img
                src={settings.logo_url}
                alt="Company logo"
                style={{ maxHeight: '56px', maxWidth: '180px', objectFit: 'contain', marginBottom: '8px', display: 'block' }}
              />
            )}
            <p style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: '#1e1b4b' }}>
              {settings?.company_name ?? 'My Company'}
            </p>
            {settings?.company_address && (
              <p style={{ whiteSpace: 'pre-line', color: '#475569', fontSize: '12px', lineHeight: '1.6' }}>
                {settings.company_address}
              </p>
            )}
            {settings?.company_phone && <p style={{ color: '#475569', fontSize: '12px' }}>{settings.company_phone}</p>}
            {settings?.company_email && <p style={{ color: '#475569', fontSize: '12px' }}>{settings.company_email}</p>}
            {settings?.tax_number && (
              <p style={{ color: '#475569', fontSize: '12px', marginTop: '4px' }}>TPIN: {settings.tax_number}</p>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '28px', fontWeight: 800, color: '#059669', letterSpacing: '-0.5px' }}>
              QUOTATION
            </p>
            <p style={{ fontWeight: 700, fontSize: '15px', marginTop: '6px' }}>{quote.number}</p>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
              <p>Issue date: <span style={{ color: '#1e293b', fontWeight: 500 }}>{formatDate(quote.issue_date)}</span></p>
              {quote.expiry_date && (
                <p>Valid until: <span style={{ color: '#dc2626', fontWeight: 500 }}>{formatDate(quote.expiry_date)}</span></p>
              )}
              <p style={{ marginTop: '6px' }}>
                Status:{' '}
                <span style={{
                  fontWeight: 600,
                  color: quote.status === 'accepted' ? '#16a34a' : quote.status === 'declined' ? '#dc2626' : '#4f46e5',
                  textTransform: 'capitalize',
                }}>
                  {quote.status}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Quote To */}
        <div style={{ marginBottom: '8mm', padding: '5mm 6mm', background: '#f0fdf4', borderRadius: '6px', borderLeft: '3px solid #059669' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '6px' }}>
            Quotation For
          </p>
          <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{quote.contacts?.name ?? '—'}</p>
          {quote.contacts?.address && (
            <p style={{ whiteSpace: 'pre-line', color: '#475569', fontSize: '12px', lineHeight: '1.6' }}>
              {quote.contacts.address}
            </p>
          )}
          {quote.contacts?.phone && <p style={{ color: '#475569', fontSize: '12px' }}>{quote.contacts.phone}</p>}
          {quote.contacts?.email && <p style={{ color: '#475569', fontSize: '12px' }}>{quote.contacts.email}</p>}
        </div>

        {/* Line items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm' }}>
          <thead>
            <tr style={{ background: '#064e3b', color: 'white' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Description</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', width: '60px' }}>Qty</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', width: '90px' }}>Unit Price</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', width: '60px' }}>Tax %</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', width: '90px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>{item.description}</td>
                <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</td>
                <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.unit_price)}</td>
                <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontSize: '13px' }}>{item.tax_rate}%</td>
                <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8mm' }}>
          <div style={{ width: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>Subtotal</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(quote.subtotal)}</span>
            </div>
            {quote.tax_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{settings?.tax_label ?? 'VAT'} ({settings?.default_tax_rate ?? 16}%)</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(quote.tax_amount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '2px solid #064e3b', fontSize: '15px', fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(quote.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6mm' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '6px' }}>
              Notes
            </p>
            <p style={{ fontSize: '12px', color: '#475569', whiteSpace: 'pre-line', lineHeight: '1.7' }}>
              {quote.notes}
            </p>
          </div>
        )}

        {/* Signature */}
        <div style={{ display: 'flex', gap: '20mm', marginTop: '8mm', paddingTop: '6mm', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '12px' }}>
              Authorised Signature
            </p>
            <div style={{ borderBottom: '1.5px solid #cbd5e1', width: '180px', height: '50px' }} />
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>{settings?.company_name}</p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '12px' }}>
              Customer Acceptance
            </p>
            <div style={{ borderBottom: '1.5px solid #cbd5e1', width: '180px', height: '50px' }} />
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>Name, Signature &amp; Date</p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '8mm', paddingTop: '6mm', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
          {settings?.company_name} · {settings?.company_email ?? ''} · {settings?.company_phone ?? ''}
        </div>
      </div>
    </>
  )
}
