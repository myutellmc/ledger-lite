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
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { CsvUpload } from '@/components/ui/CsvUpload'
import { useToast } from '@/components/ui/Toast'

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

const EMPTY_FORM = { name: '', email: '', phone: '', type: 'customer' as Contact['type'], tax_number: '', address: '' }

export function ContactsPage() {
  const { isAccountant } = useAuth()
  const toast = useToast()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  async function load() {
    const { data } = await supabase.from('contacts').select('*').order('name')
    setContacts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditContact(null); setForm(EMPTY_FORM); setShowForm(true)
  }
  function openEdit(c: Contact) {
    setEditContact(c)
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', type: c.type, tax_number: c.tax_number ?? '', address: '' })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name.trim(), email: form.email || null, phone: form.phone || null, type: form.type,
      tax_number: form.tax_number || null, address: form.address || null,
    }
    if (editContact) {
      const { error } = await supabase.from('contacts').update(payload).eq('id', editContact.id)
      if (error) toast.error('Save failed', error.message)
      else toast.success('Contact updated')
    } else {
      const { error } = await supabase.from('contacts').insert({ ...payload, is_active: true })
      if (error) toast.error('Save failed', error.message)
      else toast.success('Contact added')
    }
    setSaving(false); setShowForm(false); setEditContact(null); setForm(EMPTY_FORM); load()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeletingId(id)
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) toast.error('Delete failed', error.message)
    else toast.success('Contact deleted')
    setDeletingId(null); load()
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
          <Button onClick={openNew} size="sm">
            <Plus className="w-3.5 h-3.5" /> New Contact
          </Button>
        )}
      />

      <div className="p-8 space-y-5">
        {isAccountant && (
          <CsvUpload
            templateFilename="contacts_template.csv"
            columns={[
              { key: 'name',       label: 'Name',           required: true, hint: 'Acme Ltd' },
              { key: 'type',       label: 'Type',           required: true, hint: 'customer' },
              { key: 'email',      label: 'Email',                          hint: 'info@acme.com' },
              { key: 'phone',      label: 'Phone',                          hint: '+260 21 1234567' },
              { key: 'tax_number', label: 'Tax / TPIN',                     hint: '1000012345' },
              { key: 'address',    label: 'Address',                        hint: 'Cairo Road, Lusaka' },
            ]}
            sampleRows={[
              { name: 'Acme Ltd', type: 'customer', email: 'info@acme.com', phone: '+260 21 1000001', tax_number: '1000012345', address: 'Cairo Road, Lusaka' },
              { name: 'ZAF Supplies', type: 'vendor', email: 'orders@zaf.zm', phone: '+260 97 5000002', tax_number: '', address: 'Industrial Area, Lusaka' },
            ]}
            onImport={async rows => {
              const errors: string[] = []
              let imported = 0
              for (const r of rows) {
                const type = ['customer','vendor','both'].includes(r.type?.toLowerCase()) ? r.type.toLowerCase() as Contact['type'] : 'customer'
                const { error } = await supabase.from('contacts').insert({
                  name: r.name.trim(), type,
                  email: r.email?.trim() || null,
                  phone: r.phone?.trim() || null,
                  tax_number: r.tax_number?.trim() || null,
                  address: r.address?.trim() || null,
                  is_active: true,
                })
                if (error) errors.push(`${r.name}: ${error.message}`)
                else imported++
              }
              load()
              return { imported, errors }
            }}
          />
        )}

        {showForm && (
          <Card className="fade-in">
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {editContact ? 'Edit Contact' : 'New Contact'}
              </h3>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 grid grid-cols-3 gap-4">
              <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Company or person name" required />
              <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@example.com" />
              <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+260 97 0000000" />
              <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Contact['type'] }))} options={TYPE_OPTIONS} />
              <Input label="Tax / TPIN" value={form.tax_number} onChange={e => setForm(f => ({ ...f, tax_number: e.target.value }))} placeholder="Optional" />
              <Input label="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Optional" />
              <div className="flex items-end gap-2 col-span-3">
                <Button type="submit" loading={saving}>{editContact ? 'Save Changes' : 'Add Contact'}</Button>
                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setEditContact(null) }}>Cancel</Button>
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
              <Th>TPIN</Th>
              <Th>Status</Th>
              {isAccountant && <Th></Th>}
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading contacts…</td></tr>
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
                  {isAccountant && (
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-md transition-colors hover:bg-indigo-50"
                          title="Edit"
                          style={{ color: '#6366f1' }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          disabled={deletingId === c.id}
                          className="p-1.5 rounded-md transition-colors hover:bg-red-50 disabled:opacity-40"
                          title="Delete"
                          style={{ color: '#ef4444' }}
                        >
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
  )
}
