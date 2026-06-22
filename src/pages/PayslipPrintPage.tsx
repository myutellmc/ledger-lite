import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { MONTH_NAMES } from '@/lib/payroll'
import { Printer, ArrowLeft } from 'lucide-react'

interface Entry {
  id: string
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
  employees: {
    employee_number: string
    full_name: string
    job_title: string | null
    department: string | null
    nrc_number: string | null
    tpin: string | null
    bank_name: string | null
    bank_account: string | null
  } | null
  payroll_runs: {
    run_number: string
    period_year: number
    period_month: number
  } | null
}

interface Settings {
  company_name: string
  company_email: string | null
  company_phone: string | null
  company_address: string | null
  tax_number: string | null
}

function Payslip({ entry, settings }: { entry: Entry; settings: Settings | null }) {
  const run = entry.payroll_runs
  const emp = entry.employees
  const period = run ? `${MONTH_NAMES[run.period_month - 1]} ${run.period_year}` : ''

  return (
    <div
      style={{
        width: '210mm',
        minHeight: '148mm',
        background: 'white',
        padding: '14mm 16mm',
        marginBottom: '8mm',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        color: '#1e293b',
        pageBreakInside: 'avoid',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6mm', paddingBottom: '4mm', borderBottom: '2px solid #1e1b4b' }}>
        <div>
          <p style={{ fontSize: '16px', fontWeight: 800, color: '#1e1b4b' }}>{settings?.company_name ?? 'My Company'}</p>
          {settings?.company_address && <p style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{settings.company_address.replace(/\n/g, ' · ')}</p>}
          {settings?.tax_number && <p style={{ fontSize: '10px', color: '#64748b' }}>TPIN: {settings.tax_number}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '18px', fontWeight: 800, color: '#4f46e5' }}>PAYSLIP</p>
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Pay Period: <strong style={{ color: '#1e293b' }}>{period}</strong></p>
          <p style={{ fontSize: '10px', color: '#64748b' }}>{run?.run_number}</p>
        </div>
      </div>

      {/* Employee details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4mm', marginBottom: '5mm', padding: '4mm 5mm', background: '#f8fafc', borderRadius: '4px' }}>
        <div>
          <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>Employee</p>
          <p style={{ fontWeight: 700, fontSize: '13px' }}>{emp?.full_name}</p>
          <p style={{ fontSize: '10px', color: '#64748b' }}>{emp?.job_title ?? ''}{emp?.department ? ` · ${emp.department}` : ''}</p>
        </div>
        <div>
          <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>Details</p>
          <p style={{ fontSize: '11px' }}>Emp No: <strong>{emp?.employee_number}</strong></p>
          {emp?.nrc_number && <p style={{ fontSize: '11px' }}>NRC: {emp.nrc_number}</p>}
          {emp?.bank_name && <p style={{ fontSize: '11px' }}>Bank: {emp.bank_name} — {emp.bank_account}</p>}
        </div>
      </div>

      {/* Earnings & Deductions side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5mm', marginBottom: '4mm' }}>
        {/* Earnings */}
        <div>
          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1e1b4b', background: '#e0e7ff', padding: '3px 6px', borderRadius: '3px', marginBottom: '3px' }}>Earnings</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { label: 'Basic Salary', value: entry.basic_salary },
                ...(entry.housing_allowance > 0 ? [{ label: 'Housing Allowance', value: entry.housing_allowance }] : []),
                ...(entry.transport_allowance > 0 ? [{ label: 'Transport Allowance', value: entry.transport_allowance }] : []),
                ...(entry.other_allowances > 0 ? [{ label: 'Other Allowances', value: entry.other_allowances }] : []),
              ].map(({ label, value }) => (
                <tr key={label}>
                  <td style={{ padding: '2.5px 4px', fontSize: '11px', color: '#475569' }}>{label}</td>
                  <td style={{ padding: '2.5px 4px', fontSize: '11px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(value)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '3px 4px', fontSize: '11px', fontWeight: 700 }}>Gross Pay</td>
                <td style={{ padding: '3px 4px', fontSize: '11px', fontWeight: 700, textAlign: 'right', color: '#4f46e5', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(entry.gross_pay)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Deductions */}
        <div>
          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#991b1b', background: '#fee2e2', padding: '3px 6px', borderRadius: '3px', marginBottom: '3px' }}>Deductions</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { label: 'PAYE (Income Tax)', value: entry.paye },
                { label: 'NAPSA (5%)', value: entry.napsa_employee },
                { label: 'NHIMA (0.5%)', value: entry.nhima_employee },
                ...(entry.salary_advance > 0 ? [{ label: 'Salary Advance', value: entry.salary_advance }] : []),
                ...(entry.other_deductions > 0 ? [{ label: 'Other Deductions', value: entry.other_deductions }] : []),
              ].map(({ label, value }) => (
                <tr key={label}>
                  <td style={{ padding: '2.5px 4px', fontSize: '11px', color: '#475569' }}>{label}</td>
                  <td style={{ padding: '2.5px 4px', fontSize: '11px', textAlign: 'right', color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>({formatCurrency(value)})</td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '3px 4px', fontSize: '11px', fontWeight: 700 }}>Total Deductions</td>
                <td style={{ padding: '3px 4px', fontSize: '11px', fontWeight: 700, textAlign: 'right', color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>({formatCurrency(entry.total_deductions)})</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Net pay */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3mm' }}>
        <div style={{ background: '#1e1b4b', color: 'white', padding: '5px 14px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ fontSize: '11px', opacity: 0.8 }}>NET PAY</span>
          <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(entry.net_pay)}</span>
        </div>
      </div>

      {/* Employer contributions (info only) */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '3mm', display: 'flex', gap: '16px' }}>
        <p style={{ fontSize: '10px', color: '#94a3b8' }}>Employer contributions (not deducted from employee):</p>
        <p style={{ fontSize: '10px', color: '#64748b' }}>NAPSA: {formatCurrency(entry.napsa_employer)}</p>
        <p style={{ fontSize: '10px', color: '#64748b' }}>NHIMA: {formatCurrency(entry.nhima_employer)}</p>
        <p style={{ fontSize: '10px', color: '#64748b' }}>SDL: {formatCurrency(entry.sdl)}</p>
      </div>

      {entry.notes && <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2mm' }}>Note: {entry.notes}</p>}
    </div>
  )
}

export function PayslipPrintPage() {
  const { runId } = useParams<{ runId: string }>()
  const [entries, setEntries] = useState<Entry[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!runId) return
    Promise.all([
      supabase.from('payroll_entries').select('*, employees(employee_number, full_name, job_title, department, nrc_number, tpin, bank_name, bank_account), payroll_runs(run_number, period_year, period_month)').eq('run_id', runId).order('created_at' as never),
      supabase.from('settings').select('*').single(),
    ]).then(([{ data: ents }, { data: cfg }]) => {
      setEntries(ents ?? [])
      setSettings(cfg as Settings)
      setLoading(false)
    })
  }, [runId])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm" style={{ color: '#64748b' }}>Loading payslips…</div>
  }

  const run = entries[0]?.payroll_runs
  const period = run ? `${MONTH_NAMES[run.period_month - 1]} ${run.period_year}` : ''

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        body { background: #f1f5f9; }
      `}</style>

      <div
        className="no-print fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-6 py-3"
        style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}
      >
        <Link to="/payroll" className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#64748b' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Payroll
        </Link>
        <div className="flex-1" />
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {entries.length} payslip{entries.length !== 1 ? 's' : ''} — {period}
        </span>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#4f46e5', color: 'white' }}
        >
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      <div className="no-print pt-16" />
      <div className="py-8 px-6" style={{ maxWidth: '230mm', margin: '0 auto' }}>
        {entries.map(entry => (
          <Payslip key={entry.id} entry={entry} settings={settings} />
        ))}
      </div>
    </>
  )
}
