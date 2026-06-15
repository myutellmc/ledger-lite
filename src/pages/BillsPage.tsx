import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
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
    contact_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
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

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price: 0, tax_rate: 0 }] }))
  }

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
      contact_id: form.contact_id,
      issue_date: form.issue_date,
      due_date: form.due_date,
      status: 'received',
      subtotal,
      tax_amount: taxAmount,
      total: subtotal + taxAmount,
      notes: form.notes || null,
      created_by: user.id,
    }).select().single()
    if (bill) {
      await supabase.from('bill_items').insert(form.items.map(item => ({
        bill_id: bill.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        amount: item.quantity * item.unit_price,
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

  const filtered = bills.filter(b => !search || b.number.toLowerCase().includes(search.toLowerCase()) || b.contacts?.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <PageHeader
        title="Bills"
        description="Manage vendor bills and accounts payable"
        actions={isAccountant && <Button onClick={() => setShowForm(!showForm)} size="sm"><Plus className="w-4 h-4" /> New Bill</Button>}
      />

      <div className="p-8 space-y-6">
        {showForm && (
          <Card>
            <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-medium text-gray-900">Create Bill</h3></div>
            <form onSubmit={handleSave} className="px-6 py-4 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Select label="Vendor" value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))} options={contacts.map(c => ({ value: c.id, label: c.name }))} placeholder="Select vendor" required />
                <Input label="Issue Date" type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} required />
                <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} required />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Line Items</p>
                  <Button type="button" variant="ghost" size="sm" onClick={addItem}><Plus className="w-3.5 h-3.5" /> Add Line</Button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500">
                    <span className="col-span-5">Description</span><span className="col-span-2 text-right">Qty</span><span className="col-span-2 text-right">Unit Price</span><span className="col-span-2 text-right">Tax %</span><span className="col-span-1 text-right">Amount</span>
                  </div>
                  {form.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2 border-t border-gray-100">
                      <input className="col-span-5 text-sm border-0 outline-none bg-transparent" placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} required />
                      <input className="col-span-2 text-sm text-right border-0 outline-none bg-transparent" type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', +e.target.value)} />
                      <input className="col-span-2 text-sm text-right border-0 outline-none bg-transparent" type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', +e.target.value)} />
                      <input className="col-span-2 text-sm text-right border-0 outline-none bg-transparent" type="number" min="0" max="100" value={item.tax_rate} onChange={e => updateItem(i, 'tax_rate', +e.target.value)} />
                      <span className="col-span-1 text-sm text-right text-gray-700">{formatCurrency(item.quantity * item.unit_price)}</span>
                    </div>
                  ))}
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-8 text-sm">
                    <span className="text-gray-500">Subtotal: <strong>{formatCurrency(subtotal)}</strong></span>
                    <span className="text-gray-500">Tax: <strong>{formatCurrency(taxAmount)}</strong></span>
                    <span className="text-gray-500">Total: <strong>{formatCurrency(subtotal + taxAmount)}</strong></span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" loading={saving}>Save Bill</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Search bills..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Card>
          <div className="grid grid-cols-12 gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span className="col-span-2">Number</span><span className="col-span-3">Vendor</span><span className="col-span-2">Issue Date</span><span className="col-span-2">Due Date</span><span className="col-span-1 text-right">Total</span><span className="col-span-1">Status</span><span className="col-span-1"></span>
          </div>
          {loading ? <div className="px-6 py-10 text-center text-sm text-gray-400">Loading...</div> : filtered.length === 0 ? <div className="px-6 py-10 text-center text-sm text-gray-400">No bills found</div> : (
            filtered.map(bill => (
              <div key={bill.id} className="grid grid-cols-12 gap-3 px-6 py-3.5 border-b border-gray-50 hover:bg-gray-50 items-center text-sm">
                <span className="col-span-2 font-mono text-gray-700">{bill.number}</span>
                <span className="col-span-3 font-medium text-gray-900">{bill.contacts?.name}</span>
                <span className="col-span-2 text-gray-600">{formatDate(bill.issue_date)}</span>
                <span className="col-span-2 text-gray-600">{formatDate(bill.due_date)}</span>
                <span className="col-span-1 text-right font-medium text-gray-900">{formatCurrency(bill.total)}</span>
                <span className="col-span-1"><Badge {...statusBadge(bill.status)}>{bill.status}</Badge></span>
                {isAccountant && bill.status === 'received' && (
                  <button className="col-span-1 text-xs text-green-600 hover:text-green-700 font-medium" onClick={() => updateStatus(bill.id, 'paid')}>Mark Paid</button>
                )}
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
