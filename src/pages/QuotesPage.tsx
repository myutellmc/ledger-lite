import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, TableHead, TableBody, DataRow, Th, Td, EmptyState } from '@/components/ui/TableRow'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { SendQuoteModal } from '@/components/ui/SendQuoteModal'
import { Plus, Search, FileText, Printer, Package, X } from 'lucide-react'

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'invoiced'

interface Quote {
  id: string
  number: string
  contact_id: string
  issue_date: string
  expiry_date: string | null
  status: QuoteStatus
  total: number
  invoice_id: string | null
  customer_token: string
  customer_email: string | null
  contacts: { name: string; email: string | null } | null
}

interface Settings {
  company_name: string
  tax_label: string
  default_tax_rate: number
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
  { value: 'invoiced', label: 'Invoiced' },
]

const QUOTE_STATUS_BADGE: Record<QuoteStatus, { variant: 'neutral' | 'info' | 'success' | 'danger' | 'warning' | 'default' }> = {
  draft: { variant: 'neutral' },
  sent: { variant: 'info' },
  accepted: { variant: 'success' },
  declined: { variant: 'danger' },
  expired: { variant: 'warning' },
  invoiced: { variant: 'default' },
}

export function QuotesPage() {
  const { isAccountant, user } = useAuth()
  const toast = useToast()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [contacts, setContacts] = useState<{ id: string; name: string; email: string | null }[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState<string | null>(null)
  const [sendingQuote, setSendingQuote] = useState<Quote | null>(null)
  const [taxEnabled, setTaxEnabled] = useState(true)
  const [products, setProducts] = useState<{ id: string; name: string; sku: string | null; selling_price: number; stock_qty: number; unit: string }[]>([])
  const [pickerRow, setPickerRow] = useState<number | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [form, setForm] = useState({
    contact_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    notes: '',
    items: [{ description: '', quantity: 1, unit_price: 0, product_id: null as string | null }],
  })

  async function load() {
    const { data } = await supabase
      .from('quotes')
      .select('*, contacts(name, email)')
      .order('created_at', { ascending: false })
    setQuotes(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('contacts').select('id, name, email').then(({ data }) => setContacts(data ?? []))
    supabase.from('products').select('id, name, sku, selling_price, stock_qty, unit').eq('is_active', true).order('name').then(({ data }) => setProducts(data ?? []))
    supabase.from('settings').select('company_name, tax_label, default_tax_rate').single().then(({ data }) => {
      if (data) {
        setSettings(data as Settings)
        setTaxEnabled(true)
      }
    })
  }, [])

  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const effectiveTaxRate = taxEnabled ? (settings?.default_tax_rate ?? 16) : 0
  const taxAmount = subtotal * effectiveTaxRate / 100

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const { data: quote } = await supabase.from('quotes').insert({
      contact_id: form.contact_id,
      issue_date: form.issue_date,
      expiry_date: form.expiry_date || null,
      status: 'draft',
      subtotal,
      tax_amount: taxAmount,
      total: subtotal + taxAmount,
      tax_enabled: taxEnabled,
      notes: form.notes || null,
      created_by: user.id,
    }).select().single()
    if (quote) {
      await supabase.from('quote_items').insert(
        form.items.map(item => ({
          quote_id: (quote as { id: string }).id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: effectiveTaxRate,
          amount: item.quantity * item.unit_price,
          product_id: item.product_id ?? null,
        }))
      )
      toast.success('Quote saved', `${(quote as { number: string }).number} created as draft`)
    }
    setSaving(false)
    setShowForm(false)
    setForm({ contact_id: '', issue_date: new Date().toISOString().split('T')[0], expiry_date: '', notes: '', items: [{ description: '', quantity: 1, unit_price: 0, product_id: null }] })
    setTaxEnabled(true)
    setPickerRow(null)
    load()
  }

  async function updateStatus(id: string, status: QuoteStatus) {
    await supabase.from('quotes').update({ status }).eq('id', id)
    load()
  }

  async function convertToInvoice(quote: Quote) {
    if (!user || quote.invoice_id) return
    setConverting(quote.id)
    const { data: items } = await supabase.from('quote_items').select('*').eq('quote_id', quote.id)
    const { data: invoice } = await supabase.from('invoices').insert({
      contact_id: quote.contact_id,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'draft',
      subtotal: quote.total - (quote as unknown as { tax_amount: number }).tax_amount,
      tax_amount: (quote as unknown as { tax_amount: number }).tax_amount,
      total: quote.total,
      tax_enabled: (quote as unknown as { tax_enabled: boolean }).tax_enabled ?? true,
      notes: null,
      created_by: user.id,
    }).select().single()
    if (invoice && items) {
      await supabase.from('invoice_items').insert(
        items.map((item: { description: string; quantity: number; unit_price: number; tax_rate: number; amount: number }) => ({
          invoice_id: (invoice as { id: string }).id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          amount: item.amount,
        }))
      )
      await supabase.from('quotes').update({ status: 'invoiced', invoice_id: (invoice as { id: string }).id }).eq('id', quote.id)
      toast.success('Invoice created', 'Quote converted to draft invoice')
    }
    setConverting(null)
    load()
  }

  const filtered = quotes
    .filter(q => !statusFilter || q.status === statusFilter)
    .filter(q => !search || q.number.toLowerCase().includes(search.toLowerCase()) || q.contacts?.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
    <div>
      <PageHeader
        title="Quotes"
        description="Create and send quotes to customers, then convert to invoices"
        actions={isAccountant && (
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-3.5 h-3.5" /> New Quote
          </Button>
        )}
      />

      <div className="p-8 space-y-5">
        {showForm && (
          <Card>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>New Quote</h3>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <Select label="Customer" value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))} options={contacts.map(c => ({ value: c.id, label: c.name }))} placeholder="Select customer" required />
                <Input label="Issue Date" type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} required />
                <Input label="Expiry Date" type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Line Items</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price: 0, product_id: null }] }))}>
                    <Plus className="w-3.5 h-3.5" /> Add line
                  </Button>
                </div>
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                  <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ background: '#f8fafc', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                    <span className="col-span-1"></span><span className="col-span-5">Description</span><span className="col-span-2 text-right">Qty</span><span className="col-span-2 text-right">Unit price</span><span className="col-span-1 text-right">Amount</span><span className="col-span-1"></span>
                  </div>
                  {form.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2" style={{ borderTop: i > 0 ? '1px solid var(--border-light)' : 'none', position: 'relative' }}>
                      {/* Product picker button */}
                      <div className="col-span-1 flex items-center" style={{ position: 'relative' }}>
                        <button
                          type="button"
                          title="Pick from inventory"
                          onClick={() => { setPickerRow(pickerRow === i ? null : i); setPickerSearch('') }}
                          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                          style={{ background: item.product_id ? '#ede9fe' : '#f1f5f9', color: item.product_id ? '#7c3aed' : '#94a3b8', border: `1px solid ${item.product_id ? '#c4b5fd' : '#e2e8f0'}` }}
                        >
                          <Package className="w-3.5 h-3.5" />
                        </button>
                        {/* Dropdown */}
                        {pickerRow === i && (
                          <div className="absolute left-0 top-9 z-50 w-72 rounded-xl shadow-2xl overflow-hidden" style={{ background: 'white', border: '1px solid var(--border-default)' }}>
                            <div className="p-2 border-b" style={{ borderColor: 'var(--border-light)' }}>
                              <input
                                autoFocus
                                className="w-full px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                style={{ background: '#f8fafc', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                                placeholder="Search products…"
                                value={pickerSearch}
                                onChange={e => setPickerSearch(e.target.value)}
                              />
                            </div>
                            <div className="max-h-52 overflow-y-auto">
                              {products
                                .filter(p => !pickerSearch || p.name.toLowerCase().includes(pickerSearch.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(pickerSearch.toLowerCase()))
                                .map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 transition-colors border-b last:border-0"
                                    style={{ borderColor: 'var(--border-light)' }}
                                    onClick={() => {
                                      const items = [...form.items]
                                      items[i] = { ...items[i], description: p.name, unit_price: p.selling_price, product_id: p.id }
                                      setForm(f => ({ ...f, items }))
                                      setPickerRow(null)
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                                      <span className="text-xs font-semibold" style={{ color: '#2563eb' }}>{formatCurrency(p.selling_price)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {p.sku && <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{p.sku}</span>}
                                      <span className="text-xs" style={{ color: p.stock_qty <= 0 ? '#dc2626' : p.stock_qty <= 5 ? '#d97706' : '#16a34a' }}>
                                        {p.stock_qty} {p.unit} in stock
                                      </span>
                                    </div>
                                  </button>
                                ))}
                              {products.filter(p => !pickerSearch || p.name.toLowerCase().includes(pickerSearch.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(pickerSearch.toLowerCase())).length === 0 && (
                                <p className="px-3 py-4 text-xs text-center" style={{ color: 'var(--text-muted)' }}>No products found</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <input className="col-span-5 text-sm bg-transparent border-0 outline-none" style={{ color: 'var(--text-primary)' }} placeholder="Description" value={item.description} onChange={e => { const items = [...form.items]; items[i] = { ...items[i], description: e.target.value }; setForm(f => ({ ...f, items })) }} required />
                      <input className="col-span-2 text-sm text-right bg-transparent border-0 outline-none" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }} type="number" min="1" value={item.quantity} onChange={e => { const items = [...form.items]; items[i] = { ...items[i], quantity: +e.target.value }; setForm(f => ({ ...f, items })) }} />
                      <input className="col-span-2 text-sm text-right bg-transparent border-0 outline-none" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }} type="number" min="0" step="0.01" value={item.unit_price} onChange={e => { const items = [...form.items]; items[i] = { ...items[i], unit_price: +e.target.value }; setForm(f => ({ ...f, items })) }} />
                      <span className="col-span-1 text-sm text-right font-medium" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.quantity * item.unit_price)}</span>
                      <button type="button" className="col-span-1 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity" onClick={() => { if (form.items.length === 1) return; const items = form.items.filter((_, j) => j !== i); setForm(f => ({ ...f, items })) }}>
                        <X className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3 text-sm" style={{ borderTop: '1px solid var(--border-default)', background: '#f8fafc' }}>
                    {/* VAT toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        className="relative w-9 h-5 rounded-full transition-colors"
                        style={{ background: taxEnabled ? '#16a34a' : '#cbd5e1' }}
                        onClick={() => setTaxEnabled(t => !t)}
                      >
                        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: taxEnabled ? 'translateX(18px)' : 'translateX(2px)' }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: taxEnabled ? '#16a34a' : 'var(--text-muted)' }}>
                        {settings?.tax_label ?? 'VAT'} ({settings?.default_tax_rate ?? 16}%)
                      </span>
                    </label>
                    <div className="flex gap-6">
                      <span style={{ color: 'var(--text-muted)' }}>Subtotal <span className="font-semibold ml-2" style={{ color: 'var(--text-primary)' }}>{formatCurrency(subtotal)}</span></span>
                      {taxEnabled && <span style={{ color: 'var(--text-muted)' }}>{settings?.tax_label ?? 'VAT'} <span className="font-semibold ml-2" style={{ color: 'var(--text-primary)' }}>{formatCurrency(taxAmount)}</span></span>}
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Total {formatCurrency(subtotal + taxAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Input label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes for the customer..." />

              <div className="flex gap-2">
                <Button type="submit" loading={saving}>Save Quote</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              className="pl-9 pr-3 h-9 w-64 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'white', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Search by number or customer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select options={STATUS_OPTIONS} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-40 h-9" />
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} {filtered.length === 1 ? 'quote' : 'quotes'}</span>
        </div>

        <Card>
          <DataTable>
            <TableHead>
              <Th>Number</Th>
              <Th>Customer</Th>
              <Th>Issued</Th>
              <Th>Expires</Th>
              <Th right>Total</Th>
              <Th>Status</Th>
              <Th></Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading quotes...</td></tr>
              ) : filtered.length === 0 ? (
                <EmptyState title="No quotes found" description="Create your first quote using the button above" />
              ) : filtered.map(q => (
                <DataRow key={q.id}>
                  <Td mono style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{q.number}</Td>
                  <Td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{q.contacts?.name}</Td>
                  <Td>{formatDate(q.issue_date)}</Td>
                  <Td>{q.expiry_date ? formatDate(q.expiry_date) : '—'}</Td>
                  <Td right mono style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(q.total)}</Td>
                  <Td><Badge variant={QUOTE_STATUS_BADGE[q.status].variant}>{q.status}</Badge></Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/quotes/${q.id}/print`}
                        target="_blank"
                        className="p-1.5 rounded-md hover:bg-indigo-50 transition-colors"
                        title="Download / Print PDF"
                        style={{ color: '#6366f1' }}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Link>
                      {isAccountant && (q.status === 'draft' || q.status === 'sent') && (
                        <button
                          className="text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-indigo-50"
                          style={{ color: '#4f46e5' }}
                          onClick={() => setSendingQuote(q)}
                        >
                          {q.status === 'sent' ? 'Resend' : 'Send'}
                        </button>
                      )}
                      {isAccountant && q.status === 'sent' && (
                        <button className="text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-emerald-50" style={{ color: '#16a34a' }} onClick={() => updateStatus(q.id, 'accepted')}>Mark accepted</button>
                      )}
                      {isAccountant && q.status === 'accepted' && !q.invoice_id && (
                        <button
                          className="text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-blue-50 flex items-center gap-1"
                          style={{ color: '#2563eb' }}
                          onClick={() => convertToInvoice(q)}
                          disabled={converting === q.id}
                        >
                          <FileText className="w-3 h-3" />
                          {converting === q.id ? 'Converting...' : 'To Invoice'}
                        </button>
                      )}
                    </div>
                  </Td>
                </DataRow>
              ))}
            </TableBody>
          </DataTable>
        </Card>
      </div>
    </div>

    {sendingQuote && settings && (
      <SendQuoteModal
        quoteId={sendingQuote.id}
        quoteNumber={sendingQuote.number}
        customerName={sendingQuote.contacts?.name ?? ''}
        customerEmail={sendingQuote.customer_email ?? sendingQuote.contacts?.email ?? null}
        companyName={settings.company_name}
        customerToken={sendingQuote.customer_token}
        onSent={() => { setSendingQuote(null); load() }}
        onClose={() => setSendingQuote(null)}
      />
    )}
    </>
  )
}
