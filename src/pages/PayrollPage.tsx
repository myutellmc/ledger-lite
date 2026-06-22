import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { calculatePayroll, MONTH_NAMES } from '@/lib/payroll'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, TableHead, TableBody, DataRow, Th, Td, EmptyState } from '@/components/ui/TableRow'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, ChevronLeft, Printer, Pencil, X, Save, CheckCircle } from 'lucide-react'

type RunStatus = 'draft' | 'processed' | 'paid'

interface PayrollRun {
  id: string
  run_number: string
  period_year: number
  period_month: number
  status: RunStatus
  total_gross: number
  total_paye: number
  total_napsa_employee: number
  total_napsa_employer: number
  total_nhima_employee: number
  total_nhima_employer: number
  total_sdl: number
  total_net: number
  notes: string | null
}

interface Employee {
  id: string
  employee_number: string
  full_name: string
  job_title: string | null
  department: string | null
  basic_salary: number
  status: string
}

interface PayrollEntry {
  id: string
  run_id: string
  employee_id: string
  basic_salary: number
  housing_allowance: number
  transport_allowance: number
  other_allowances: number
  gross_pay: number
  paye: number
  napsa_employee: number
  napsa_employer: number
  nhima_employee: number
  nhima_employer: number
  sdl: number
  salary_advance: number
  other_deductions: number
  total_deductions: number
  net_pay: number
  notes: string | null
  employees: { full_name: string; employee_number: string; job_title: string | null; department: string | null } | null
}

const RUN_STATUS_BADGE: Record<RunStatus, 'neutral' | 'info' | 'success'> = {
  draft: 'neutral', processed: 'info', paid: 'success',
}

const YEAR_OPTS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - 2 + i
  return { value: String(y), label: String(y) }
})
const MONTH_OPTS = MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))

