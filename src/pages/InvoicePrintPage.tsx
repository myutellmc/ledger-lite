import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Printer, ArrowLeft, Download } from 'lucide-react'

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  amount: number
}

interface InvoiceDetail {
  id: string
  number: string
  issue_date: string
  due_date: string
  status: string
  subtotal: number
  tax_amount: number
  total: number
  amount_paid: number
  mark_id: string | null
  notes: string | null
  signature_url: string | null
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
  invoice_notes: string | null
  logo_url: string | null
}

export function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('invoices').select('*, contacts(name, email, phone, address)').eq('id', id).single(),
      supabase.from('invoice_items').select('*').eq('invoice_id', id),
      supabase.from('settings').select('*').single(),
    ]).then(([{ data: inv }, { data: lineItems }, { data: cfg }]) => {
      setInvoice(inv as InvoiceDetail)
      setItems(lineItems ?? [])
      setSettings(cfg as Settings)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: '#64748b' }}>Loading invoice…</p>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: '#ef4444' }}>Invoice not found.</p>
      </div>
    )
  }

  const balanceDue = invoice.total - (invoice.amount_paid ?? 0)

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { box-shadow: none !important; }
        }
        body { background: #f1f5f9; }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div
        className="no-print fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-6 py-3"
        style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}
      >
        <Link
          to="/invoices"
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: '#64748b' }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#4f46e5', color: 'white' }}
        >
          <Download className="w-4 h-4" /> Download PDF
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'white', border: '1px solid #e2e8f0', color: '#475569' }}
        >
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>

      {/* A4 page */}
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
        {/* Header: company left, invoice details right */}
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
            {settings?.company_phone && (
              <p style={{ color: '#475569', fontSize: '12px' }}>{settings.company_phone}</p>
            )}
            {settings?.company_email && (
              <p style={{ color: '#475569', fontSize: '12px' }}>{settings.company_email}</p>
            )}
            {settings?.tax_number && (
              <p style={{ color: '#475569', fontSize: '12px', marginTop: '4px' }}>
                TPIN: {settings.tax_number}
              </p>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '28px', fontWeight: 800, color: '#4f46e5', letterSpacing: '-0.5px' }}>
              INVOICE
            </p>
            <p style={{ fontWeight: 700, fontSize: '15px', marginTop: '6px' }}>{invoice.number}</p>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
              <p>Issue date: <span style={{ color: '#1e293b', fontWeight: 500 }}>{formatDate(invoice.issue_date)}</span></p>
              <p>Due date: <span style={{ color: '#1e293b', fontWeight: 500 }}>{formatDate(invoice.due_date)}</span></p>
              <p style={{ marginTop: '6px' }}>
                Status:{' '}
                <span style={{
                  fontWeight: 600,
                  color: invoice.status === 'paid' ? '#16a34a' : invoice.status === 'overdue' ? '#dc2626' : '#4f46e5',
                  textTransform: 'capitalize',
                }}>
                  {invoice.status}
                </span>
              </p>
              {invoice.mark_id && (
                <div style={{ marginTop: '8px', padding: '6px 8px', background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: '4px' }}>
                  <p style={{ fontSize: '10px', color: '#92400e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ZRA Mark ID</p>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#78350f', fontFamily: 'monospace', marginTop: '2px' }}>{invoice.mark_id}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div style={{ marginBottom: '8mm', padding: '5mm 6mm', background: '#f8fafc', borderRadius: '6px', borderLeft: '3px solid #4f46e5' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '6px' }}>
            Bill To
          </p>
          <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{invoice.contacts?.name ?? '—'}</p>
          {invoice.contacts?.address && (
            <p style={{ whiteSpace: 'pre-line', color: '#475569', fontSize: '12px', lineHeight: '1.6' }}>
              {invoice.contacts.address}
            </p>
          )}
          {invoice.contacts?.phone && <p style={{ color: '#475569', fontSize: '12px' }}>{invoice.contacts.phone}</p>}
          {invoice.contacts?.email && <p style={{ color: '#475569', fontSize: '12px' }}>{invoice.contacts.email}</p>}
        </div>

        {/* Line items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm' }}>
          <thead>
            <tr style={{ background: '#1e1b4b', color: 'white' }}>
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
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.tax_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{settings?.tax_label ?? 'VAT'} ({settings?.default_tax_rate ?? 16}%)</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '2px solid #1e1b4b', fontSize: '15px', fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ color: '#4f46e5', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(invoice.total)}</span>
            </div>
            {(invoice.amount_paid ?? 0) > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Amount Paid</span>
                  <span style={{ color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>({formatCurrency(invoice.amount_paid)})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '15px', fontWeight: 700, borderTop: '1px solid #e2e8f0' }}>
                  <span>Balance Due</span>
                  <span style={{ color: balanceDue > 0 ? '#dc2626' : '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(balanceDue)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        {(invoice.notes || settings?.invoice_notes) && (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6mm' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '6px' }}>
              Notes
            </p>
            <p style={{ fontSize: '12px', color: '#475569', whiteSpace: 'pre-line', lineHeight: '1.7' }}>
              {invoice.notes ?? settings?.invoice_notes}
            </p>
          </div>
        )}

        {/* Signature */}
        <div style={{ display: 'flex', gap: '20mm', marginTop: '8mm', paddingTop: '6mm', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '12px' }}>
              Authorised Signature
            </p>
            {invoice.signature_url ? (
              <img src={invoice.signature_url} alt="Signature" style={{ maxHeight: '50px', maxWidth: '200px', objectFit: 'contain' }} />
            ) : (
              <div style={{ borderBottom: '1.5px solid #cbd5e1', width: '180px', height: '50px' }} />
            )}
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>{settings?.company_name}</p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '12px' }}>
              Received By
            </p>
            <div style={{ borderBottom: '1.5px solid #cbd5e1', width: '180px', height: '50px' }} />
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>Name &amp; Date</p>
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
