import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, TableHead, TableBody, DataRow, Th, Td, EmptyState } from '@/components/ui/TableRow'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Search } from 'lucide-react'

interface Expense {
  id: string
  date: string
  description: string
  amount: number
  tax_amount: number
  reference: string | null
  accounts: { name: string } | null
  contacts: { name: string } | null
}

export function ExpensesPage() {
  const { isAccountant, user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [accounts, setAccounts] = useState<{ id: string; name: string; code: string }[]>([])
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    account_id: '', contact_id: '', description: '', amount: '', tax_amount: '', reference: '',
  })

  async function load() {
    const { data } = await supabase.from('expenses').select('*, accounts(name), contacts(name)').order('date', { ascending: false })
    setExpenses(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('accounts').select('id, name, code').eq('type', 'expense').then(({ data }) => setAccounts(data ?? []))
    supabase.from('contacts').select('id, name').then(({ data }) => setContacts(data ?? []))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    await supabase.from('expenses').insert({
      date: form.date, account_id: form.account_id, contact_id: form.contact_id || null,
      description: form.description, amount: parseFloat(form.amount),
      tax_amount: parseFloat(form.tax_amount) || 0, reference: form.reference || null, created_by: user.id,
    })
    setSaving(false)
    setShowForm(false)
    setForm({ date: new Date().toISOString().split('T')[0], account_id: '', contact_id: '', description: '', amount: '', tax_amount: '', reference: '' })
    load()
  }

  const filtered = expenses.filter(e =>
    !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.accounts?.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track and categorise business expenses"
        actions={isAccountant && (
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-3.5 h-3.5" /> New Expense
          </Button>
        )}
      />

      <div className="p-8 space-y-5">
        {showForm && (
          <Card>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Record Expense</h3>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 grid grid-cols-3 gap-4">
              <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              <Select
                label="Expense Account"
                value={form.account_id}
                onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}
                options={accounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                placeholder="Select account"
                required
              />
              <Select
                label="Vendor (optional)"
                value={form.contact_id}
                onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}
                options={contacts.map(c => ({ value: c.id, label: c.name }))}
                placeholder="None"
              />
              <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What was this expense for?" required />
              <Input label="Amount" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
              <Input label="Tax Amount" type="number" min="0" step="0.01" value={form.tax_amount} onChange={e => setForm(f => ({ ...f, tax_amount: e.target.value }))} placeholder="0.00" />
              <Input label="Reference" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Receipt no., etc." />
              <div className="flex items-end gap-3 col-span-2">
                <Button type="submit" loading={saving}>Save Expense</Button>
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
              placeholder="Search expenses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span style={{ color: 'var(--text-muted)' }}>Total</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        <Card>
          <DataTable>
            <TableHead>
              <Th>Date</Th>
              <Th>Description</Th>
              <Th>Account</Th>
              <Th>Vendor</Th>
              <Th>Reference</Th>
              <Th right>Tax</Th>
              <Th right>Amount</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading expenses...</td></tr>
              ) : filtered.length === 0 ? (
                <EmptyState title="No expenses found" description="Record your first expense using the button above" />
              ) : filtered.map(exp => (
                <DataRow key={exp.id}>
                  <Td>{formatDate(exp.date)}</Td>
                  <Td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{exp.description}</Td>
                  <Td>{exp.accounts?.name}</Td>
                  <Td>{exp.contacts?.name ?? '—'}</Td>
                  <Td mono>{exp.reference ?? '—'}</Td>
                  <Td right mono>{formatCurrency(exp.tax_amount)}</Td>
                  <Td right mono style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(exp.amount)}</Td>
                </DataRow>
              ))}
            </TableBody>
          </DataTable>
        </Card>
      </div>
    </div>
  )
}
