import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, TableHead, TableBody, DataRow, Th, Td, EmptyState } from '@/components/ui/TableRow'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Search, Printer, PenLine, FileCheck, Package, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { InvoiceStatus } from '@/lib/database.types'
import { SignatureModal } from '@/components/ui/SignatureModal'
import { RecordPaymentModal } from '@/components/ui/RecordPaymentModal'
import { useToast } from '@/components/ui/Toast'

interface Invoice {
  id: string
  number: string
  contact_id: string
  issue_date: string
  due_date: string
  status: InvoiceStatus
  total: number
  amount_paid: number
  mark_id: string | null
  signature_url: string | null
  contacts: { name: string } | null
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function InvoicesPage() {
  const { isAccountant, user } = useAuth()
  const toast = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingMarkId, setEditingMarkId] = useState<string | null>(null)
  const [markIdInput, setMarkIdInput] = useState('')
  const [signingInvoiceId, setSigningInvoiceId] = useState<string | null>(null)
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null)
  const [bankAccounts, setBankAccounts] = useState<{ id: string; name: string }[]>([])
  const [taxEnabled, setTaxEnabled] = useState(true)
  const [taxSettings, setTaxSettings] = useState<{ tax_label: string; default_tax_rate: number }>({ tax_label: 'VAT', default_tax_rate: 16 })
  const [products, setProducts] = useState<{ id: string; name: string; sku: string | null; selling_price: number; stock_qty: number; unit: string; unit_cost: number }[]>([])
  const [pickerRow, setPickerRow] = useState<number | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [form, setForm] = useState({
    contact_id: '', issue_date: new Date().toISOString().split('T')[0], due_date: '', notes: '',
    items: [{ description: '', quantity: 1, unit_price: 0, product_id: null as string | null }],
  })

  async function load() {
    const { data } = await supabase.from('invoices').select('*, contacts(name)').order('created_at', { ascending: false })
    setInvoices(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('contacts').select('id, name').then(({ data }) => setContacts(data ?? []))
    supabase.from('accounts').select('id, name').eq('type', 'asset').then(({ data }) => setBankAccounts(data ?? []))
    supabase.from('settings').select('tax_label, default_tax_rate').single().then(({ data }) => { if (data) setTaxSettings(data as { tax_label: string; default_tax_rate: number }) })
    supabase.from('products').select('id, name, sku, selling_price, unit_cost, stock_qty, unit').eq('is_active', true).order('name').then(({ data }) => setProducts(data ?? []))
  }, [])

  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const effectiveTaxRate = taxEnabled ? taxSettings.default_tax_rate : 0
  const taxAmount = subtotal * effectiveTaxRate / 100

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const { data: inv } = await supabase.from('invoices').insert({
      contact_id: form.contact_id, issue_date: form.issue_date, due_date: form.due_date,
      status: 'draft', subtotal, tax_amount: taxAmount, total: subtotal + taxAmount,
      tax_enabled: taxEnabled,
      notes: form.notes || null, created_by: user.id,
    }).select().single()
    if (inv) {
      const invId = (inv as { id: string; number: string }).id
      const invNumber = (inv as { id: string; number: string }).number
      await supabase.from('invoice_items').insert(
        form.items.map(item => ({ invoice_id: invId, description: item.description, quantity: item.quantity, unit_price: item.unit_price, tax_rate: effectiveTaxRate, amount: item.quantity * item.unit_price, product_id: item.product_id ?? null }))
      )
      // Deduct stock for any inventory-linked items
      const stockItems = form.items.filter(item => item.product_id)
      if (stockItems.length > 0) {
        await supabase.from('stock_movements').insert(
          stockItems.map(item => ({
            product_id: item.product_id,
            movement_type: 'sale',
            qty: -item.quantity,
            unit_cost: products.find(p => p.id === item.product_id)?.unit_cost ?? null,
            reference: invNumber,
            invoice_id: invId,
            notes: `Invoice ${invNumber}`,
            created_by: user?.id,
          }))
        )
      }
    }
    setSaving(false)
    setShowForm(false)
    setTaxEnabled(true)
    setPickerRow(null)
    setForm({ contact_id: '', issue_date: new Date().toISOString().split('T')[0], due_date: '', notes: '', items: [{ description: '', quantity: 1, unit_price: 0, product_id: null }] })
    load()
  }

  async function updateStatus(id: string, status: InvoiceStatus) {
    await supabase.from('invoices').update({ status }).eq('id', id)
    load()
  }

  async function saveMarkId(id: string) {
    await supabase.from('invoices').update({ mark_id: markIdInput.trim() || null }).eq('id', id)
    setEditingMarkId(null)
    load()
  }

  async function saveSignature(dataUrl: string) {
    if (!signingInvoiceId) return
    const { error } = await supabase.from('invoices').update({ signature_url: dataUrl }).eq('id', signingInvoiceId)
    if (error) toast.error('Signature save failed', error.message)
    else toast.success('Signature applied to invoice')
    setSigningInvoiceId(null)
    load()
  }

  const filtered = invoices
    .filter(i => !statusFilter || i.status === statusFilter)
    .filter(i => !search || i.number.toLowerCase().includes(search.toLowerCase()) || i.contacts?.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
    <div>
      <PageHeader
        title="Invoices"
        description="Manage customer invoices and track payments"
        actions={isAccountant && (
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-3.5 h-3.5" /> New Invoice
          </Button>
        )}
      />

      <div className="p-8 space-y-5">
        {showForm && (
          <Card>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>New Invoice</h3>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <Select label="Customer" value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))} options={contacts.map(c => ({ value: c.id, label: c.name }))} placeholder="Select customer" required />
                <Input label="Issue Date" type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} required />
                <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required />
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
                      <input className="col-span-5 text-sm bg-transparent border-0 outline-none" placeholder="Description of service or product" value={item.description} onChange={e => { const items = [...form.items]; items[i] = { ...items[i], description: e.target.value }; setForm(f => ({ ...f, items })) }} required />
                      <input className="col-span-2 text-sm text-right bg-transparent border-0 outline-none" type="number" min="1" value={item.quantity} onChange={e => { const items = [...form.items]; items[i] = { ...items[i], quantity: +e.target.value }; setForm(f => ({ ...f, items })) }} />
                      <input className="col-span-2 text-sm text-right bg-transparent border-0 outline-none" type="number" min="0" step="0.01" value={item.unit_price} onChange={e => { const items = [...form.items]; items[i] = { ...items[i], unit_price: +e.target.value }; setForm(f => ({ ...f, items })) }} />
                      <span className="col-span-1 text-sm text-right font-medium" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.quantity * item.unit_price)}</span>
                      <button type="button" className="col-span-1 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity" onClick={() => { if (form.items.length === 1) return; const items = form.items.filter((_, j) => j !== i); setForm(f => ({ ...f, items })) }}>
                        <X className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3 text-sm" style={{ borderTop: '1px solid var(--border-default)', background: '#f8fafc' }}>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        className="relative w-9 h-5 rounded-full transition-colors"
                        style={{ background: taxEnabled ? '#16a34a' : '#cbd5e1' }}
                        onClick={() => setTaxEnabled(t => !t)}
                      >
                        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: taxEnabled ? 'translateX(18px)' : 'translateX(2px)' }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: taxEnabled ? '#16a34a' : 'var(--text-muted)' }}>
                        {taxSettings.tax_label} ({taxSettings.default_tax_rate}%)
                      </span>
                    </label>
                    <div className="flex gap-6">
                      <span style={{ color: 'var(--text-muted)' }}>Subtotal <span className="font-semibold ml-2" style={{ color: 'var(--text-primary)' }}>{formatCurrency(subtotal)}</span></span>
                      {taxEnabled && <span style={{ color: 'var(--text-muted)' }}>{taxSettings.tax_label} <span className="font-semibold ml-2" style={{ color: 'var(--text-primary)' }}>{formatCurrency(taxAmount)}</span></span>}
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Total {formatCurrency(subtotal + taxAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Input label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes for the customer..." />

              <div className="flex gap-2">
                <Button type="submit" loading={saving}>Save Invoice</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        {/* Filters */}
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
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} {filtered.length === 1 ? 'invoice' : 'invoices'}
          </span>
        </div>

        <Card>
          <DataTable>
            <TableHead>
              <Th>Number</Th>
              <Th>Customer</Th>
              <Th>Issued</Th>
              <Th>Due</Th>
              <Th right>Total</Th>
              <Th right>Balance Due</Th>
              <Th>Status</Th>
              <Th>Mark ID</Th>
              <Th></Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading invoices...</td></tr>
              ) : filtered.length === 0 ? (
                <EmptyState title="No invoices found" description="Create your first invoice using the button above" />
              ) : filtered.map(inv => {
                const balanceDue = inv.total - (inv.amount_paid ?? 0)
                return (
                <DataRow key={inv.id}>
                  <Td mono className="font-medium" style={{ color: 'var(--text-primary)' }}>{inv.number}</Td>
                  <Td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{inv.contacts?.name}</Td>
                  <Td>{formatDate(inv.issue_date)}</Td>
                  <Td>{formatDate(inv.due_date)}</Td>
                  <Td right mono style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(inv.total)}</Td>
                  <Td right mono style={{ color: balanceDue > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                    {inv.status === 'paid' ? <span style={{ color: '#16a34a' }}>Paid</span> : formatCurrency(balanceDue)}
                  </Td>
                  <Td><Badge {...statusBadge(inv.status)}>{inv.status}</Badge></Td>
                  <Td>
                    {editingMarkId === inv.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          className="h-7 px-2 rounded text-xs w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          style={{ border: '1px solid var(--border-default)', background: 'white', fontFamily: 'monospace' }}
                          placeholder="e.g. ZRA-MRK-0001"
                          value={markIdInput}
                          onChange={e => setMarkIdInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveMarkId(inv.id); if (e.key === 'Escape') setEditingMarkId(null) }}
                        />
                        <button className="text-xs font-medium px-1.5 py-1 rounded hover:bg-emerald-50" style={{ color: '#16a34a' }} onClick={() => saveMarkId(inv.id)}>✓</button>
                        <button className="text-xs px-1.5 py-1 rounded hover:bg-slate-100" style={{ color: '#94a3b8' }} onClick={() => setEditingMarkId(null)}>✕</button>
                      </div>
                    ) : inv.mark_id ? (
                      <button
                        className="text-xs font-mono px-2 py-1 rounded hover:bg-indigo-50 text-left"
                        style={{ color: '#4f46e5', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                        title={`Mark ID: ${inv.mark_id} — click to edit`}
                        onClick={() => { setEditingMarkId(inv.id); setMarkIdInput(inv.mark_id ?? '') }}
                      >{inv.mark_id}</button>
                    ) : (
                      <button
                        className="text-xs px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                        style={{ color: '#ea580c', border: '1px dashed #fed7aa' }}
                        onClick={() => { setEditingMarkId(inv.id); setMarkIdInput('') }}
                      >Set Mark ID</button>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      {isAccountant && inv.status === 'draft' && (
                        <button className="text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-indigo-50" style={{ color: '#4f46e5' }} onClick={() => updateStatus(inv.id, 'sent')}>Mark sent</button>
                      )}
                      {isAccountant && inv.status === 'sent' && (
                        <button className="text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-emerald-50" style={{ color: '#16a34a' }} onClick={() => setPayingInvoice(inv)}>Mark paid</button>
                      )}
                      {inv.status === 'paid' && (
                        <Link to={`/invoices/${inv.id}/receipt`} target="_blank" className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-emerald-50" style={{ color: '#16a34a' }}>
                          <FileCheck className="w-3 h-3" /> Receipt
                        </Link>
                      )}
                      {isAccountant && (
                        <button
                          className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-violet-50"
                          style={{ color: inv.signature_url ? '#7c3aed' : '#94a3b8' }}
                          title={inv.signature_url ? 'Re-sign' : 'Add e-signature'}
                          onClick={() => setSigningInvoiceId(inv.id)}
                        >
                          <PenLine className="w-3 h-3" />
                          {inv.signature_url ? 'Signed' : 'Sign'}
                        </button>
                      )}
                      <Link
                        to={`/invoices/${inv.id}/print`}
                        target="_blank"
                        className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-slate-50"
                        style={{ color: '#64748b' }}
                      >
                        <Printer className="w-3 h-3" /> Print
                      </Link>
                    </div>
                  </Td>
                </DataRow>
                )
              })}
            </TableBody>
          </DataTable>
        </Card>
      </div>
    </div>

    {signingInvoiceId && (
      <SignatureModal
        title="Sign Invoice"
        onConfirm={saveSignature}
        onClose={() => setSigningInvoiceId(null)}
      />
    )}
    {payingInvoice && (
      <RecordPaymentModal
        invoiceId={payingInvoice.id}
        invoiceNumber={payingInvoice.number}
        customerName={payingInvoice.contacts?.name ?? ''}
        balanceDue={payingInvoice.total - (payingInvoice.amount_paid ?? 0)}
        bankAccounts={bankAccounts}
        onPaid={() => { setPayingInvoice(null); load() }}
        onClose={() => setPayingInvoice(null)}
      />
    )}
    </>
  )
}
