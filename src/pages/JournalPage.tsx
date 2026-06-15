import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, TableHead, TableBody, DataRow, Th, Td, EmptyState } from '@/components/ui/TableRow'
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
      if (next.has(id)) { next.delete(id) } else { next.add(id); loadLines(id) }
      return next
    })
  }

  function updateLine(i: number, field: string, value: string) {
    setForm(f => { const ls = [...f.lines]; ls[i] = { ...ls[i], [field]: value }; return { ...f, lines: ls } })
  }

  const totalDebit = form.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !balanced) return
    setSaving(true)
    const { data: entry } = await supabase.from('journal_entries').insert({
      date: form.date, description: form.description, reference: form.reference || null,
      total_debit: totalDebit, total_credit: totalCredit, created_by: user.id,
    }).select().single()
    if (entry) {
      await supabase.from('journal_lines').insert(
        form.lines.filter(l => l.account_id).map(l => ({
          entry_id: entry.id, account_id: l.account_id, description: l.description || null,
          debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0,
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
        actions={isAccountant && (
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-3.5 h-3.5" /> New Entry
          </Button>
        )}
      />

      <div className="p-8 space-y-5">
        {showForm && (
          <Card>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>New Journal Entry</h3>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Memo" required />
                <Input label="Reference" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Optional" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Lines</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, lines: [...f.lines, { account_id: '', description: '', debit: '', credit: '' }] }))}>
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </Button>
                </div>
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                  <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ background: '#f8fafc', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                    <span className="col-span-4">Account</span>
                    <span className="col-span-4">Description</span>
                    <span className="col-span-2 text-right">Debit</span>
                    <span className="col-span-2 text-right">Credit</span>
                  </div>
                  {form.lines.map((line, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2.5" style={{ borderTop: i > 0 ? '1px solid var(--border-light)' : 'none' }}>
                      <select
                        className="col-span-4 text-sm rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)', background: 'white' }}
                        value={line.account_id}
                        onChange={e => updateLine(i, 'account_id', e.target.value)}
                      >
                        <option value="">Select account</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                      </select>
                      <input
                        className="col-span-4 text-sm px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                        placeholder="Optional memo"
                        value={line.description}
                        onChange={e => updateLine(i, 'description', e.target.value)}
                      />
                      <input
                        className="col-span-2 text-sm text-right px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                        type="number" min="0" step="0.01" placeholder="0.00"
                        value={line.debit}
                        onChange={e => updateLine(i, 'debit', e.target.value)}
                      />
                      <input
                        className="col-span-2 text-sm text-right px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
                        type="number" min="0" step="0.01" placeholder="0.00"
                        value={line.credit}
                        onChange={e => updateLine(i, 'credit', e.target.value)}
                      />
                    </div>
                  ))}
                  <div
                    className="grid grid-cols-12 gap-2 px-4 py-3"
                    style={{
                      borderTop: '1px solid var(--border-default)',
                      background: balanced ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                    }}
                  >
                    <span className="col-span-8 text-xs font-medium" style={{ color: balanced ? '#059669' : '#dc2626' }}>
                      {balanced ? 'Entry is balanced' : 'Debits must equal credits'}
                    </span>
                    <span className="col-span-2 text-right text-sm font-semibold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalDebit)}</span>
                    <span className="col-span-2 text-right text-sm font-semibold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalCredit)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" loading={saving} disabled={!balanced}>Save Entry</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        <Card>
          <DataTable>
            <TableHead>
              <Th></Th>
              <Th>Number</Th>
              <Th>Date</Th>
              <Th>Description</Th>
              <Th>Reference</Th>
              <Th right>Debit</Th>
              <Th right>Credit</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading entries...</td></tr>
              ) : entries.length === 0 ? (
                <EmptyState title="No journal entries yet" description="Create your first entry using the button above" />
              ) : entries.map(entry => (
                <>
                  <DataRow key={entry.id} className="cursor-pointer" onClick={() => toggle(entry.id)}>
                    <Td>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {expanded.has(entry.id) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </span>
                    </Td>
                    <Td mono style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{entry.number}</Td>
                    <Td>{formatDate(entry.date)}</Td>
                    <Td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{entry.description}</Td>
                    <Td>{entry.reference ?? '—'}</Td>
                    <Td right mono style={{ color: 'var(--text-primary)' }}>{formatCurrency(entry.total_debit)}</Td>
                    <Td right mono style={{ color: 'var(--text-primary)' }}>{formatCurrency(entry.total_credit)}</Td>
                  </DataRow>
                  {expanded.has(entry.id) && lines[entry.id] && lines[entry.id].map(line => (
                    <tr key={line.id} style={{ background: 'rgba(248,250,252,0.8)' }}>
                      <td />
                      <td colSpan={3} className="px-5 py-2.5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {line.accounts?.code} — {line.accounts?.name}
                        {line.description && <span className="ml-3 font-sans" style={{ color: 'var(--text-muted)' }}>{line.description}</span>}
                      </td>
                      <td />
                      <td className="px-5 py-2.5 text-xs text-right font-mono" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {line.debit > 0 ? formatCurrency(line.debit) : ''}
                      </td>
                      <td className="px-5 py-2.5 text-xs text-right font-mono" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {line.credit > 0 ? formatCurrency(line.credit) : ''}
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </TableBody>
          </DataTable>
        </Card>
      </div>
    </div>
  )
}
