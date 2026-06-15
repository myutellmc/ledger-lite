import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
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
    account_id: '',
    contact_id: '',
    description: '',
    amount: '',
    tax_amount: '',
    reference: '',
  })

  async function load() {
    const { data } = await supabase
      .from('expenses')
      .select('*, accounts(name), contacts(name)')
      .order('date', { ascending: false })
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
      date: form.date,
      account_id: form.account_id,
      contact_id: form.contact_id || null,
      description: form.description,
      amount: parseFloat(form.amount),
      tax_amount: parseFloat(form.tax_amount) || 0,
      reference: form.reference || null,
      created_by: user.id,
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
        actions={
          isAccountant && (
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="w-4 h-4" /> New Expense
            </Button>
          )
        }
      />

      <div className="p-8 space-y-6">
        {showForm && (
          <Card>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900">Record Expense</h3>
            </div>
            <form onSubmit={handleSave} className="px-6 py-4 grid grid-cols-3 gap-4">
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

        <div className="flex items-center justify-between">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        <Card>
          <div className="grid grid-cols-12 gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span className="col-span-2">Date</span>
            <span className="col-span-3">Description</span>
            <span className="col-span-2">Account</span>
            <span className="col-span-2">Vendor</span>
            <span className="col-span-1">Ref</span>
            <span className="col-span-1 text-right">Tax</span>
            <span className="col-span-1 text-right">Amount</span>
          </div>
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">No expenses found</div>
          ) : (
            filtered.map(exp => (
              <div key={exp.id} className="grid grid-cols-12 gap-3 px-6 py-3.5 border-b border-gray-50 hover:bg-gray-50 items-center text-sm">
                <span className="col-span-2 text-gray-600">{formatDate(exp.date)}</span>
                <span className="col-span-3 text-gray-900 font-medium">{exp.description}</span>
                <span className="col-span-2 text-gray-600">{exp.accounts?.name}</span>
                <span className="col-span-2 text-gray-600">{exp.contacts?.name ?? '—'}</span>
                <span className="col-span-1 text-gray-500 font-mono text-xs">{exp.reference ?? '—'}</span>
                <span className="col-span-1 text-right text-gray-600">{formatCurrency(exp.tax_amount)}</span>
                <span className="col-span-1 text-right font-semibold text-gray-900">{formatCurrency(exp.amount)}</span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
