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
import { Plus, ChevronRight, ChevronDown } from 'lucide-react'
import type { AccountType } from '@/lib/database.types'

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

export function AccountsPage() {
  const { isAccountant } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({ code: '', name: '', type: 'asset' as AccountType, parent_id: '', description: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('accounts').select('*').order('code')
    setAccounts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('accounts').insert({
      code: form.code, name: form.name, type: form.type,
      parent_id: form.parent_id || null, description: form.description || null, is_active: true,
    })
    setSaving(false)
    setShowForm(false)
    setForm({ code: '', name: '', type: 'asset', parent_id: '', description: '' })
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
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-3.5 h-3.5" /> New Account
          </Button>
        )}
      />

      <div className="p-8 space-y-5">
        {showForm && (
          <Card>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Add Account</h3>
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
                <Button type="submit" loading={saving}>Save Account</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
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
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading accounts...</td></tr>
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
