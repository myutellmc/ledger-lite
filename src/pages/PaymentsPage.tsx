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
import { Plus, Search, ArrowDownLeft, ArrowUpRight } from 'lucide-react'

type PaymentType = 'received' | 'made'

interface Payment {
  id: string
  number: string
  date: string
  amount: number
  reference: string | null
  notes: string | null
  invoice_id: string | null
  bill_id: string | null
  accounts: { name: string } | null
  invoices: { number: string; contacts: { name: string } | null } | null
  bills: { number: string; contacts: { name: string } | null } | null
}

export function PaymentsPage() {
  const { isAccountant, user } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [invoices, setInvoices] = useState<{ id: string; number: string; contacts: { name: string } | null; total: number }[]>([])
  const [bills, setBills] = useState<{ id: string; number: string; contacts: { name: string } | null; total: number }[]>([])
  const [bankAccounts, setBankAccounts] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'' | 'received' | 'made'>('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [paymentType, setPaymentType] = useState<PaymentType>('received')
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    account_id: '',
    invoice_id: '',
    bill_id: '',
    reference: '',
    notes: '',
  })

  async function load() {
    const { data } = await supabase
      .from('payments')
      .select('*, accounts(name), invoices(number, contacts(name)), bills(number, contacts(name))')
      .order('date', { ascending: false })
    setPayments(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('invoices').select('id, number, total, contacts(name)').in('status', ['sent', 'overdue']).then(({ data }) => setInvoices(data ?? []))
    supabase.from('bills').select('id, number, total, contacts(name)').in('status', ['received', 'overdue']).then(({ data }) => setBills(data ?? []))
    supabase.from('accounts').select('id, name').in('type', ['asset']).then(({ data }) => setBankAccounts(data ?? []))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    await supabase.from('payments').insert({
      date: form.date,
      amount: parseFloat(form.amount),
      account_id: form.account_id,
      invoice_id: paymentType === 'received' ? form.invoice_id || null : null,
      bill_id: paymentType === 'made' ? form.bill_id || null : null,
      reference: form.reference || null,
      notes: form.notes || null,
      created_by: user.id,
    })

    // Update invoice/bill status to paid if fully paid
    if (paymentType === 'received' && form.invoice_id) {
      await supabase.from('invoices').update({ status: 'paid' }).eq('id', form.invoice_id)
    }
    if (paymentType === 'made' && form.bill_id) {
      await supabase.from('bills').update({ status: 'paid' }).eq('id', form.bill_id)
    }

    setSaving(false)
    setShowForm(false)
    setForm({ date: new Date().toISOString().split('T')[0], amount: '', account_id: '', invoice_id: '', bill_id: '', reference: '', notes: '' })
    load()
  }

  const filtered = payments.filter(p => {
    if (typeFilter === 'received' && !p.invoice_id) return false
    if (typeFilter === 'made' && !p.bill_id) return false
    if (search) {
      const term = search.toLowerCase()
      return (
        p.number.toLowerCase().includes(term) ||
        p.invoices?.number.toLowerCase().includes(term) ||
        p.bills?.number.toLowerCase().includes(term) ||
        p.invoices?.contacts?.name.toLowerCase().includes(term) ||
        p.bills?.contacts?.name.toLowerCase().includes(term)
      )
    }
    return true
  })

  const totalReceived = payments.filter(p => p.invoice_id).reduce((s, p) => s + p.amount, 0)
  const totalMade = payments.filter(p => p.bill_id).reduce((s, p) => s + p.amount, 0)

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Record payments received from customers and made to vendors"
        actions={isAccountant && (
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-3.5 h-3.5" /> Record Payment
          </Button>
        )}
      />

      <div className="p-8 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <ArrowDownLeft className="w-4 h-4" style={{ color: '#10b981' }} />
              </div>
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Total Received</p>
                <p className="text-lg font-bold" style={{ color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalReceived)}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <ArrowUpRight className="w-4 h-4" style={{ color: '#ef4444' }} />
              </div>
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Total Paid Out</p>
                <p className="text-lg font-bold" style={{ color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalMade)}</p>
              </div>
            </div>
          </Card>
        </div>

        {showForm && (
          <Card>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Record Payment</h3>
            </div>
            <div className="px-6 pt-4 pb-2">
              <div className="flex gap-1.5 p-1 rounded-lg w-fit" style={{ background: 'var(--border-light)' }}>
                {(['received', 'made'] as PaymentType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setPaymentType(t)}
                    className="px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize"
                    style={{
                      background: paymentType === t ? 'white' : 'transparent',
                      color: paymentType === t ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow: paymentType === t ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    Payment {t}
                  </button>
                ))}
              </div>
            </div>
            <form onSubmit={handleSave} className="px-6 py-4 grid grid-cols-3 gap-4">
              <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              <Input label="Amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
              <Select
                label="Bank / Cash Account"
                value={form.account_id}
                onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}
                options={bankAccounts.map(a => ({ value: a.id, label: a.name }))}
                placeholder="Select account"
                required
              />
              {paymentType === 'received' ? (
                <Select
                  label="Against Invoice"
                  value={form.invoice_id}
                  onChange={e => {
                    const inv = invoices.find(i => i.id === e.target.value)
                    setForm(f => ({ ...f, invoice_id: e.target.value, amount: inv ? String(inv.total) : f.amount }))
                  }}
                  options={invoices.map(i => ({ value: i.id, label: `${i.number} — ${i.contacts?.name ?? ''} (${formatCurrency(i.total)})` }))}
                  placeholder="Select invoice (optional)"
                />
              ) : (
                <Select
                  label="Against Bill"
                  value={form.bill_id}
                  onChange={e => {
                    const bill = bills.find(b => b.id === e.target.value)
                    setForm(f => ({ ...f, bill_id: e.target.value, amount: bill ? String(bill.total) : f.amount }))
                  }}
                  options={bills.map(b => ({ value: b.id, label: `${b.number} — ${b.contacts?.name ?? ''} (${formatCurrency(b.total)})` }))}
                  placeholder="Select bill (optional)"
                />
              )}
              <Input label="Reference" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Cheque no., transfer ref..." />
              <Input label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
              <div className="flex items-end gap-2 col-span-3">
                <Button type="submit" loading={saving}>Save Payment</Button>
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
              placeholder="Search payments..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 p-1 rounded-lg" style={{ background: 'var(--border-light)' }}>
            {([['', 'All'], ['received', 'Received'], ['made', 'Made']] as [string, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTypeFilter(val as typeof typeFilter)}
                className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                style={{
                  background: typeFilter === val ? 'white' : 'transparent',
                  color: typeFilter === val ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: typeFilter === val ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} payments</span>
        </div>

        <Card>
          <DataTable>
            <TableHead>
              <Th>Number</Th>
              <Th>Date</Th>
              <Th>Type</Th>
              <Th>Contact</Th>
              <Th>Reference</Th>
              <Th>Account</Th>
              <Th right>Amount</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading payments...</td></tr>
              ) : filtered.length === 0 ? (
                <EmptyState title="No payments yet" description="Record your first payment using the button above" />
              ) : filtered.map(p => (
                <DataRow key={p.id}>
                  <Td mono style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.number}</Td>
                  <Td>{formatDate(p.date)}</Td>
                  <Td>
                    {p.invoice_id ? (
                      <Badge variant="success">Received</Badge>
                    ) : (
                      <Badge variant="danger">Made</Badge>
                    )}
                  </Td>
                  <Td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {p.invoices?.contacts?.name ?? p.bills?.contacts?.name ?? '—'}
                    {(p.invoices || p.bills) && (
                      <span className="ml-1.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {p.invoices?.number ?? p.bills?.number}
                      </span>
                    )}
                  </Td>
                  <Td mono>{p.reference ?? '—'}</Td>
                  <Td>{p.accounts?.name}</Td>
                  <Td right mono style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(p.amount)}</Td>
                </DataRow>
              ))}
            </TableBody>
          </DataTable>
        </Card>
      </div>
    </div>
  )
}
