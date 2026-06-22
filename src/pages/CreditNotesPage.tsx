import { useEffect, useState } from 'react'
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
import { Plus, Search } from 'lucide-react'

type CreditNoteStatus = 'draft' | 'issued' | 'applied'

interface CreditNote {
  id: string
  number: string
  contact_id: string
  invoice_id: string | null
  issue_date: string
  status: CreditNoteStatus
  total: number
  reason: string | null
  contacts: { name: string } | null
  invoices: { number: string } | null
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
  { value: 'applied', label: 'Applied' },
]

const STATUS_BADGE: Record<CreditNoteStatus, { variant: 'neutral' | 'info' | 'success' | 'warning' | 'default' }> = {
  draft: { variant: 'neutral' },
  issued: { variant: 'info' },
  applied: { variant: 'success' },
}

export function CreditNotesPage() {
  const { isAccountant, user } = useAuth()
  const [notes, setNotes] = useState<CreditNote[]>([])
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([])
  const [invoices, setInvoices] = useState<{ id: string; number: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    contact_id: '',
    invoice_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    reason: '',
    items: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }],
  })

  async function load() {
    const { data } = await supabase
      .from('credit_notes')
      .select('*, contacts(name), invoices(number)')
      .order('created_at', { ascending: false })
    setNotes(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('contacts').select('id, name').then(({ data }) => setContacts(data ?? []))
    supabase.from('invoices').select('id, number').order('created_at', { ascending: false }).then(({ data }) => setInvoices(data ?? []))
  }, [])

  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxAmount = form.items.reduce((s, i) => s + i.quantity * i.unit_price * i.tax_rate / 100, 0)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const { data: cn } = await supabase.from('credit_notes').insert({
      contact_id: form.contact_id,
      invoice_id: form.invoice_id || null,
      issue_date: form.issue_date,
      status: 'draft',
      subtotal,
      tax_amount: taxAmount,
      total: subtotal + taxAmount,
      reason: form.reason || null,
      created_by: user.id,
    }).select().single()
    if (cn) {
      await supabase.from('credit_note_items').insert(
        form.items.map(item => ({
          credit_note_id: (cn as { id: string }).id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          amount: item.quantity * item.unit_price,
        }))
      )
    }
    setSaving(false)
    setShowForm(false)
    setForm({ contact_id: '', invoice_id: '', issue_date: new Date().toISOString().split('T')[0], reason: '', items: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] })
    load()
  }

  async function updateStatus(id: string, status: CreditNoteStatus) {
    await supabase.from('credit_notes').update({ status }).eq('id', id)
    load()
  }

  const filtered = notes
    .filter(n => !statusFilter || n.status === statusFilter)
    .filter(n => !search || n.number.toLowerCase().includes(search.toLowerCase()) || n.contacts?.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <PageHeader
        title="Credit Notes"
        description="Issue credit notes to reverse or reduce invoice amounts"
        actions={isAccountant && (
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-3.5 h-3.5" /> New Credit Note
          </Button>
        )}
      />

      <div className="p-8 space-y-5">
        {showForm && (
          <Card>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>New Credit Note</h3>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <Select
                  label="Customer"
                  value={form.contact_id}
                  onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}
                  options={contacts.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Select customer"
                  required
                />
                <Input
                  label="Issue Date"
                  type="date"
                  value={form.issue_date}
                  onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
                  required
                />
                <Select
                  label="Against Invoice (optional)"
                  value={form.invoice_id}
                  onChange={e => setForm(f => ({ ...f, invoice_id: e.target.value }))}
                  options={invoices.map(i => ({ value: i.id, label: i.number }))}
                  placeholder="None (standalone)"
                />
              </div>

              <Input
                label="Reason"
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Returned goods, billing error, price adjustment…"
              />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Line Items</p>
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={() => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] }))}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add line
                  </Button>
                </div>
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                  <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ background: '#f8fafc', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                    <span className="col-span-5">Description</span>
                    <span className="col-span-2 text-right">Qty</span>
                    <span className="col-span-2 text-right">Unit price</span>
                    <span className="col-span-2 text-right">Tax %</span>
                    <span className="col-span-1 text-right">Amount</span>
                  </div>
                  {form.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-3 px-4 py-2.5" style={{ borderTop: i > 0 ? '1px solid var(--border-light)' : 'none' }}>
                      <input
                        className="col-span-5 text-sm bg-transparent border-0 outline-none"
                        style={{ color: 'var(--text-primary)' }}
                        placeholder="Description"
                        value={item.description}
                        onChange={e => { const items = [...form.items]; items[i] = { ...items[i], description: e.target.value }; setForm(f => ({ ...f, items })) }}
                        required
                      />
                      <input
                        className="col-span-2 text-sm text-right bg-transparent border-0 outline-none"
                        style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                        type="number" min="1" value={item.quantity}
                        onChange={e => { const items = [...form.items]; items[i] = { ...items[i], quantity: +e.target.value }; setForm(f => ({ ...f, items })) }}
                      />
                      <input
                        className="col-span-2 text-sm text-right bg-transparent border-0 outline-none"
                        style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                        type="number" min="0" step="0.01" value={item.unit_price}
                        onChange={e => { const items = [...form.items]; items[i] = { ...items[i], unit_price: +e.target.value }; setForm(f => ({ ...f, items })) }}
                      />
                      <input
                        className="col-span-2 text-sm text-right bg-transparent border-0 outline-none"
                        style={{ color: 'var(--text-primary)' }}
                        type="number" min="0" max="100" value={item.tax_rate}
                        onChange={e => { const items = [...form.items]; items[i] = { ...items[i], tax_rate: +e.target.value }; setForm(f => ({ ...f, items })) }}
                      />
                      <span className="col-span-1 text-sm text-right font-medium" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(item.quantity * item.unit_price)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-end gap-6 px-4 py-3 text-sm" style={{ borderTop: '1px solid var(--border-default)', background: '#f8fafc' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal <span className="font-semibold ml-2" style={{ color: 'var(--text-primary)' }}>{formatCurrency(subtotal)}</span></span>
                    <span style={{ color: 'var(--text-muted)' }}>Tax <span className="font-semibold ml-2" style={{ color: 'var(--text-primary)' }}>{formatCurrency(taxAmount)}</span></span>
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Total {formatCurrency(subtotal + taxAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" loading={saving}>Save Credit Note</Button>
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
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} {filtered.length === 1 ? 'credit note' : 'credit notes'}
          </span>
        </div>

        <Card>
          <DataTable>
            <TableHead>
              <Th>Number</Th>
              <Th>Customer</Th>
              <Th>Against Invoice</Th>
              <Th>Issued</Th>
              <Th>Reason</Th>
              <Th right>Total</Th>
              <Th>Status</Th>
              <Th></Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading credit notes…</td></tr>
              ) : filtered.length === 0 ? (
                <EmptyState title="No credit notes" description="Issue your first credit note using the button above" />
              ) : filtered.map(n => (
                <DataRow key={n.id}>
                  <Td mono style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{n.number}</Td>
                  <Td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{n.contacts?.name}</Td>
                  <Td mono style={{ color: 'var(--text-muted)' }}>{n.invoices?.number ?? '—'}</Td>
                  <Td>{formatDate(n.issue_date)}</Td>
                  <Td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.reason ?? '—'}
                  </Td>
                  <Td right mono style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(n.total)}</Td>
                  <Td><Badge variant={STATUS_BADGE[n.status].variant}>{n.status}</Badge></Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      {isAccountant && n.status === 'draft' && (
                        <button
                          className="text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-indigo-50"
                          style={{ color: '#4f46e5' }}
                          onClick={() => updateStatus(n.id, 'issued')}
                        >
                          Issue
                        </button>
                      )}
                      {isAccountant && n.status === 'issued' && (
                        <button
                          className="text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-emerald-50"
                          style={{ color: '#16a34a' }}
                          onClick={() => updateStatus(n.id, 'applied')}
                        >
                          Apply
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
  )
}
