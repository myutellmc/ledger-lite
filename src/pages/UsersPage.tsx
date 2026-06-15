import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, TableHead, TableBody, DataRow, Th, Td, EmptyState } from '@/components/ui/TableRow'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/utils'
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
  admin: { variant: 'danger' },
  accountant: { variant: 'info' },
  viewer: { variant: 'neutral' },
}

export function UsersPage() {
  const { profile: currentProfile, isAdmin } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateRole(id: string, role: UserRole) {
    setUpdating(id)
    await supabase.from('profiles').update({ role }).eq('id', id)
    setUpdating(null)
    load()
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
      <PageHeader title="User Management" description="Manage user accounts and role-based access" />

      <div className="p-8">
        <Card>
          <DataTable>
            <TableHead>
              <Th>User</Th>
              <Th>Email</Th>
              <Th>Joined</Th>
              <Th>Role</Th>
              <Th>Change Role</Th>
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
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.full_name}</p>
                        {u.id === currentProfile?.id && (
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>You</p>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td>{u.email}</Td>
                  <Td>{formatDate(u.created_at)}</Td>
                  <Td><Badge variant={ROLE_BADGE[u.role].variant}>{u.role}</Badge></Td>
                  <Td>
                    {u.id !== currentProfile?.id ? (
                      <Select
                        options={ROLE_OPTIONS}
                        value={u.role}
                        onChange={e => updateRole(u.id, e.target.value as UserRole)}
                        className="text-xs h-8 w-32"
                        disabled={updating === u.id}
                      />
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Cannot change own role</span>
                    )}
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