export function PayrollPage() {
  const { isAccountant, user } = useAuth()
  const [runs, setRuns]               = useState<PayrollRun[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeRun, setActiveRun]     = useState<PayrollRun | null>(null)
  const [entries, setEntries]         = useState<PayrollEntry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [showNewRun, setShowNewRun]   = useState(false)
  const [newRunForm, setNewRunForm]   = useState({
    year: String(new Date().getFullYear()),
    month: String(new Date().getMonth() + 1),
    notes: '',
  })
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState('')
  const [editEntry, setEditEntry]     = useState<PayrollEntry | null>(null)
  const [entryForm, setEntryForm]     = useState({ housing_allowance: '0', transport_allowance: '0', other_allowances: '0', salary_advance: '0', other_deductions: '0', notes: '' })
  const [savingEntry, setSavingEntry] = useState(false)
  const [processing, setProcessing]   = useState(false)

  async function loadRuns() {
    const { data } = await supabase.from('payroll_runs').select('*').order('period_year', { ascending: false }).order('period_month', { ascending: false })
    setRuns(data ?? [])
    setLoading(false)
  }

  async function loadEntries(runId: string) {
    setEntriesLoading(true)
    const { data } = await supabase.from('payroll_entries').select('*, employees(full_name, employee_number, job_title, department)').eq('run_id', runId).order('created_at' as never)
    setEntries(data ?? [])
    setEntriesLoading(false)
  }

  useEffect(() => { loadRuns() }, [])

  async function openRun(run: PayrollRun) {
    setActiveRun(run)
    await loadEntries(run.id)
  }

  async function handleCreateRun(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setCreating(true)
    setCreateError('')

    // Get all active employees
    const { data: employees, error: empErr } = await supabase.from('employees').select('*').eq('status', 'active')
    if (empErr) { setCreateError(empErr.message); setCreating(false); return }
    if (!employees || employees.length === 0) {
      setCreateError('No active employees found. Add employees before running payroll.')
      setCreating(false)
      return
    }

    // Create the run
    const { data: run, error: runErr } = await supabase.from('payroll_runs').insert({
      period_year: parseInt(newRunForm.year),
      period_month: parseInt(newRunForm.month),
      notes: newRunForm.notes || null,
      created_by: user.id,
    }).select().single()

    if (runErr) { setCreateError(runErr.message); setCreating(false); return }

    // Create entries for each employee
    const runData = run as PayrollRun
    const entryInserts = (employees as Employee[]).map(emp => {
      const calc = calculatePayroll({ basicSalary: emp.basic_salary })
      return {
        run_id: runData.id,
        employee_id: emp.id,
        basic_salary: emp.basic_salary,
        housing_allowance: 0,
        transport_allowance: 0,
        other_allowances: 0,
        gross_pay: calc.grossPay,
        paye: calc.paye,
        napsa_employee: calc.napsaEmployee,
        napsa_employer: calc.napsaEmployer,
        nhima_employee: calc.nhimaEmployee,
        nhima_employer: calc.nhimaEmployer,
        sdl: calc.sdl,
        salary_advance: 0,
        other_deductions: 0,
        total_deductions: calc.totalDeductions,
        net_pay: calc.netPay,
      }
    })

    await supabase.from('payroll_entries').insert(entryInserts)

    // Update run totals
    const totals = entryInserts.reduce((acc, e) => ({
      total_gross: acc.total_gross + e.gross_pay,
      total_paye: acc.total_paye + e.paye,
      total_napsa_employee: acc.total_napsa_employee + e.napsa_employee,
      total_napsa_employer: acc.total_napsa_employer + e.napsa_employer,
      total_nhima_employee: acc.total_nhima_employee + e.nhima_employee,
      total_nhima_employer: acc.total_nhima_employer + e.nhima_employer,
      total_sdl: acc.total_sdl + e.sdl,
      total_net: acc.total_net + e.net_pay,
    }), { total_gross: 0, total_paye: 0, total_napsa_employee: 0, total_napsa_employer: 0, total_nhima_employee: 0, total_nhima_employer: 0, total_sdl: 0, total_net: 0 })

    await supabase.from('payroll_runs').update(totals).eq('id', runData.id)

    setCreating(false)
    setShowNewRun(false)
    setNewRunForm({ year: String(new Date().getFullYear()), month: String(new Date().getMonth() + 1), notes: '' })
    await loadRuns()
    const { data: freshRun } = await supabase.from('payroll_runs').select('*').eq('id', runData.id).single()
    if (freshRun) openRun(freshRun as PayrollRun)
  }

  function openEditEntry(entry: PayrollEntry) {
    setEditEntry(entry)
    setEntryForm({
      housing_allowance: String(entry.housing_allowance),
      transport_allowance: String(entry.transport_allowance),
      other_allowances: String(entry.other_allowances),
      salary_advance: String(entry.salary_advance),
      other_deductions: String(entry.other_deductions),
      notes: entry.notes ?? '',
    })
  }

  async function handleSaveEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!editEntry || !activeRun) return
    setSavingEntry(true)

    const calc = calculatePayroll({
      basicSalary: editEntry.basic_salary,
      housingAllowance: parseFloat(entryForm.housing_allowance) || 0,
      transportAllowance: parseFloat(entryForm.transport_allowance) || 0,
      otherAllowances: parseFloat(entryForm.other_allowances) || 0,
      salaryAdvance: parseFloat(entryForm.salary_advance) || 0,
      otherDeductions: parseFloat(entryForm.other_deductions) || 0,
    })

    await supabase.from('payroll_entries').update({
      housing_allowance: parseFloat(entryForm.housing_allowance) || 0,
      transport_allowance: parseFloat(entryForm.transport_allowance) || 0,
      other_allowances: parseFloat(entryForm.other_allowances) || 0,
      gross_pay: calc.grossPay,
      paye: calc.paye,
      napsa_employee: calc.napsaEmployee,
      napsa_employer: calc.napsaEmployer,
      nhima_employee: calc.nhimaEmployee,
      nhima_employer: calc.nhimaEmployer,
      sdl: calc.sdl,
      salary_advance: parseFloat(entryForm.salary_advance) || 0,
      other_deductions: parseFloat(entryForm.other_deductions) || 0,
      total_deductions: calc.totalDeductions,
      net_pay: calc.netPay,
      notes: entryForm.notes || null,
    }).eq('id', editEntry.id)

    // Recompute run totals
    const { data: allEntries } = await supabase.from('payroll_entries').select('*').eq('run_id', activeRun.id)
    if (allEntries) {
      const totals = (allEntries as PayrollEntry[]).reduce((acc, e) => ({
        total_gross: acc.total_gross + e.gross_pay,
        total_paye: acc.total_paye + e.paye,
        total_napsa_employee: acc.total_napsa_employee + e.napsa_employee,
        total_napsa_employer: acc.total_napsa_employer + e.napsa_employer,
        total_nhima_employee: acc.total_nhima_employee + e.nhima_employee,
        total_nhima_employer: acc.total_nhima_employer + e.nhima_employer,
        total_sdl: acc.total_sdl + e.sdl,
        total_net: acc.total_net + e.net_pay,
      }), { total_gross: 0, total_paye: 0, total_napsa_employee: 0, total_napsa_employer: 0, total_nhima_employee: 0, total_nhima_employer: 0, total_sdl: 0, total_net: 0 })
      await supabase.from('payroll_runs').update(totals).eq('id', activeRun.id)
    }

    setEditEntry(null)
    setSavingEntry(false)
    await loadEntries(activeRun.id)
    const { data: freshRun } = await supabase.from('payroll_runs').select('*').eq('id', activeRun.id).single()
    if (freshRun) setActiveRun(freshRun as PayrollRun)
  }

  async function processRun() {
    if (!activeRun) return
    setProcessing(true)
    await supabase.from('payroll_runs').update({ status: 'processed' }).eq('id', activeRun.id)
    const { data: freshRun } = await supabase.from('payroll_runs').select('*').eq('id', activeRun.id).single()
    if (freshRun) setActiveRun(freshRun as PayrollRun)
    await loadRuns()
    setProcessing(false)
  }

  async function markPaid() {
    if (!activeRun) return
    await supabase.from('payroll_runs').update({ status: 'paid' }).eq('id', activeRun.id)
    const { data: freshRun } = await supabase.from('payroll_runs').select('*').eq('id', activeRun.id).single()
    if (freshRun) setActiveRun(freshRun as PayrollRun)
    await loadRuns()
  }

  // ── Run detail view ──────────────────────────────────────────────────────────
  if (activeRun) {
    const periodLabel = `${MONTH_NAMES[activeRun.period_month - 1]} ${activeRun.period_year}`
    const isLocked = activeRun.status !== 'draft'

    // Live preview of current entry form
    const liveCalc = editEntry ? calculatePayroll({
      basicSalary: editEntry.basic_salary,
      housingAllowance: parseFloat(entryForm.housing_allowance) || 0,
      transportAllowance: parseFloat(entryForm.transport_allowance) || 0,
      otherAllowances: parseFloat(entryForm.other_allowances) || 0,
      salaryAdvance: parseFloat(entryForm.salary_advance) || 0,
      otherDeductions: parseFloat(entryForm.other_deductions) || 0,
    }) : null

    return (
      <div>
        <PageHeader
          title={`Payroll — ${periodLabel}`}
          description={`${activeRun.run_number} · ${entries.length} employee${entries.length !== 1 ? 's' : ''}`}
          actions={
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 text-sm font-medium"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => { setActiveRun(null); setEntries([]) }}
              >
                <ChevronLeft className="w-4 h-4" /> All Runs
              </button>
              <Badge variant={RUN_STATUS_BADGE[activeRun.status]}>{activeRun.status}</Badge>
              {isAccountant && activeRun.status === 'draft' && (
                <Button size="sm" onClick={processRun} loading={processing}>
                  <CheckCircle className="w-3.5 h-3.5" /> Process Payroll
                </Button>
              )}
              {isAccountant && activeRun.status === 'processed' && (
                <Button size="sm" variant="secondary" onClick={markPaid}>Mark Paid</Button>
              )}
              <Button
                size="sm" variant="secondary"
                onClick={() => window.open(`/payroll/${activeRun.id}/print`, '_blank')}
              >
                <Printer className="w-3.5 h-3.5" /> Print Payslips
              </Button>
              <Button
                size="sm" variant="secondary"
                onClick={() => window.open(`/payroll/${activeRun.id}/returns`, '_blank')}
              >
                <Printer className="w-3.5 h-3.5" /> Statutory Returns
              </Button>
            </div>
          }
        />

        {/* Edit entry modal */}
        {editEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
            <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {editEntry.employees?.full_name}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Basic: {formatCurrency(editEntry.basic_salary)} / month
                  </p>
                </div>
                <button onClick={() => setEditEntry(null)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSaveEntry} className="px-6 py-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Allowances</p>
                  <div className="grid grid-cols-3 gap-3">
                    <Input label="Housing (ZMW)" type="number" min="0" step="0.01" value={entryForm.housing_allowance} onChange={e => setEntryForm(f => ({ ...f, housing_allowance: e.target.value }))} />
                    <Input label="Transport (ZMW)" type="number" min="0" step="0.01" value={entryForm.transport_allowance} onChange={e => setEntryForm(f => ({ ...f, transport_allowance: e.target.value }))} />
                    <Input label="Other (ZMW)" type="number" min="0" step="0.01" value={entryForm.other_allowances} onChange={e => setEntryForm(f => ({ ...f, other_allowances: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Deductions</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Salary Advance (ZMW)" type="number" min="0" step="0.01" value={entryForm.salary_advance} onChange={e => setEntryForm(f => ({ ...f, salary_advance: e.target.value }))} />
                    <Input label="Other Deductions (ZMW)" type="number" min="0" step="0.01" value={entryForm.other_deductions} onChange={e => setEntryForm(f => ({ ...f, other_deductions: e.target.value }))} />
                  </div>
                </div>
                {liveCalc && (
                  <div className="rounded-lg p-4 space-y-2" style={{ background: '#f8fafc', border: '1px solid var(--border-light)' }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Live Preview</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>Gross Pay</span>
                      <span className="text-right font-semibold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(liveCalc.grossPay)}</span>
                      <span style={{ color: 'var(--text-muted)' }}>PAYE</span>
                      <span className="text-right" style={{ color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>({formatCurrency(liveCalc.paye)})</span>
                      <span style={{ color: 'var(--text-muted)' }}>NAPSA (5%)</span>
                      <span className="text-right" style={{ color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>({formatCurrency(liveCalc.napsaEmployee)})</span>
                      <span style={{ color: 'var(--text-muted)' }}>NHIMA (0.5%)</span>
                      <span className="text-right" style={{ color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>({formatCurrency(liveCalc.nhimaEmployee)})</span>
                      {(parseFloat(entryForm.salary_advance) > 0 || parseFloat(entryForm.other_deductions) > 0) && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>Other deductions</span>
                          <span className="text-right" style={{ color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>({formatCurrency((parseFloat(entryForm.salary_advance) || 0) + (parseFloat(entryForm.other_deductions) || 0))})</span>
                        </>
                      )}
                      <span className="font-bold pt-1 border-t" style={{ borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}>Net Pay</span>
                      <span className="text-right font-bold pt-1 border-t" style={{ borderColor: 'var(--border-light)', color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(liveCalc.netPay)}</span>
                    </div>
                  </div>
                )}
                <Input label="Notes" value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
                <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border-light)' }}>
                  <Button type="submit" loading={savingEntry}><Save className="w-3.5 h-3.5" /> Save</Button>
                  <Button type="button" variant="secondary" onClick={() => setEditEntry(null)}>Cancel</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="p-8 space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Gross', value: activeRun.total_gross, color: '#4f46e5' },
              { label: 'Total PAYE', value: activeRun.total_paye, color: '#ef4444' },
              { label: 'Total Net Pay', value: activeRun.total_net, color: '#16a34a' },
              { label: 'Total Employer Cost', value: activeRun.total_gross + activeRun.total_napsa_employer + activeRun.total_nhima_employer + activeRun.total_sdl, color: '#f59e0b' },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <div className="px-5 py-4">
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-lg font-bold" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(value)}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Statutory summary */}
          <Card>
            <div className="px-6 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Statutory Obligations — Due 10th of Next Month</p>
            </div>
            <div className="px-6 py-4 grid grid-cols-4 gap-6">
              {[
                { label: 'PAYE', sub: 'ZRA — employee tax', value: activeRun.total_paye, note: 'Employee deduction' },
                { label: 'NAPSA', sub: '5% + 5% of capped earnings', value: activeRun.total_napsa_employee + activeRun.total_napsa_employer, note: `Emp: ${formatCurrency(activeRun.total_napsa_employee)} · Er: ${formatCurrency(activeRun.total_napsa_employer)}` },
                { label: 'NHIMA', sub: '0.5% + 0.5% of gross', value: activeRun.total_nhima_employee + activeRun.total_nhima_employer, note: `Emp: ${formatCurrency(activeRun.total_nhima_employee)} · Er: ${formatCurrency(activeRun.total_nhima_employer)}` },
                { label: 'SDL', sub: '0.5% employer only', value: activeRun.total_sdl, note: 'Employer cost only' },
              ].map(({ label, sub, value, note }) => (
                <div key={label}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>
                  <p className="text-base font-bold" style={{ color: '#4f46e5', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(value)}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{note}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Entries table */}
          <Card>
            <DataTable>
              <TableHead>
                <Th>Employee</Th>
                <Th right>Gross Pay</Th>
                <Th right>PAYE</Th>
                <Th right>NAPSA</Th>
                <Th right>NHIMA</Th>
                <Th right>Other Ded.</Th>
                <Th right>Net Pay</Th>
                <Th></Th>
              </TableHead>
              <TableBody>
                {entriesLoading ? (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</td></tr>
                ) : entries.length === 0 ? (
                  <EmptyState title="No entries" description="No employees were found when this run was created" />
                ) : entries.map(entry => (
                  <DataRow key={entry.id}>
                    <Td>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{entry.employees?.full_name}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{entry.employees?.employee_number}</p>
                    </Td>
                    <Td right mono style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(entry.gross_pay)}</Td>
                    <Td right mono style={{ color: '#ef4444' }}>{formatCurrency(entry.paye)}</Td>
                    <Td right mono style={{ color: '#64748b' }}>{formatCurrency(entry.napsa_employee)}</Td>
                    <Td right mono style={{ color: '#64748b' }}>{formatCurrency(entry.nhima_employee)}</Td>
                    <Td right mono style={{ color: '#64748b' }}>{formatCurrency(entry.salary_advance + entry.other_deductions)}</Td>
                    <Td right mono style={{ color: '#16a34a', fontWeight: 700 }}>{formatCurrency(entry.net_pay)}</Td>
                    <Td>
                      {isAccountant && !isLocked && (
                        <button
                          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors hover:bg-indigo-50"
                          style={{ color: '#4f46e5' }}
                          onClick={() => openEditEntry(entry)}
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

  // ── Runs list view ───────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Process monthly payroll with PAYE, NAPSA, NHIMA & SDL calculations"
        actions={isAccountant && (
          <Button size="sm" onClick={() => { setShowNewRun(!showNewRun); setCreateError('') }}>
            <Plus className="w-3.5 h-3.5" /> New Payroll Run
          </Button>
        )}
      />

      <div className="p-8 space-y-5">
        {showNewRun && (
          <Card>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>New Payroll Run</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                A payroll entry will be auto-generated for every active employee at their current basic salary.
              </p>
            </div>
            <form onSubmit={handleCreateRun} className="px-6 py-5">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Select label="Year" value={newRunForm.year} onChange={e => setNewRunForm(f => ({ ...f, year: e.target.value }))} options={YEAR_OPTS} />
                <Select label="Month" value={newRunForm.month} onChange={e => setNewRunForm(f => ({ ...f, month: e.target.value }))} options={MONTH_OPTS} />
                <Input label="Notes (optional)" value={newRunForm.notes} onChange={e => setNewRunForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Includes Q3 bonus" />
              </div>
              {createError && <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>{createError}</p>}
              <div className="flex gap-2">
                <Button type="submit" loading={creating}>Create Run</Button>
                <Button type="button" variant="secondary" onClick={() => setShowNewRun(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        <Card>
          <DataTable>
            <TableHead>
              <Th>Run</Th>
              <Th>Period</Th>
              <Th right>Employees</Th>
              <Th right>Gross Payroll</Th>
              <Th right>Total PAYE</Th>
              <Th right>Net Pay</Th>
              <Th>Status</Th>
              <Th></Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading payroll runs…</td></tr>
              ) : runs.length === 0 ? (
                <EmptyState title="No payroll runs yet" description="Create your first payroll run using the button above" />
              ) : runs.map(run => (
                <DataRow key={run.id} onClick={() => openRun(run)} style={{ cursor: 'pointer' }}>
                  <Td mono style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{run.run_number}</Td>
                  <Td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {MONTH_NAMES[run.period_month - 1]} {run.period_year}
                  </Td>
                  <Td right style={{ color: 'var(--text-secondary)' }}>—</Td>
                  <Td right mono style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(run.total_gross)}</Td>
                  <Td right mono style={{ color: '#ef4444' }}>{formatCurrency(run.total_paye)}</Td>
                  <Td right mono style={{ color: '#16a34a', fontWeight: 700 }}>{formatCurrency(run.total_net)}</Td>
                  <Td><Badge variant={RUN_STATUS_BADGE[run.status]}>{run.status}</Badge></Td>
                  <Td>
                    <button
                      className="text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors hover:bg-indigo-50"
                      style={{ color: '#4f46e5' }}
                      onClick={e => { e.stopPropagation(); openRun(run) }}
                    >
                      View
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
