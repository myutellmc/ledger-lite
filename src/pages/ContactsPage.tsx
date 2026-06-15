import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, TableHead, TableBody, DataRow, Th, Td, EmptyState } from '@/components/ui/TableRow'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Search } from 'lucide-react'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  type: 'customer' | 'vendor' | 'both'
  tax_number: string | null
  is_active: boolean
}

const TYPE_OPTIONS = [
  { value: 'customer', label: 'Customer' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'both', label: 'Both' },
]

const FILTER_OPTIONS = [
  { value: '', label: 'All Types' },
  ...TYPE_OPTIONS,
]

const TYPE_BADGE: Record<Contact['type'], { variant: 'info' | 'warning' | 'default' }> = {
  customer: { variant: 'info' },
  vendor: { variant: 'warning' },
  both: { variant: 'default' },
}

export function ContactsPage() {
  const { isAccountant } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', type: 'customer' as Contact['type'], tax_number: '', address: '' })

  async function load() {
    const { data } = await supabase.from('contacts').select('*').order('name')
    setContacts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('contacts').insert({
      name: form.name, email: form.email || null, phone: form.phone || null, type: form.type,
      tax_number: form.tax_number || null, address: form.address || null, is_active: true,
    })
    setSaving(false)
    setShowForm(false)
    setForm({ name: '', email: '', phone: '', type: 'customer', tax_number: '', address: '' })
    load()
  }

  const filtered = contacts
    .filter(c => !typeFilter || c.type === typeFilter || c.type === 'both')
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="Manage customers and vendors"
        actions={isAccountant && (
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-3.5 h-3.5" /> New Contact
          </Button>
        )}
      />

      <div className="p-8 space-y-5">
        {showForm && (
          <Card>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Add Contact</h3>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 grid grid-cols-3 gap-4">
              <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Company or person name" required />
              <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@example.com" />
              <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 0000" />
              <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Contact['type'] }))} options={TYPE_OPTIONS} />
              <Input label="Tax / VAT Number" value={form.tax_number} onChange={e => setForm(f => ({ ...f, tax_number: e.target.value }))} placeholder="Optional" />
              <Input label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Optional" />
              <div className="flex items-end gap-3 col-span-3">
                <Button type="submit" loading={saving}>Save Contact</Button>
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
              placeholder="Search contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select options={FILTER_OPTIONS} value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-36" />
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} {filtered.length === 1 ? 'contact' : 'contacts'}
          </span>
        </div>

        <Card>
          <DataTable>
            <TableHead>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>Type</Th>
              <Th>Tax No.</Th>
              <Th>Status</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading contacts...</td></tr>
              ) : filtered.length === 0 ? (
                <EmptyState title="No contacts found" description="Add your first contact using the button above" />
              ) : filtered.map(c => (
                <DataRow key={c.id}>
                  <Td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.name}</Td>
                  <Td>{c.email ?? '—'}</Td>
                  <Td>{c.phone ?? '—'}</Td>
                  <Td><Badge variant={TYPE_BADGE[c.type].variant}>{c.type}</Badge></Td>
                  <Td mono>{c.tax_number ?? '—'}</Td>
                  <Td><Badge variant={c.is_active ? 'success' : 'neutral'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></Td>
                </DataRow>
              ))}
            </TableBody>
          </DataTable>
        </Card>
      </div>
    </div>
  )
}
