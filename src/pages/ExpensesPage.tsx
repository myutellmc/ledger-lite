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
import { Plus, Search, Pencil, Trash2, Sparkles } from 'lucide-react'
import { CsvUpload } from '@/components/ui/CsvUpload'
import { useToast } from '@/components/ui/Toast'
import { ImportDocumentModal, type ExtractedDocument } from '@/components/ui/ImportDocumentModal'

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

const EMPTY_EXP = { date: new Date().toISOString().split('T')[0], account_id: '', contact_id: '', description: '', amount: '', tax_amount: '', reference: '' }

export function ExpensesPage() {
  const { isAccountant, user } = useAuth()
  const toast = useToast()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [accounts, setAccounts] = useState<{ id: string; name: string; code: string }[]>([])
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_EXP)
  const [showImport, setShowImport] = useState(false)

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

  function openNew() { setEditExpense(null); setForm(EMPTY_EXP); setShowForm(true) }
  function openEdit(exp: Expense) {
    setEditExpense(exp)
    setForm({
      date: exp.date, account_id: '', contact_id: '', description: exp.description,
      amount: String(exp.amount), tax_amount: String(exp.tax_amount), reference: exp.reference ?? '',
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const payload = {
      date: form.date, account_id: form.account_id, contact_id: form.contact_id || null,
      description: form.description, amount: parseFloat(form.amount),
      tax_amount: parseFloat(form.tax_amount) || 0, reference: form.reference || null,
    }
    if (editExpense) {
      const { error } = await supabase.from('expenses').update(payload).eq('id', editExpense.id)
      if (error) toast.error('Save failed', error.message)
      else toast.success('Expense updated')
    } else {
      const { error } = await supabase.from('expenses').insert({ ...payload, created_by: user.id })
      if (error) toast.error('Save failed', error.message)
      else toast.success('Expense recorded')
    }
    setSaving(false); setShowForm(false); setEditExpense(null); setForm(EMPTY_EXP); load()
  }

  function handleExtracted(doc: ExtractedDocument) {
    const vendor = contacts.find(c => c.name.toLowerCase() === (doc.vendor_name ?? '').toLowerCase())
    setForm(f => ({
      ...f,
      date: doc.issue_date ?? f.date,
      description: doc.line_items?.[0]?.description ?? '',
      amount: String(doc.total ?? ''),
      tax_amount: String(doc.tax_amount ?? ''),
      contact_id: vendor?.id ?? '',
      reference: doc.reference_number ?? '',
    }))
    setShowImport(false)
    setEditExpense(null)
    setShowForm(true)
    toast.success('Document imported', 'Review the pre-filled form and save')
  }

  async function handleDelete(id: string, desc: string) {
    if (!confirm(`Delete expense "${desc}"? This cannot be undone.`)) return
    setDeletingId(id)
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) toast.error('Delete failed', error.message)
    else toast.success('Expense deleted')
    setDeletingId(null); load()
  }

  const filtered = expenses.filter(e =>
    !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.accounts?.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0)

  return (
    <>
    <div>
      <PageHeader
        title="Expenses"
        description="Track and categorise business expenses"
        actions={isAccountant && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
              <Sparkles className="w-3.5 h-3.5" /> Import from Document
            </Button>
            <Button onClick={openNew} size="sm">
              <Plus className="w-3.5 h-3.5" /> New Expense
            </Button>
          </div>
        )}
      />

      <div className="p-8 space-y-5">
        {isAccountant && (
          <CsvUpload
            templateFilename="expenses_template.csv"
            columns={[
              { key: 'date',          label: 'Date',             required: true, hint: '2025-06-15' },
              { key: 'description',   label: 'Description',      required: true, hint: 'Office supplies' },
              { key: 'amount',        label: 'Amount',           required: true, hint: '1500.00' },
              { key: 'account_code',  label: 'Account Code',     required: true, hint: '5100' },
              { key: 'tax_amount',    label: 'Tax Amount',                       hint: '240.00' },
              { key: 'vendor_name',   label: 'Vendor Name',                      hint: 'Stationery World' },
              { key: 'reference',     label: 'Reference',                        hint: 'INV-2025-001' },
            ]}
            sampleRows={[
              { date: '2025-06-01', description: 'Office supplies', amount: '1500', account_code: '5100', tax_amount: '240', vendor_name: 'Stationery World', reference: 'INV-001' },
              { date: '2025-06-05', description: 'Fuel', amount: '800', account_code: '5200', tax_amount: '0', vendor_name: 'Total Zambia', reference: '' },
            ]}
            onImport={async rows => {
              const errors: string[] = []
              let imported = 0
              for (const r of rows) {
                const amount = parseFloat(r.amount)
                if (isNaN(amount)) { errors.push(`Row skipped — invalid amount: "${r.amount}"`); continue }
                // Resolve account by code
                const acct = accounts.find(a => a.code === r.account_code?.trim())
                if (!acct) { errors.push(`Row skipped — account code not found: "${r.account_code}"`); continue }
                // Optionally resolve vendor
                const vendor = contacts.find(c => c.name.toLowerCase() === r.vendor_name?.trim().toLowerCase())
                const { error } = await supabase.from('expenses').insert({
                  date: r.date.trim(),
                  description: r.description.trim(),
                  amount,
                  account_id: acct.id,
                  contact_id: vendor?.id || null,
                  tax_amount: parseFloat(r.tax_amount) || 0,
                  reference: r.reference?.trim() || null,
                  created_by: user?.id,
                })
                if (error) errors.push(`${r.description}: ${error.message}`)
                else imported++
              }
              load()
              return { imported, errors }
            }}
          />
        )}

        {showForm && (
          <Card className="fade-in">
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{editExpense ? 'Edit Expense' : 'Record Expense'}</h3>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 grid grid-cols-3 gap-4">
              <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              <Select label="Expense Account" value={form.account_id} onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))} options={accounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))} placeholder="Select account" required />
              <Select label="Vendor (optional)" value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))} options={contacts.map(c => ({ value: c.id, label: c.name }))} placeholder="None" />
              <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What was this for?" required />
              <Input label="Amount (ZMW)" type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
              <Input label="Tax Amount" type="number" min="0" step="0.01" value={form.tax_amount} onChange={e => setForm(f => ({ ...f, tax_amount: e.target.value }))} placeholder="0.00" />
              <Input label="Reference" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Receipt no., etc." />
              <div className="flex items-end gap-2 col-span-2">
                <Button type="submit" loading={saving}>{editExpense ? 'Save Changes' : 'Save Expense'}</Button>
                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditExpense(null) }}>Cancel</Button>
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
              {isAccountant && <Th></Th>}
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading expenses…</td></tr>
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
                  {isAccountant && (
                    <Td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(exp)} className="p-1.5 rounded-md hover:bg-indigo-50 transition-colors" title="Edit" style={{ color: '#6366f1' }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(exp.id, exp.description)} disabled={deletingId === exp.id} className="p-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-40" title="Delete" style={{ color: '#ef4444' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </Td>
                  )}
                </DataRow>
              ))}
            </TableBody>
          </DataTable>
        </Card>
      </div>
    </div>

    {showImport && (
      <ImportDocumentModal
        onExtracted={handleExtracted}
        onClose={() => setShowImport(false)}
      />
    )}
    </>
  )
}
