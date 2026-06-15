import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
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
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      type: form.type,
      tax_number: form.tax_number || null,
      address: form.address || null,
      is_active: true,
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
        actions={
          isAccountant && (
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="w-4 h-4" /> New Contact
            </Button>
          )
        }
      />

      <div className="p-8 space-y-6">
        {showForm && (
          <Card>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900">Add Contact</h3>
            </div>
            <form onSubmit={handleSave} className="px-6 py-4 grid grid-cols-3 gap-4">
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
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select options={FILTER_OPTIONS} value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-36" />
        </div>

        <Card>
          <div className="grid grid-cols-12 gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span className="col-span-3">Name</span>
            <span className="col-span-3">Email</span>
            <span className="col-span-2">Phone</span>
            <span className="col-span-2">Type</span>
            <span className="col-span-1">Tax No.</span>
            <span className="col-span-1">Status</span>
          </div>
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">No contacts found</div>
          ) : (
            filtered.map(c => (
              <div key={c.id} className="grid grid-cols-12 gap-3 px-6 py-3.5 border-b border-gray-50 hover:bg-gray-50 items-center text-sm">
                <span className="col-span-3 font-medium text-gray-900">{c.name}</span>
                <span className="col-span-3 text-gray-600">{c.email ?? '—'}</span>
                <span className="col-span-2 text-gray-600">{c.phone ?? '—'}</span>
                <span className="col-span-2">
                  <Badge variant={c.type === 'customer' ? 'info' : c.type === 'vendor' ? 'warning' : 'default'}>
                    {c.type}
                  </Badge>
                </span>
                <span className="col-span-1 text-gray-500 text-xs">{c.tax_number ?? '—'}</span>
                <span className="col-span-1">
                  <Badge variant={c.is_active ? 'success' : 'neutral'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                </span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
