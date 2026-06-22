import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Download, Printer, ArrowLeft, CheckCircle } from 'lucide-react'

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  amount: number
}

interface ReceiptData {
  id: string
  number: string
  receipt_number: string | null
  receipt_issued_at: string | null
  issue_date: string
  due_date: string
  status: string
  subtotal: number
  tax_amount: number
  total: number
  amount_paid: number
  paid_at: string | null
  notes: string | null
  contacts: {
    name: string
    email: string | null
    phone: string | null
    address: string | null
  } | null
}

interface PaymentRecord {
  date: string
  amount: number
  payment_method: string | null
  transaction_id: string | null
  notes: string | null
  accounts: { name: string } | null
}

interface Settings {
  company_name: string
  company_email: string | null
  company_phone: string | null
  company_address: string | null
  tax_number: string | null
  tax_label: string | null
  default_tax_rate: number | null
  logo_url: string | null
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
}

export function ReceiptPrintPage() {
  const { id } = useParams<{ id: string }>()
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('invoices').select('*, contacts(name, email, phone, address)').eq('id', id).single(),
      supabase.from('invoice_items').select('*').eq('invoice_id', id),
      supabase.from('payments').select('*, accounts(name)').eq('invoice_id', id).order('date'),
      supabase.from('settings').select('*').single(),
    ]).then(([{ data: inv }, { data: lineItems }, { data: pmts }, { data: cfg }]) => {
      setReceipt(inv as ReceiptData)
      setItems(lineItems ?? [])
      setPayments(pmts ?? [])
      setSettings(cfg as Settings)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p style={{ color: '#64748b' }}>Loading receipt…</p></div>
  if (!receipt || receipt.status !== 'paid') return (
    <div className="min-h-screen flex items-center justify-center">
      <p style={{ color: '#ef4444' }}>Receipt not available — invoice must be fully paid.</p>
    </div>
  )

  const primaryPayment = payments[0]

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { box-shadow: none !important; margin: 0 auto !important; min-height: unset !important; }
        }
        body { background: #f1f5f9; }
        @page { size: A4; margin: 0; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-6 py-3" style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <Link to="/receipts" className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#64748b' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Receipts
        </Link>
        <div className="flex-1" />
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#16a34a', color: 'white' }}>
          <Download className="w-4 h-4" /> Download PDF
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'white', border: '1px solid #e2e8f0', color: '#475569' }}>
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>
      <div className="no-print pt-16" />

      {/* A4 page */}
      <div className="print-page mx-auto my-8" style={{ width: '210mm', background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: '20mm 18mm', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '13px', color: '#1e293b', position: 'relative' }}>

        {/* PAID diagonal watermark — sits above all content via high z-index + low opacity */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
          <div style={{ transform: 'rotate(-35deg)', opacity: 0.09, border: '10px solid #16a34a', borderRadius: '12px', padding: '8px 28px', fontSize: '96px', fontWeight: 900, color: '#16a34a', letterSpacing: '12px', whiteSpace: 'nowrap' }}>PAID</div>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10mm', position: 'relative', zIndex: 1 }}>
          <div>
            {settings?.logo_url && (
              <img src={settings.logo_url} alt="Company logo" style={{ maxHeight: '80px', maxWidth: '220px', objectFit: 'contain', marginBottom: '10px', display: 'block' }} />
            )}
            <p style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: '#1e1b4b' }}>{settings?.company_name}</p>
            {settings?.company_address && <p style={{ whiteSpace: 'pre-line', color: '#475569', fontSize: '12px', lineHeight: '1.6' }}>{settings.company_address}</p>}
            {settings?.company_phone && <p style={{ color: '#475569', fontSize: '12px' }}>{settings.company_phone}</p>}
            {settings?.company_email && <p style={{ color: '#475569', fontSize: '12px' }}>{settings.company_email}</p>}
            {settings?.tax_number && <p style={{ color: '#475569', fontSize: '12px', marginTop: '4px' }}>TPIN: {settings.tax_number}</p>}
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a', letterSpacing: '-0.5px' }}>RECEIPT</p>
            <p style={{ fontWeight: 700, fontSize: '15px', marginTop: '6px' }}>{receipt.receipt_number ?? receipt.number}</p>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
              <p>Invoice: <span style={{ color: '#1e293b', fontWeight: 500 }}>{receipt.number}</span></p>
              <p>Date Paid: <span style={{ color: '#1e293b', fontWeight: 500 }}>{formatDate(primaryPayment?.date ?? receipt.receipt_issued_at ?? receipt.issue_date)}</span></p>
              {primaryPayment?.payment_method && (
                <p>Method: <span style={{ color: '#1e293b', fontWeight: 500 }}>{METHOD_LABEL[primaryPayment.payment_method] ?? primaryPayment.payment_method}</span></p>
              )}
              {primaryPayment?.transaction_id && (
                <p>Ref: <span style={{ color: '#1e293b', fontWeight: 500, fontFamily: 'monospace' }}>{primaryPayment.transaction_id}</span></p>
              )}
            </div>
          </div>
        </div>

        {/* Received From */}
        <div style={{ marginBottom: '8mm', padding: '5mm 6mm', background: '#f0fdf4', borderRadius: '6px', borderLeft: '3px solid #16a34a', position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '6px' }}>Received From</p>
          <p style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{receipt.contacts?.name ?? '—'}</p>
          {receipt.contacts?.address && <p style={{ whiteSpace: 'pre-line', color: '#475569', fontSize: '12px', lineHeight: '1.6' }}>{receipt.contacts.address}</p>}
          {receipt.contacts?.phone && <p style={{ color: '#475569', fontSize: '12px' }}>{receipt.contacts.phone}</p>}
          {receipt.contacts?.email && <p style={{ color: '#475569', fontSize: '12px' }}>{receipt.contacts.email}</p>}
        </div>

        {/* Line items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm', position: 'relative', zIndex: 1 }}>
          <thead>
            <tr style={{ background: '#166534', color: 'white' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', width: '60px' }}>Qty</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', width: '90px' }}>Unit Price</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', width: '90px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? 'white' : '#f0fdf4' }}>
                <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0' }}>{item.description}</td>
                <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</td>
                <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.unit_price)}</td>
                <td style={{ padding: '9px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8mm', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>Subtotal</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(receipt.subtotal)}</span>
            </div>
            {receipt.tax_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>{settings?.tax_label ?? 'VAT'} ({settings?.default_tax_rate ?? 16}%)</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(receipt.tax_amount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '2px solid #166534', fontSize: '15px', fontWeight: 700 }}>
              <span>Total</span><span style={{ color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(receipt.total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, background: '#f0fdf4', marginTop: '4px', padding: '10px 8px', borderRadius: '6px', border: '1.5px solid #86efac' }}>
              <span style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle style={{ width: '16px', height: '16px' }} /> PAID IN FULL
              </span>
              <span style={{ color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(receipt.amount_paid || receipt.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment details */}
        {payments.length > 0 && (
          <div style={{ marginBottom: '8mm', padding: '5mm 6mm', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '8px' }}>Payment Details</p>
            {payments.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderTop: i > 0 ? '1px solid #e2e8f0' : 'none' }}>
                <span style={{ color: '#475569' }}>
                  {formatDate(p.date)} · {METHOD_LABEL[p.payment_method ?? ''] ?? p.payment_method ?? 'Payment'}
                  {p.transaction_id && <span style={{ fontFamily: 'monospace', marginLeft: '6px', color: '#64748b' }}>Ref: {p.transaction_id}</span>}
                  {p.accounts?.name && <span style={{ marginLeft: '6px', color: '#94a3b8' }}>({p.accounts.name})</span>}
                </span>
                <span style={{ fontWeight: 600, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {receipt.notes && (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '6mm' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '6px' }}>Notes</p>
            <p style={{ fontSize: '12px', color: '#475569', whiteSpace: 'pre-line', lineHeight: '1.7' }}>{receipt.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '8mm', paddingTop: '6mm', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '11px', color: '#94a3b8', position: 'relative', zIndex: 1 }}>
          Thank you for your payment · {settings?.company_name} · {settings?.company_email ?? ''} · {settings?.company_phone ?? ''}
        </div>
      </div>
    </>
  )
}
