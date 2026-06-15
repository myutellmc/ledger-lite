import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
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

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'danger',
  accountant: 'info',
  viewer: 'neutral',
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
      <div className="p-8">
        <div className="text-center py-20 text-gray-400 text-sm">You do not have permission to view this page.</div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="User Management" description="Manage user accounts and roles" />

      <div className="p-8">
        <Card>
          <div className="grid grid-cols-12 gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span className="col-span-3">Name</span>
            <span className="col-span-4">Email</span>
            <span className="col-span-2">Joined</span>
            <span className="col-span-2">Role</span>
            <span className="col-span-1">Action</span>
          </div>
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">Loading users...</div>
          ) : (
            users.map(u => (
              <div key={u.id} className="grid grid-cols-12 gap-3 px-6 py-3.5 border-b border-gray-50 hover:bg-gray-50 items-center text-sm">
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary-700">{u.full_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="font-medium text-gray-900">{u.full_name}</span>
                  {u.id === currentProfile?.id && <span className="text-xs text-gray-400">(you)</span>}
                </div>
                <span className="col-span-4 text-gray-600">{u.email}</span>
                <span className="col-span-2 text-gray-500">{formatDate(u.created_at)}</span>
                <span className="col-span-2">
                  <Badge variant={ROLE_COLORS[u.role] as never}>{u.role}</Badge>
                </span>
                <div className="col-span-1">
                  {u.id !== currentProfile?.id && (
                    <Select
                      options={ROLE_OPTIONS}
                      value={u.role}
                      onChange={e => updateRole(u.id, e.target.value as UserRole)}
                      className="text-xs py-1"
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
