import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
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

const TYPE_COLORS: Record<AccountType, string> = {
  asset: 'bg-blue-50 text-blue-700',
  liability: 'bg-red-50 text-red-700',
  equity: 'bg-purple-50 text-purple-700',
  revenue: 'bg-green-50 text-green-700',
  expense: 'bg-orange-50 text-orange-700',
}

const ACCOUNT_TYPES: { value: string; label: string }[] = [
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
      code: form.code,
      name: form.name,
      type: form.type,
      parent_id: form.parent_id || null,
      description: form.description || null,
      is_active: true,
    })
    setSaving(false)
    setShowForm(false)
    setForm({ code: '', name: '', type: 'asset', parent_id: '', description: '' })
    load()
  }

  const roots = accounts.filter(a => !a.parent_id)
  const children = (parentId: string) => accounts.filter(a => a.parent_id === parentId)

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function renderAccount(account: Account, depth = 0) {
    const kids = children(account.id)
    const isExpanded = expanded.has(account.id)
    return (
      <div key={account.id}>
        <div
          className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${depth > 0 ? 'pl-' + (4 + depth * 4) : ''}`}
          style={{ paddingLeft: `${16 + depth * 20}px` }}
        >
          <button onClick={() => kids.length > 0 && toggle(account.id)} className="w-4 h-4 shrink-0 flex items-center justify-center">
            {kids.length > 0 ? (isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />) : null}
          </button>
          <span className="w-20 text-xs font-mono text-gray-500">{account.code}</span>
          <span className="flex-1 text-sm font-medium text-gray-900">{account.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[account.type]}`}>
            {account.type}
          </span>
          <span className="w-28 text-right text-sm font-medium text-gray-900">{formatCurrency(account.balance)}</span>
          <Badge variant={account.is_active ? 'success' : 'neutral'}>{account.is_active ? 'Active' : 'Inactive'}</Badge>
        </div>
        {isExpanded && kids.map(child => renderAccount(child, depth + 1))}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Chart of Accounts"
        description="Manage your account structure for double-entry bookkeeping"
        actions={
          isAccountant && (
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="w-4 h-4" /> New Account
            </Button>
          )
        }
      />

      <div className="p-8 space-y-6">
        {showForm && (
          <Card>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900">Add Account</h3>
            </div>
            <form onSubmit={handleSave} className="px-6 py-4 grid grid-cols-3 gap-4">
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
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
            <span className="w-4" />
            <span className="w-20 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</span>
            <span className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</span>
            <span className="w-20 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</span>
            <span className="w-28 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</span>
            <span className="w-16 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</span>
          </div>
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">Loading accounts...</div>
          ) : roots.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">No accounts yet. Add your first account above.</div>
          ) : (
            roots.map(a => renderAccount(a))
          )}
        </Card>
      </div>
    </div>
  )
}
