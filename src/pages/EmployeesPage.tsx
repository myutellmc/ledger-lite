import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, TableHead, TableBody, DataRow, Th, Td, EmptyState } from '@/components/ui/TableRow'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Pencil, X, Save, Search } from 'lucide-react'
import { CsvUpload } from '@/components/ui/CsvUpload'

type EmploymentType = 'full_time' | 'part_time' | 'contract'
type EmployeeStatus = 'active' | 'inactive' | 'terminated'

interface Employee {
  id: string
  employee_number: string
  full_name: string
  email: string | null
  phone: string | null
  nrc_number: string | null
  tpin: string | null
  department: string | null
  job_title: string | null
  employment_date: string | null
  employment_type: EmploymentType
  basic_salary: number
  bank_name: string | null
  bank_account: string | null
  bank_branch: string | null
  status: EmployeeStatus
}

const EMPTY_FORM = {
  full_name: '', email: '', phone: '', nrc_number: '', tpin: '',
  department: '', job_title: '', employment_date: '',
  employment_type: 'full_time' as EmploymentType,
  basic_salary: '', bank_name: '', bank_account: '', bank_branch: '',
  status: 'active' as EmployeeStatus,
}

const EMPLOYMENT_OPTS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract',  label: 'Contract' },
]
const STATUS_OPTS = [
  { value: 'active',     label: 'Active' },
  { value: 'inactive',   label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
]
const STATUS_FILTER_OPTS = [
  { value: '', label: 'All employees' },
  ...STATUS_OPTS,
]
const STATUS_BADGE: Record<EmployeeStatus, 'success' | 'neutral' | 'danger'> = {
  active: 'success', inactive: 'neutral', terminated: 'danger',
}

export function EmployeesPage() {
  const { isAccountant, user } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState('')

  async function load() {
    const { data } = await supabase.from('employees').select('*').order('employee_number')
    setEmployees(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditEmployee(null)
    setForm(EMPTY_FORM)
    setSaveError('')
    setShowForm(true)
  }

  function openEdit(emp: Employee) {
    setEditEmployee(emp)
    setForm({
      full_name: emp.full_name, email: emp.email ?? '', phone: emp.phone ?? '',
      nrc_number: emp.nrc_number ?? '', tpin: emp.tpin ?? '',
      department: emp.department ?? '', job_title: emp.job_title ?? '',
      employment_date: emp.employment_date ?? '',
      employment_type: emp.employment_type,
      basic_salary: String(emp.basic_salary),
      bank_name: emp.bank_name ?? '', bank_account: emp.bank_account ?? '',
      bank_branch: emp.bank_branch ?? '', status: emp.status,
    })
    setSaveError('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaveError('')

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      nrc_number: form.nrc_number || null,
      tpin: form.tpin || null,
      department: form.department || null,
      job_title: form.job_title || null,
      employment_date: form.employment_date || null,
      employment_type: form.employment_type,
      basic_salary: parseFloat(form.basic_salary) || 0,
      bank_name: form.bank_name || null,
      bank_account: form.bank_account || null,
      bank_branch: form.bank_branch || null,
      status: form.status,
    }

    let error
    if (editEmployee) {
      ({ error } = await supabase.from('employees').update(payload).eq('id', editEmployee.id))
    } else {
      ({ error } = await supabase.from('employees').insert({ ...payload, created_by: user.id }))
    }

    if (error) {
      setSaveError(error.message)
    } else {
      setShowForm(false)
      load()
    }
    setSaving(false)
  }

  const filtered = employees
    .filter(e => !statusFilter || e.status === statusFilter)
    .filter(e => !search ||
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_number.toLowerCase().includes(search.toLowerCase()) ||
      (e.job_title ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (e.department ?? '').toLowerCase().includes(search.toLowerCase())
    )

  const activeCount = employees.filter(e => e.status === 'active').length

  return (
    <div>
      <PageHeader
        title="Employees"
        description={`${activeCount} active employee${activeCount !== 1 ? 's' : ''}`}
        actions={isAccountant && (
          <Button size="sm" onClick={openNew}>
            <Plus className="w-3.5 h-3.5" /> New Employee
          </Button>
        )}
      />

      {/* Employee form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl" style={{ background: 'var(--card-bg)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>
            <div className="px-6 py-4 flex items-center justify-between sticky top-0 z-10" style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {editEmployee ? `Edit — ${editEmployee.full_name}` : 'New Employee'}
              </h3>
              <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
              {/* Personal */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Personal Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Full Name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
                  <Input label="NRC Number" value={form.nrc_number} onChange={e => setForm(f => ({ ...f, nrc_number: e.target.value }))} placeholder="000000/00/0" />
                  <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+260 97 000 0000" />
                  <Input label="TPIN" value={form.tpin} onChange={e => setForm(f => ({ ...f, tpin: e.target.value }))} placeholder="Tax Payer ID" />
                </div>
              </div>

              {/* Employment */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Employment</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Job Title" value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} placeholder="Accountant" />
                  <Input label="Department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Finance" />
                  <Input label="Employment Date" type="date" value={form.employment_date} onChange={e => setForm(f => ({ ...f, employment_date: e.target.value }))} />
                  <Select label="Employment Type" value={form.employment_type} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value as EmploymentType }))} options={EMPLOYMENT_OPTS} />
                  <Select label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as EmployeeStatus }))} options={STATUS_OPTS} />
                </div>
              </div>

              {/* Salary */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Salary</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Basic Monthly Salary (ZMW)" type="number" min="0" step="0.01" value={form.basic_salary} onChange={e => setForm(f => ({ ...f, basic_salary: e.target.value }))} placeholder="0.00" required />
                </div>
              </div>

              {/* Banking */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Banking Details</p>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Bank Name" value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="Zanaco" />
                  <Input label="Account Number" value={form.bank_account} onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))} />
                  <Input label="Branch" value={form.bank_branch} onChange={e => setForm(f => ({ ...f, bank_branch: e.target.value }))} />
                </div>
              </div>

              {saveError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>{saveError}</p>
              )}

              <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border-light)' }}>
                <Button type="submit" loading={saving}>
                  <Save className="w-3.5 h-3.5" /> {editEmployee ? 'Save Changes' : 'Add Employee'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="p-8 space-y-5">
        {isAccountant && (
          <CsvUpload
            templateFilename="employees_template.csv"
            columns={[
              { key: 'full_name',       label: 'Full Name',        required: true,  hint: 'John Banda' },
              { key: 'email',           label: 'Email',                             hint: 'john@example.com' },
              { key: 'phone',           label: 'Phone',                             hint: '+260 97 1234567' },
              { key: 'nrc_number',      label: 'NRC Number',                        hint: '123456/78/1' },
              { key: 'tpin',            label: 'TPIN',                              hint: '1000000001' },
              { key: 'department',      label: 'Department',                        hint: 'Finance' },
              { key: 'job_title',       label: 'Job Title',                         hint: 'Accountant' },
              { key: 'employment_date', label: 'Employment Date',                   hint: '2024-01-15' },
              { key: 'employment_type', label: 'Employment Type',  required: true,  hint: 'full_time' },
              { key: 'basic_salary',    label: 'Basic Salary',     required: true,  hint: '8500' },
              { key: 'bank_name',       label: 'Bank Name',                         hint: 'Zanaco' },
              { key: 'bank_account',    label: 'Bank Account',                      hint: '0001234567' },
              { key: 'bank_branch',     label: 'Bank Branch',                       hint: 'Cairo Road' },
              { key: 'status',          label: 'Status',           required: true,  hint: 'active' },
            ]}
            sampleRows={[{
              full_name: 'Jane Mwale', email: 'jane@company.zm', phone: '+260 97 0000001',
              nrc_number: '234567/89/1', tpin: '1000000002', department: 'Operations',
              job_title: 'Manager', employment_date: '2023-03-01',
              employment_type: 'full_time', basic_salary: '12000',
              bank_name: 'FNB Zambia', bank_account: '6200001234', bank_branch: 'Lusaka', status: 'active',
            }]}
            onImport={async rows => {
              const errors: string[] = []
              let imported = 0
              for (const r of rows) {
                const salary = parseFloat(r.basic_salary)
                if (isNaN(salary) || salary < 0) { errors.push(`Row skipped — invalid salary: "${r.basic_salary}"`); continue }
                const empType = ['full_time','part_time','contract'].includes(r.employment_type) ? r.employment_type as EmploymentType : 'full_time'
                const empStatus = ['active','inactive','terminated'].includes(r.status) ? r.status as EmployeeStatus : 'active'
                const { error } = await supabase.from('employees').insert({
                  full_name: r.full_name.trim(),
                  email: r.email?.trim() || null,
                  phone: r.phone?.trim() || null,
                  nrc_number: r.nrc_number?.trim() || null,
                  tpin: r.tpin?.trim() || null,
                  department: r.department?.trim() || null,
                  job_title: r.job_title?.trim() || null,
                  employment_date: r.employment_date?.trim() || null,
                  employment_type: empType,
                  basic_salary: salary,
                  bank_name: r.bank_name?.trim() || null,
                  bank_account: r.bank_account?.trim() || null,
                  bank_branch: r.bank_branch?.trim() || null,
                  status: empStatus,
                })
                if (error) errors.push(`${r.full_name}: ${error.message}`)
                else imported++
              }
              load()
              return { imported, errors }
            }}
          />
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              className="pl-9 pr-3 h-9 w-64 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'white', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Search name, title, department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select options={STATUS_FILTER_OPTS} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-40 h-9" />
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} employee{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <Card>
          <DataTable>
            <TableHead>
              <Th>Employee</Th>
              <Th>Title / Department</Th>
              <Th>Type</Th>
              <Th>Start Date</Th>
              <Th right>Basic Salary</Th>
              <Th>Status</Th>
              <Th></Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading employees…</td></tr>
              ) : filtered.length === 0 ? (
                <EmptyState title="No employees found" description="Add your first employee using the button above" />
              ) : filtered.map(emp => (
                <DataRow key={emp.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                        {emp.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{emp.full_name}</p>
                        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{emp.employee_number}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{emp.job_title ?? '—'}</p>
                    {emp.department && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emp.department}</p>}
                  </Td>
                  <Td>
                    <span className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>
                      {emp.employment_type.replace('_', ' ')}
                    </span>
                  </Td>
                  <Td>{emp.employment_date ? formatDate(emp.employment_date) : '—'}</Td>
                  <Td right mono style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(emp.basic_salary)}</Td>
                  <Td><Badge variant={STATUS_BADGE[emp.status]}>{emp.status}</Badge></Td>
                  <Td>
                    {isAccountant && (
                      <button
                        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors hover:bg-indigo-50"
                        style={{ color: '#4f46e5' }}
                        onClick={() => openEdit(emp)}
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
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
