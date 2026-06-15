import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'

interface JournalEntry {
  id: string
  number: string
  date: string
  description: string
  reference: string | null
  total_debit: number
  total_credit: number
  created_at: string
}

interface JournalLine {
  id: string
  account_id: string
  description: string | null
  debit: number
  credit: number
  accounts: { code: string; name: string } | null
}

export function JournalPage() {
  const { isAccountant, user } = useAuth()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [accounts, setAccounts] = useState<{ id: string; name: string; code: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [lines, setLines] = useState<Record<string, JournalLine[]>>({})
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    lines: [
      { account_id: '', description: '', debit: '', credit: '' },
      { account_id: '', description: '', debit: '', credit: '' },
    ],
  })

  async function load() {
    const { data } = await supabase.from('journal_entries').select('*').order('date', { ascending: false })
    setEntries(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    supabase.from('accounts').select('id, code, name').then(({ data }) => setAccounts(data ?? []))
  }, [])

  async function loadLines(entryId: string) {
    if (lines[entryId]) return
    const { data } = await supabase.from('journal_lines').select('*, accounts(code, name)').eq('entry_id', entryId)
    setLines(prev => ({ ...prev, [entryId]: data ?? [] }))
  }

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        loadLines(id)
      }
      return next
    })
  }

  function addLine() {
    setForm(f => ({ ...f, lines: [...f.lines, { account_id: '', description: '', debit: '', credit: '' }] }))
  }

  function updateLine(i: number, field: string, value: string) {
    setForm(f => {
      const ls = [...f.lines]
      ls[i] = { ...ls[i], [field]: value }
      return { ...f, lines: ls }
    })
  }

  const totalDebit = form.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !balanced) return
    setSaving(true)
    const { data: entry } = await supabase.from('journal_entries').insert({
      date: form.date,
      description: form.description,
      reference: form.reference || null,
      total_debit: totalDebit,
      total_credit: totalCredit,
      created_by: user.id,
    }).select().single()

    if (entry) {
      await supabase.from('journal_lines').insert(
        form.lines
          .filter(l => l.account_id)
          .map(l => ({
            entry_id: entry.id,
            account_id: l.account_id,
            description: l.description || null,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
          }))
      )
    }
    setSaving(false)
    setShowForm(false)
    setForm({ date: new Date().toISOString().split('T')[0], description: '', reference: '', lines: [{ account_id: '', description: '', debit: '', credit: '' }, { account_id: '', description: '', debit: '', credit: '' }] })
    load()
  }

  return (
    <div>
      <PageHeader
        title="Journal Entries"
        description="Double-entry bookkeeping ledger"
        actions={
          isAccountant && (
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="w-4 h-4" /> New Entry
            </Button>
          )
        }
      />

      <div className="p-8 space-y-6">
        {showForm && (
          <Card>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900">New Journal Entry</h3>
            </div>
            <form onSubmit={handleSave} className="px-6 py-4 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Memo" required />
                <Input label="Reference" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Optional" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Lines</p>
                  <Button type="button" variant="ghost" size="sm" onClick={addLine}><Plus className="w-3.5 h-3.5" /> Add Line</Button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500">
                    <span className="col-span-4">Account</span>
                    <span className="col-span-4">Description</span>
                    <span className="col-span-2 text-right">Debit</span>
                    <span className="col-span-2 text-right">Credit</span>
                  </div>
                  {form.lines.map((line, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2 border-t border-gray-100">
                      <select className="col-span-4 text-sm border border-gray-200 rounded px-2 py-1" value={line.account_id} onChange={e => updateLine(i, 'account_id', e.target.value)}>
                        <option value="">Select account</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                      </select>
                      <input className="col-span-4 text-sm border border-gray-200 rounded px-2 py-1" placeholder="Optional memo" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                      <input className="col-span-2 text-sm text-right border border-gray-200 rounded px-2 py-1" type="number" min="0" step="0.01" placeholder="0.00" value={line.debit} onChange={e => updateLine(i, 'debit', e.target.value)} />
                      <input className="col-span-2 text-sm text-right border border-gray-200 rounded px-2 py-1" type="number" min="0" step="0.01" placeholder="0.00" value={line.credit} onChange={e => updateLine(i, 'credit', e.target.value)} />
                    </div>
                  ))}
                  <div className={`grid grid-cols-12 gap-2 px-4 py-2.5 border-t ${balanced ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className="col-span-8 text-xs font-medium text-gray-500">
                      {balanced ? 'Entry is balanced' : 'Entry is not balanced — debits must equal credits'}
                    </span>
                    <span className="col-span-2 text-right text-sm font-semibold">{formatCurrency(totalDebit)}</span>
                    <span className="col-span-2 text-right text-sm font-semibold">{formatCurrency(totalCredit)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" loading={saving} disabled={!balanced}>Save Entry</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        <Card>
          <div className="grid grid-cols-12 gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span className="col-span-1"></span>
            <span className="col-span-2">Number</span>
            <span className="col-span-2">Date</span>
            <span className="col-span-4">Description</span>
            <span className="col-span-1">Ref</span>
            <span className="col-span-1 text-right">Debit</span>
            <span className="col-span-1 text-right">Credit</span>
          </div>
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">No journal entries yet</div>
          ) : (
            entries.map(entry => (
              <div key={entry.id}>
                <button
                  onClick={() => toggle(entry.id)}
                  className="w-full grid grid-cols-12 gap-3 px-6 py-3.5 border-b border-gray-50 hover:bg-gray-50 items-center text-sm text-left"
                >
                  <span className="col-span-1 text-gray-400">
                    {expanded.has(entry.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>
                  <span className="col-span-2 font-mono text-gray-600">{entry.number}</span>
                  <span className="col-span-2 text-gray-600">{formatDate(entry.date)}</span>
                  <span className="col-span-4 text-gray-900 font-medium">{entry.description}</span>
                  <span className="col-span-1 text-gray-500 text-xs">{entry.reference ?? '—'}</span>
                  <span className="col-span-1 text-right text-gray-900">{formatCurrency(entry.total_debit)}</span>
                  <span className="col-span-1 text-right text-gray-900">{formatCurrency(entry.total_credit)}</span>
                </button>
                {expanded.has(entry.id) && lines[entry.id] && (
                  <div className="bg-gray-50 border-b border-gray-100">
                    {lines[entry.id].map(line => (
                      <div key={line.id} className="grid grid-cols-12 gap-3 px-6 py-2.5 text-xs text-gray-600 border-b border-gray-100 last:border-0">
                        <span className="col-span-1" />
                        <span className="col-span-4 font-mono">{line.accounts?.code} — {line.accounts?.name}</span>
                        <span className="col-span-5 text-gray-500">{line.description}</span>
                        <span className="col-span-1 text-right">{line.debit > 0 ? formatCurrency(line.debit) : '—'}</span>
                        <span className="col-span-1 text-right">{line.credit > 0 ? formatCurrency(line.credit) : '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
