import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, TableHead, TableBody, DataRow, Th, Td, EmptyState } from '@/components/ui/TableRow'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, ChevronRight, ChevronDown, Pencil, Power } from 'lucide-react'
import type { AccountType } from '@/lib/database.types'
import { CsvUpload } from '@/components/ui/CsvUpload'
import { useToast } from '@/components/ui/Toast'

interface Account {
  id: string
  code: string
  name: string
  type: AccountType
  parent_id: string | null
  description: string | null
  is_active: boolean
  balance: number
}

const TYPE_BADGE: Record<AccountType, { variant: 'info' | 'danger' | 'default' | 'success' | 'warning' }> = {
  asset: { variant: 'info' },
  liability: { variant: 'danger' },
  equity: { variant: 'default' },
  revenue: { variant: 'success' },
  expense: { variant: 'warning' },
}

const ACCOUNT_TYPES = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
  { value: 'equity', label: 'Equity' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'expense', label: 'Expense' },
]

const EMPTY_FORM = { code: '', name: '', type: 'asset' as AccountType, parent_id: '', description: '' }

export function AccountsPage() {
  const { isAccountant } = useAuth()
  const toast = useToast()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('accounts').select('*').order('code')
    setAccounts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() { setEditAccount(null); setForm(EMPTY_FORM); setShowForm(true) }
  function openEdit(a: Account) {
    setEditAccount(a)
    setForm({ code: a.code, name: a.name, type: a.type, parent_id: a.parent_id ?? '', description: a.description ?? '' })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      code: form.code, name: form.name, type: form.type,
      parent_id: form.parent_id || null, description: form.description || null,
    }
    if (editAccount) {
      const { error } = await supabase.from('accounts').update(payload).eq('id', editAccount.id)
      if (error) toast.error('Save failed', error.message)
      else toast.success('Account updated')
    } else {
      const { error } = await supabase.from('accounts').insert({ ...payload, is_active: true })
      if (error) toast.error('Save failed', error.message)
      else toast.success('Account created')
    }
    setSaving(false); setShowForm(false); setEditAccount(null); setForm(EMPTY_FORM); load()
  }

  async function toggleActive(a: Account) {
    const { error } = await supabase.from('accounts').update({ is_active: !a.is_active }).eq('id', a.id)
    if (error) toast.error('Update failed', error.message)
    else toast.success(a.is_active ? 'Account deactivated' : 'Account activated')
    load()
  }

  const roots = accounts.filter(a => !a.parent_id)
  const children = (parentId: string) => accounts.filter(a => a.parent_id === parentId)

  function toggle(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function renderAccount(account: Account, depth = 0): React.ReactNode {
    const kids = children(account.id)
    const isExp = expanded.has(account.id)
    return [
      <DataRow key={account.id}>
        <Td>
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
            <button
              onClick={() => kids.length > 0 && toggle(account.id)}
              className="w-5 h-5 shrink-0 flex items-center justify-center rounded"
              style={{ color: 'var(--text-muted)' }}
            >
              {kids.length > 0 ? (isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />) : <span className="w-3.5" />}
            </button>
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{account.code}</span>
          </div>
        </Td>
        <Td style={{ color: 'var(--text-primary)', fontWeight: depth === 0 ? 600 : 500 }}>{account.name}</Td>
        <Td><Badge variant={TYPE_BADGE[account.type].variant}>{account.type}</Badge></Td>
        <Td right mono style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(account.balance)}</Td>
        <Td><Badge variant={account.is_active ? 'success' : 'neutral'}>{account.is_active ? 'Active' : 'Inactive'}</Badge></Td>
        {isAccountant && (
          <Td>
            <div className="flex items-center gap-1">
              <button onClick={() => openEdit(account)} className="p-1.5 rounded-md hover:bg-indigo-50 transition-colors" title="Edit" style={{ color: '#6366f1' }}>
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => toggleActive(account)} className="p-1.5 rounded-md hover:bg-amber-50 transition-colors" title={account.is_active ? 'Deactivate' : 'Activate'} style={{ color: account.is_active ? '#d97706' : '#16a34a' }}>
                <Power className="w-3.5 h-3.5" />
              </button>
            </div>
          </Td>
        )}
      </DataRow>,
      ...(isExp ? kids.map(c => renderAccount(c, depth + 1)) : [])
    ]
  }

  return (
    <div>
      <PageHeader
        title="Chart of Accounts"
        description="Manage your account structure for double-entry bookkeeping"
        actions={isAccountant && (
          <Button onClick={openNew} size="sm">
            <Plus className="w-3.5 h-3.5" /> New Account
          </Button>
        )}
      />

      <div className="p-8 space-y-5">
        {isAccountant && (
          <CsvUpload
            templateFilename="accounts_template.csv"
            columns={[
              { key: 'code',        label: 'Account Code', required: true, hint: '1100' },
              { key: 'name',        label: 'Account Name', required: true, hint: 'Cash at Bank' },
              { key: 'type',        label: 'Type',         required: true, hint: 'asset' },
              { key: 'description', label: 'Description',                  hint: 'Main operating account' },
            ]}
            sampleRows={[
              { code: '1100', name: 'Cash at Bank',         type: 'asset',   description: 'Main bank account' },
              { code: '2100', name: 'Accounts Payable',     type: 'liability', description: '' },
              { code: '4100', name: 'Sales Revenue',        type: 'revenue',  description: '' },
              { code: '5100', name: 'Cost of Sales',        type: 'expense',  description: '' },
            ]}
            onImport={async rows => {
              const errors: string[] = []
              let imported = 0
              const validTypes = ['asset','liability','equity','revenue','expense']
              for (const r of rows) {
                const type = validTypes.includes(r.type?.toLowerCase()) ? r.type.toLowerCase() as AccountType : null
                if (!type) { errors.push(`${r.code} — invalid type "${r.type}" (must be asset/liability/equity/revenue/expense)`); continue }
                const { error } = await supabase.from('accounts').insert({
                  code: r.code.trim(), name: r.name.trim(), type,
                  description: r.description?.trim() || null,
                  parent_id: null, is_active: true,
                })
                if (error) errors.push(`${r.code}: ${error.message}`)
                else imported++
              }
              load()
              return { imported, errors }
            }}
          />
        )}

        {showForm && (
          <Card>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{editAccount ? 'Edit Account' : 'Add Account'}</h3>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 grid grid-cols-3 gap-4">
              <Input label="Account Code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="1000" required />
              <Input label="Account Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Cash" required />
              <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as AccountType }))} options={ACCOUNT_TYPES} />
              <Select
                label="Parent Account"
                value={form.parent_id}
                onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}
                options={accounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                placeholder="None (top-level)"
              />
              <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
              <div className="flex items-end gap-3">
                <Button type="submit" loading={saving}>{editAccount ? 'Save Changes' : 'Save Account'}</Button>
                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditAccount(null) }}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        <Card>
          <DataTable>
            <TableHead>
              <Th>Code</Th>
              <Th>Account Name</Th>
              <Th>Type</Th>
              <Th right>Balance</Th>
              <Th>Status</Th>
              {isAccountant && <Th></Th>}
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={isAccountant ? 6 : 5} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading accounts...</td></tr>
              ) : roots.length === 0 ? (
                <EmptyState title="No accounts yet" description="Add your first account using the button above" />
              ) : (
                roots.map(a => renderAccount(a))
              )}
            </TableBody>
          </DataTable>
        </Card>
      </div>
    </div>
  )
}
