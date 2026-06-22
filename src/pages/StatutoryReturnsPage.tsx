import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { MONTH_NAMES } from '@/lib/payroll'
import { Printer, ArrowLeft, Download } from 'lucide-react'

interface Entry {
  id: string
  gross_pay: number
  paye: number
  napsa_employee: number
  napsa_employer: number
  nhima_employee: number
  nhima_employer: number
  sdl: number
  total_deductions: number
  net_pay: number
  employees: {
    employee_number: string
    full_name: string
    job_title: string | null
    tpin: string | null
  } | null
}

interface Run {
  run_number: string
  period_year: number
  period_month: number
  total_gross: number
  total_paye: number
  total_napsa_employee: number
  total_napsa_employer: number
  total_nhima_employee: number
  total_nhima_employer: number
  total_sdl: number
  total_net: number
}

interface Settings {
  company_name: string
  tax_number: string | null
  company_address: string | null
  company_email: string | null
  logo_url: string | null
}

export function StatutoryReturnsPage() {
  const { runId } = useParams<{ runId: string }>()
  const [run, setRun]         = useState<Run | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!runId) return
    Promise.all([
      supabase.from('payroll_runs').select('*').eq('id', runId).single(),
      supabase.from('payroll_entries').select('*, employees(employee_number, full_name, job_title, tpin)').eq('run_id', runId).order('created_at' as never),
      supabase.from('settings').select('*').single(),
    ]).then(([{ data: r }, { data: e }, { data: cfg }]) => {
      setRun(r as Run)
      setEntries(e ?? [])
      setSettings(cfg as Settings)
      setLoading(false)
    })
  }, [runId])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm" style={{ color: '#64748b' }}>Loading returns…</div>
  if (!run) return null

  const period  = `${MONTH_NAMES[run.period_month - 1]} ${run.period_year}`
  const today   = new Date().toLocaleDateString('en-GB')
  const napsa10 = new Date(run.period_year, run.period_month, 10)  // 10th of following month
  const dueDate = napsa10.toLocaleDateString('en-GB')

  const cell: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid #e2e8f0', fontSize: '11px', fontVariantNumeric: 'tabular-nums' }
  const hcell: React.CSSProperties = { padding: '7px 8px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'white', background: '#1e1b4b', whiteSpace: 'nowrap' }
  const total = (key: keyof Entry) => entries.reduce((s, e) => s + (e[key] as number), 0)

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        body { background: #f1f5f9; }
        @page { size: A4 landscape; margin: 12mm; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-6 py-3" style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <Link to="/payroll" className="flex items-center gap-1.5 text-sm font-medium" style={{ color: '#64748b' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Payroll
        </Link>
        <span className="text-sm font-semibold ml-2" style={{ color: '#1e293b' }}>Statutory Returns — {period}</span>
        <div className="flex-1" />
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#4f46e5', color: 'white' }}>
          <Download className="w-4 h-4" /> Download PDF
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'white', border: '1px solid #e2e8f0', color: '#475569' }}>
          <Printer className="w-4 h-4" /> Print
        </button>
      </div>
      <div className="no-print pt-16" />

      <div style={{ maxWidth: '297mm', margin: '20px auto', padding: '0 16px' }}>

        {/* ── PAYE Schedule ── */}
        <div style={{ background: 'white', padding: '14mm 14mm', marginBottom: '10mm', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: '#1e293b' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6mm', paddingBottom: '4mm', borderBottom: '2px solid #1e1b4b' }}>
            <div>
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="Company logo" style={{ maxHeight: '44px', maxWidth: '160px', objectFit: 'contain', marginBottom: '6px', display: 'block' }} />
              )}
              <p style={{ fontSize: '16px', fontWeight: 800, color: '#1e1b4b' }}>{settings?.company_name}</p>
              {settings?.tax_number && <p style={{ fontSize: '11px', color: '#64748b' }}>TPIN: {settings.tax_number}</p>}
              {settings?.company_address && <p style={{ fontSize: '11px', color: '#64748b' }}>{settings.company_address.replace(/\n/g, ' · ')}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '16px', fontWeight: 800, color: '#4f46e5' }}>PAYE RETURN SCHEDULE</p>
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Pay Period: <strong style={{ color: '#1e293b' }}>{period}</strong></p>
              <p style={{ fontSize: '11px', color: '#64748b' }}>Due Date: <strong style={{ color: '#dc2626' }}>{dueDate}</strong></p>
              <p style={{ fontSize: '11px', color: '#64748b' }}>Prepared: {today}</p>
            </div>
          </div>

          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4f46e5', marginBottom: '4px' }}>
            Section A — PAYE Employee Schedule
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm' }}>
            <thead>
              <tr>
                {['#', 'Emp No.', 'Full Name', 'TPIN', 'Gross Pay (ZMW)', 'PAYE (ZMW)', 'NAPSA Emp.', 'NAPSA Er.', 'NHIMA Emp.', 'NHIMA Er.', 'SDL', 'Net Pay'].map(h => (
                  <th key={h} style={{ ...hcell, textAlign: h === '#' ? 'center' : h.includes('(') || h === 'Net Pay' ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ ...cell, textAlign: 'center', color: '#94a3b8' }}>{i + 1}</td>
                  <td style={{ ...cell, fontFamily: 'monospace' }}>{e.employees?.employee_number}</td>
                  <td style={{ ...cell, fontWeight: 500 }}>{e.employees?.full_name}</td>
                  <td style={{ ...cell, fontFamily: 'monospace', color: '#64748b' }}>{e.employees?.tpin ?? '—'}</td>
                  <td style={{ ...cell, textAlign: 'right', fontWeight: 600 }}>{formatCurrency(e.gross_pay)}</td>
                  <td style={{ ...cell, textAlign: 'right', color: '#dc2626' }}>{formatCurrency(e.paye)}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{formatCurrency(e.napsa_employee)}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{formatCurrency(e.napsa_employer)}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{formatCurrency(e.nhima_employee)}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{formatCurrency(e.nhima_employer)}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{formatCurrency(e.sdl)}</td>
                  <td style={{ ...cell, textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(e.net_pay)}</td>
                </tr>
              ))}
              {/* Totals */}
              <tr style={{ background: '#1e1b4b', color: 'white' }}>
                <td colSpan={4} style={{ padding: '7px 8px', fontWeight: 700, fontSize: '11px' }}>TOTALS ({entries.length} employees)</td>
                {[
                  total('gross_pay'), total('paye'), total('napsa_employee'),
                  total('napsa_employer'), total('nhima_employee'), total('nhima_employer'),
                  total('sdl'), total('net_pay'),
                ].map((v, i) => (
                  <td key={i} style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, fontSize: '11px', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(v)}</td>
                ))}
              </tr>
            </tbody>
          </table>

          {/* Section B — Summary remittance */}
          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#4f46e5', marginBottom: '4px' }}>
            Section B — Remittance Summary (all due 10th of following month)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4mm', marginBottom: '8mm' }}>
            {[
              { label: 'PAYE Payable to ZRA', value: run.total_paye, note: 'Employee deduction only', color: '#dc2626' },
              { label: 'NAPSA Total to NAPSA', value: run.total_napsa_employee + run.total_napsa_employer, note: `Emp: ${formatCurrency(run.total_napsa_employee)} + Er: ${formatCurrency(run.total_napsa_employer)}`, color: '#4f46e5' },
              { label: 'NHIMA Total to NHIMA', value: run.total_nhima_employee + run.total_nhima_employer, note: `Emp: ${formatCurrency(run.total_nhima_employee)} + Er: ${formatCurrency(run.total_nhima_employer)}`, color: '#7c3aed' },
              { label: 'SDL Payable to ZRA', value: run.total_sdl, note: 'Employer cost only (0.5%)', color: '#0369a1' },
            ].map(({ label, value, note, color }) => (
              <div key={label} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '3px' }}>{label}</p>
                <p style={{ fontSize: '16px', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(value)}</p>
                <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{note}</p>
              </div>
            ))}
          </div>

          {/* Signature */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8mm', marginTop: '4mm', paddingTop: '4mm', borderTop: '1px solid #e2e8f0' }}>
            {['Prepared by', 'Reviewed by', 'Authorised by'].map(s => (
              <div key={s}>
                <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '10mm' }}>{s}</p>
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '3px' }}>
                  <p style={{ fontSize: '10px', color: '#94a3b8' }}>Name / Date / Signature</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
