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
import { Plus, Search } from 'lucide-react'
import type { BillStatus } from '@/lib/database.types'

interface Bill {
  id: string
  number: string
  contact_id: string
  issue_date: string
  due_date: string
  status: BillStatus
  total: number
  contacts: { name: string } | null
}

export function BillsPage() {
  const { isAccountant, user } = useAuth()
  const [bills, setBills] = useState<Bill[]>([])
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    contact_id: '', issue_date: new Date().toISOString().split('T')[0], due_date: '', notes: '',
    items: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }],
  })

  async function load() {
    const { data } = await supabase.from('bills').select('*, contacts(name)').order('created_at', { ascending: false })
    setBills(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('contacts').select('id, name').then(({ data }) => setContacts(data ?? []))
  }, [])

  function updateItem(i: number, field: string, value: string | number) {
    setForm(f => { const items = [...f.items]; items[i] = { ...items[i], [field]: value }; return { ...f, items } })
  }

  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxAmount = form.items.reduce((s, i) => s + i.quantity * i.unit_price * i.tax_rate / 100, 0)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const { data: bill } = await supabase.from('bills').insert({
      contact_id: form.contact_id, issue_date: form.issue_date, due_date: form.due_date,
      status: 'received', subtotal, tax_amount: taxAmount, total: subtotal + taxAmount,
      notes: form.notes || null, created_by: user.id,
    }).select().single()
    if (bill) {
      await supabase.from('bill_items').insert(form.items.map(item => ({
        bill_id: bill.id, description: item.description, quantity: item.quantity,
        unit_price: item.unit_price, tax_rate: item.tax_rate, amount: item.quantity * item.unit_price,
      })))
    }
    setSaving(false)
    setShowForm(false)
    setForm({ contact_id: '', issue_date: new Date().toISOString().split('T')[0], due_date: '', notes: '', items: [{ description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] })
    load()
  }

  async function updateStatus(id: string, status: BillStatus) {
    await supabase.from('bills').update({ status }).eq('id', id)
    load()
  }

  const filtered = bills.filter(b =>
    !search || b.number.toLowerCase().includes(search.toLowerCase()) || b.contacts?.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Bills"
        description="Manage vendor bills and accounts payable"
        actions={isAccountant && (
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-3.5 h-3.5" /> New Bill
          </Button>
        )}
      />

      <div className="p-8 space-y-5">
        {showForm && (
          <Card>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Create Bill</h3>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <Select label="Vendor" value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))} options={contacts.map(c => ({ value: c.id, label: c.name }))} placeholder="Select vendor" required />
                <Input label="Issue Date" type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} required />
                <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Line Items</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] }))}>
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </Button>
                </div>
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                  <div className="grid grid-cols-12 gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ background: '#f8fafc', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                    <span className="col-span-5">Description</span><span className="col-span-2 text-right">Qty</span><span className="col-span-2 text-right">Unit Price</span><span className="col-span-2 text-right">Tax %</span><span className="col-span-1 text-right">Amount</span>
                  </div>
                  {form.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-3 px-4 py-2.5" style={{ borderTop: i > 0 ? '1px solid var(--border-light)' : 'none' }}>
                      <input className="col-span-5 text-sm bg-transparent border-0 outline-none" style={{ color: 'var(--text-primary)' }} placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} required />
                      <input className="col-span-2 text-sm text-right bg-transparent border-0 outline-none" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }} type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', +e.target.value)} />
                      <input className="col-span-2 text-sm text-right bg-transparent border-0 outline-none" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }} type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', +e.target.value)} />
                      <input className="col-span-2 text-sm text-right bg-transparent border-0 outline-none" style={{ color: 'var(--text-primary)' }} type="number" min="0" max="100" value={item.tax_rate} onChange={e => updateItem(i, 'tax_rate', +e.target.value)} />
                      <span className="col-span-1 text-sm text-right font-medium" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.quantity * item.unit_price)}</span>
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
                <Button type="submit" loading={saving}>Save Bill</Button>
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
              placeholder="Search bills..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} {filtered.length === 1 ? 'bill' : 'bills'}
          </span>
        </div>

        <Card>
          <DataTable>
            <TableHead>
              <Th>Number</Th>
              <Th>Vendor</Th>
              <Th>Issued</Th>
              <Th>Due</Th>
              <Th right>Total</Th>
              <Th>Status</Th>
              <Th></Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading bills...</td></tr>
              ) : filtered.length === 0 ? (
                <EmptyState title="No bills found" description="Create your first bill using the button above" />
              ) : filtered.map(bill => (
                <DataRow key={bill.id}>
                  <Td mono style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{bill.number}</Td>
                  <Td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{bill.contacts?.name}</Td>
                  <Td>{formatDate(bill.issue_date)}</Td>
                  <Td>{formatDate(bill.due_date)}</Td>
                  <Td right mono style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(bill.total)}</Td>
                  <Td><Badge {...statusBadge(bill.status)}>{bill.status}</Badge></Td>
                  <Td>
                    {isAccountant && bill.status === 'received' && (
                      <button className="text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-emerald-50" style={{ color: '#16a34a' }} onClick={() => updateStatus(bill.id, 'paid')}>Mark paid</button>
                    )}
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
