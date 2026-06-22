import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, TableHead, TableBody, DataRow, Th, Td, EmptyState } from '@/components/ui/TableRow'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/utils'
import { Pencil, X, Save, UserPlus } from 'lucide-react'
import type { UserRole } from '@/lib/database.types'

interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'viewer', label: 'Viewer' },
]

const ROLE_BADGE: Record<UserRole, { variant: 'danger' | 'info' | 'neutral' }> = {
  admin:      { variant: 'danger' },
  accountant: { variant: 'info' },
  viewer:     { variant: 'neutral' },
}

export function UsersPage() {
  const { profile: currentProfile, isAdmin } = useAuth()
  const [users, setUsers]       = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', role: '' as UserRole })
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [invite, setInvite]     = useState({ email: '', full_name: '', role: 'viewer' as UserRole })
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openEdit(u: Profile) {
    setEditUser(u)
    setEditForm({ full_name: u.full_name, role: u.role })
    setSaveError('')
  }

  async function handleSave() {
    if (!editUser) return
    setSaving(true)
    setSaveError('')
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editForm.full_name.trim(), role: editForm.role })
      .eq('id', editUser.id)
    if (error) {
      setSaveError(error.message)
    } else {
      setEditUser(null)
      load()
    }
    setSaving(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteError('')
    setInviteSuccess('')

    // Create auth user via signUp — they receive a confirmation email
    const { data, error } = await supabase.auth.signUp({
      email: invite.email.trim(),
      password: Math.random().toString(36).slice(-10) + 'A1!', // temp password — user sets via email
      options: {
        data: { full_name: invite.full_name.trim(), role: invite.role },
      },
    })

    if (error) {
      setInviteError(error.message)
    } else if (data.user) {
      // Upsert the profile row with the chosen role
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: invite.email.trim(),
        full_name: invite.full_name.trim(),
        role: invite.role,
      })
      setInviteSuccess(`Invitation sent to ${invite.email}`)
      setInvite({ email: '', full_name: '', role: 'viewer' })
      load()
    }
    setInviting(false)
  }

  if (!isAdmin) {
    return (
      <div className="p-8 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#f1f5f9' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Access restricted</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>You need admin access to manage users.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Manage user accounts and role-based access"
        actions={
          <Button size="sm" onClick={() => { setShowInvite(!showInvite); setInviteError(''); setInviteSuccess('') }}>
            <UserPlus className="w-3.5 h-3.5" /> Invite User
          </Button>
        }
      />

      <div className="p-8 space-y-5">

        {/* Invite form */}
        {showInvite && (
          <Card>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Invite New User</h3>
              <button onClick={() => setShowInvite(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="px-6 py-5">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Input
                  label="Full Name"
                  value={invite.full_name}
                  onChange={e => setInvite(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Jane Doe"
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={invite.email}
                  onChange={e => setInvite(f => ({ ...f, email: e.target.value }))}
                  placeholder="jane@company.com"
                  required
                />
                <Select
                  label="Role"
                  value={invite.role}
                  onChange={e => setInvite(f => ({ ...f, role: e.target.value as UserRole }))}
                  options={ROLE_OPTIONS}
                />
              </div>
              {inviteError && <p className="text-xs mb-3" style={{ color: '#ef4444' }}>{inviteError}</p>}
              {inviteSuccess && <p className="text-xs mb-3 font-medium" style={{ color: '#16a34a' }}>✓ {inviteSuccess}</p>}
              <div className="flex gap-2">
                <Button type="submit" loading={inviting}>Send Invitation</Button>
                <Button type="button" variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        {/* Edit modal */}
        {editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
            <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Edit User</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{editUser.email}</p>
                </div>
                <button onClick={() => setEditUser(null)} style={{ color: 'var(--text-muted)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <Input
                  label="Full Name"
                  value={editForm.full_name}
                  onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                  required
                />

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Email Address
                  </label>
                  <input
                    className="w-full px-3 py-2 rounded-lg text-sm cursor-not-allowed"
                    style={{ background: '#f8fafc', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
                    value={editUser.email}
                    disabled
                    title="Email can only be changed by the user themselves via account settings"
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Email changes must be made by the user themselves.
                  </p>
                </div>

                <Select
                  label="Role"
                  value={editForm.role}
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  options={ROLE_OPTIONS}
                  disabled={editUser.id === currentProfile?.id}
                />
                {editUser.id === currentProfile?.id && (
                  <p className="text-xs -mt-2" style={{ color: 'var(--text-muted)' }}>You cannot change your own role.</p>
                )}

                {saveError && (
                  <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>{saveError}</p>
                )}
              </div>

              <div className="px-6 py-4 flex gap-2" style={{ borderTop: '1px solid var(--border-light)', background: '#f8fafc' }}>
                <Button onClick={handleSave} loading={saving}>
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </Button>
                <Button variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        <Card>
          <DataTable>
            <TableHead>
              <Th>User</Th>
              <Th>Email</Th>
              <Th>Joined</Th>
              <Th>Role</Th>
              <Th></Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading users...</td></tr>
              ) : users.length === 0 ? (
                <EmptyState title="No users found" description="Users will appear here once they register" />
              ) : users.map(u => (
                <DataRow key={u.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}
                      >
                        {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.full_name}</p>
                        {u.id === currentProfile?.id && (
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>You</p>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td style={{ color: 'var(--text-secondary)' }}>{u.email}</Td>
                  <Td>{formatDate(u.created_at)}</Td>
                  <Td><Badge variant={ROLE_BADGE[u.role].variant}>{u.role}</Badge></Td>
                  <Td>
                    <button
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors hover:bg-indigo-50"
                      style={{ color: '#4f46e5' }}
                      onClick={() => openEdit(u)}
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  </Td>
                </DataRow>
              ))}
            </TableBody>
          </DataTable>
        </Card>
      </div>
    </div>
  )
}
