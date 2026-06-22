import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, TableHead, TableBody, DataRow, Th, Td, EmptyState } from '@/components/ui/TableRow'

type ReportType = 'pl' | 'balance' | 'trial' | 'aged_receivables' | 'aged_payables' | 'cashflow' | 'vat_return'

interface AccountBalance {
  code: string
  name: string
  type: string
  balance: number
}

interface AgedItem {
  id: string
  number: string
  contact_name: string
  issue_date: string
  due_date: string
  total: number
  status: string
  days_overdue: number
}

const REPORT_TABS: { key: ReportType; label: string }[] = [
  { key: 'pl', label: 'Profit & Loss' },
  { key: 'balance', label: 'Balance Sheet' },
  { key: 'cashflow', label: 'Cash Flow' },
  { key: 'trial', label: 'Trial Balance' },
  { key: 'aged_receivables', label: 'Aged Receivables' },
  { key: 'aged_payables', label: 'Aged Payables' },
  { key: 'vat_return', label: 'VAT Return' },
]

function ageBucket(daysOverdue: number): string {
  if (daysOverdue <= 0) return 'Current'
  if (daysOverdue <= 30) return '1–30 days'
  if (daysOverdue <= 60) return '31–60 days'
  if (daysOverdue <= 90) return '61–90 days'
  return '90+ days'
}

function ageBadgeVariant(daysOverdue: number): 'success' | 'warning' | 'danger' | 'neutral' {
  if (daysOverdue <= 0) return 'success'
  if (daysOverdue <= 30) return 'warning'
  if (daysOverdue <= 60) return 'danger'
  return 'danger'
}

export function ReportsPage() {
  const [report, setReport] = useState<ReportType>('pl')
  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-01-01`)
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState<AccountBalance[]>([])
  const [agedReceivables, setAgedReceivables] = useState<AgedItem[]>([])
  const [agedPayables, setAgedPayables] = useState<AgedItem[]>([])
  const [loading, setLoading] = useState(false)
  // Cash flow payment breakdown
  const [cashByMethod, setCashByMethod] = useState<{ method: string; total: number; count: number }[]>([])
  const [cashInflow, setCashInflow] = useState(0)
  const [cashOutflow, setCashOutflow] = useState(0)

  // VAT Return state
  const [vatMonth, setVatMonth] = useState(new Date().getMonth() + 1)
  const [vatYear, setVatYear]   = useState(new Date().getFullYear())
  const [vatOutput, setVatOutput] = useState<{ number: string; contact: string; date: string; subtotal: number; tax: number; total: number }[]>([])
  const [vatInput, setVatInput]   = useState<{ number: string; contact: string; date: string; subtotal: number; tax: number; total: number }[]>([])
  const [vatLoading, setVatLoading] = useState(false)

  async function loadVatReturn() {
    setVatLoading(true)
    const from = `${vatYear}-${String(vatMonth).padStart(2, '0')}-01`
    const to   = new Date(vatYear, vatMonth, 0).toISOString().split('T')[0]
    const [{ data: invs }, { data: bls }] = await Promise.all([
      supabase.from('invoices').select('number, issue_date, subtotal, tax_amount, total, contacts(name)').gte('issue_date', from).lte('issue_date', to).neq('status', 'cancelled'),
      supabase.from('bills').select('number, issue_date, subtotal, tax_amount, total, contacts(name)').gte('issue_date', from).lte('issue_date', to).neq('status', 'cancelled'),
    ])
    setVatOutput(((invs ?? []) as any[]).map(r => ({ number: r.number, contact: r.contacts?.name ?? '—', date: r.issue_date, subtotal: r.subtotal, tax: r.tax_amount, total: r.total })))
    setVatInput(((bls ?? []) as any[]).map(r => ({ number: r.number, contact: r.contacts?.name ?? '—', date: r.issue_date, subtotal: r.subtotal, tax: r.tax_amount, total: r.total })))
    setVatLoading(false)
  }

  useEffect(() => { if (report === 'vat_return') loadVatReturn() }, [report, vatMonth, vatYear])

  async function runReport() {
    setLoading(true)
    const [{ data: accounts }, { data: invoices }, { data: bills }, { data: pmtsIn }, { data: pmtsOut }] = await Promise.all([
      supabase.from('accounts').select('code, name, type, balance').order('code'),
      supabase.from('invoices').select('id, number, issue_date, due_date, total, status, contacts(name)').in('status', ['sent', 'overdue', 'paid']),
      supabase.from('bills').select('id, number, issue_date, due_date, total, status, contacts(name)').in('status', ['received', 'overdue', 'paid']),
      supabase.from('payments').select('amount, payment_method').not('invoice_id', 'is', null).gte('date', dateFrom).lte('date', dateTo),
      supabase.from('payments').select('amount, payment_method').not('bill_id', 'is', null).gte('date', dateFrom).lte('date', dateTo),
    ])
    setData(accounts ?? [])

    // Cash flow by payment method
    const allInflow = pmtsIn ?? []
    const allOutflow = pmtsOut ?? []
    const methodMap: Record<string, { total: number; count: number }> = {}
    for (const p of allInflow) {
      const m = p.payment_method ?? 'unspecified'
      if (!methodMap[m]) methodMap[m] = { total: 0, count: 0 }
      methodMap[m].total += p.amount
      methodMap[m].count += 1
    }
    setCashByMethod(Object.entries(methodMap).map(([method, v]) => ({ method, ...v })).sort((a, b) => b.total - a.total))
    setCashInflow(allInflow.reduce((s, p) => s + p.amount, 0))
    setCashOutflow(allOutflow.reduce((s, p) => s + p.amount, 0))

    const today = new Date()
    const mapAged = (rows: { id: string; number: string; issue_date: string; due_date: string; total: number; status: string; contacts: { name: string } | null }[]) =>
      (rows ?? []).filter(r => r.status !== 'paid').map(r => ({
        id: r.id,
        number: r.number,
        contact_name: r.contacts?.name ?? '—',
        issue_date: r.issue_date,
        due_date: r.due_date,
        total: r.total,
        status: r.status,
        days_overdue: Math.floor((today.getTime() - new Date(r.due_date).getTime()) / 86400000),
      })).sort((a, b) => b.days_overdue - a.days_overdue)

    setAgedReceivables(mapAged(invoices as never ?? []))
    setAgedPayables(mapAged(bills as never ?? []))
    setLoading(false)
  }

  useEffect(() => { runReport() }, [report])

  const byType = (type: string) => data.filter(a => a.type === type)
  const sum = (accounts: AccountBalance[]) => accounts.reduce((s, a) => s + a.balance, 0)

  const revenue = byType('revenue')
  const expenses = byType('expense')
  const assets = byType('asset')
  const liabilities = byType('liability')
  const equity = byType('equity')

  const totalRevenue = sum(revenue)
  const totalExpenses = sum(expenses)
  const netIncome = totalRevenue - totalExpenses
  const totalAssets = sum(assets)
  const totalLiabilities = sum(liabilities)
  const totalEquity = sum(equity)

  // Cash flow: operating = net income + non-cash adjustments (simplified)
  const cashFromOperations = netIncome
  const cashFromInvesting = -sum(assets.filter(a => a.name.toLowerCase().includes('equipment') || a.name.toLowerCase().includes('asset')))
  const netCashFlow = cashFromOperations + cashFromInvesting

  function Section({ title, accounts, label }: { title: string; accounts: AccountBalance[]; label: string }) {
    const total = sum(accounts)
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between pb-2 mb-1" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>{title}</h3>
        </div>
        {accounts.length === 0 ? (
          <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>No accounts</p>
        ) : accounts.map(a => (
          <div key={a.code} className="flex justify-between py-1.5 text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>
              <span className="font-mono mr-2 text-xs" style={{ color: 'var(--text-muted)' }}>{a.code}</span>{a.name}
            </span>
            <span className="font-medium" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(a.balance)}</span>
          </div>
        ))}
        <div className="flex justify-between py-2 mt-1 text-sm font-semibold" style={{ borderTop: '1px solid var(--border-default)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(total)}</span>
        </div>
      </div>
    )
  }

  function CashFlowLine({ label, amount, sub }: { label: string; amount: number; sub?: boolean }) {
    return (
      <div className="flex justify-between py-1.5 text-sm" style={{ paddingLeft: sub ? 24 : 0 }}>
        <span style={{ color: sub ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: sub ? 400 : 500 }}>{label}</span>
        <span style={{ color: amount >= 0 ? 'var(--text-primary)' : '#dc2626', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{formatCurrency(amount)}</span>
      </div>
    )
  }

  function AgedBucketSummary({ items }: { items: AgedItem[] }) {
    const buckets = ['Current', '1–30 days', '31–60 days', '61–90 days', '90+ days']
    return (
      <div className="grid grid-cols-5 gap-3 mb-5">
        {buckets.map(b => {
          const total = items.filter(i => ageBucket(i.days_overdue) === b).reduce((s, i) => s + i.total, 0)
          const count = items.filter(i => ageBucket(i.days_overdue) === b).length
          return (
            <Card key={b}>
              <div className="px-4 py-3">
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{b}</p>
                <p className="text-base font-bold" style={{ color: b === 'Current' ? '#10b981' : b === '90+ days' ? '#dc2626' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(total)}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{count} {count === 1 ? 'item' : 'items'}</p>
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Financial Reports" description="Profit & Loss, Balance Sheet, Cash Flow, Trial Balance, Aged reports" />

      <div className="p-8 space-y-5">
        <Card>
          <div className="px-6 py-4 flex flex-wrap items-center gap-4">
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--border-light)' }}>
              {REPORT_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setReport(key)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap"
                  style={{
                    background: report === key ? 'white' : 'transparent',
                    color: report === key ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: report === key ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {[
                { label: 'This Month', fn: () => {
                  const n = new Date(); const y = n.getFullYear(); const m = n.getMonth()
                  setDateFrom(`${y}-${String(m+1).padStart(2,'0')}-01`)
                  setDateTo(new Date(y, m+1, 0).toISOString().split('T')[0])
                }},
                { label: 'Last Month', fn: () => {
                  const n = new Date(); const y = n.getFullYear(); const m = n.getMonth() - 1
                  const yr = m < 0 ? y - 1 : y; const mo = m < 0 ? 11 : m
                  setDateFrom(`${yr}-${String(mo+1).padStart(2,'0')}-01`)
                  setDateTo(new Date(yr, mo+1, 0).toISOString().split('T')[0])
                }},
                { label: 'This Quarter', fn: () => {
                  const n = new Date(); const y = n.getFullYear(); const q = Math.floor(n.getMonth() / 3)
                  setDateFrom(`${y}-${String(q*3+1).padStart(2,'0')}-01`)
                  setDateTo(new Date(y, q*3+3, 0).toISOString().split('T')[0])
                }},
                { label: 'This Year', fn: () => {
                  const y = new Date().getFullYear()
                  setDateFrom(`${y}-01-01`); setDateTo(`${y}-12-31`)
                }},
              ].map(({ label, fn }) => (
                <button key={label} onClick={() => { fn(); setTimeout(runReport, 0) }}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                  style={{ background: 'var(--border-light)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.color = '#6366f1' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                >{label}</button>
              ))}
              <Input label="" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>to</span>
              <Input label="" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" />
              <Button size="sm" variant="secondary" onClick={runReport}>Refresh</Button>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>Generating report...</div>
        ) : (
          <>
            {/* ── P&L ── */}
            {report === 'pl' && (
              <div className="max-w-2xl">
                <Card>
                  <div className="px-6 pt-6 pb-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Profit & Loss Statement</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{dateFrom} to {dateTo}</p>
                  </div>
                  <div className="px-6 py-5">
                    <Section title="Revenue" accounts={revenue} label="Total Revenue" />
                    <Section title="Expenses" accounts={expenses} label="Total Expenses" />
                    <div className="flex justify-between py-3 text-base font-bold" style={{ borderTop: '2px solid var(--border-default)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>Net Income</span>
                      <span style={{ color: netIncome >= 0 ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(netIncome)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* ── Balance Sheet ── */}
            {report === 'balance' && (
              <div className="max-w-2xl">
                <Card>
                  <div className="px-6 pt-6 pb-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Balance Sheet</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>As at {dateTo}</p>
                  </div>
                  <div className="px-6 py-5">
                    <Section title="Assets" accounts={assets} label="Total Assets" />
                    <Section title="Liabilities" accounts={liabilities} label="Total Liabilities" />
                    <Section title="Equity" accounts={equity} label="Total Equity" />
                    <div className="flex justify-between py-3 text-base font-bold" style={{ borderTop: '2px solid var(--border-default)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>Total Liabilities + Equity</span>
                      <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalLiabilities + totalEquity)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* ── Cash Flow ── */}
            {report === 'cashflow' && (
              <div className="space-y-4 max-w-3xl">
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Cash Inflows', value: cashInflow, color: '#16a34a', note: 'Payments received from customers' },
                    { label: 'Cash Outflows', value: cashOutflow, color: '#dc2626', note: 'Payments made to vendors' },
                    { label: 'Net Cash Flow', value: cashInflow - cashOutflow, color: (cashInflow - cashOutflow) >= 0 ? '#2563eb' : '#dc2626', note: 'Inflows minus outflows' },
                  ].map(({ label, value, color, note }) => (
                    <Card key={label}>
                      <div className="px-5 py-4">
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                        <p className="text-2xl font-bold mb-0.5" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(value)}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{note}</p>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Payment method breakdown */}
                <Card>
                  <div className="px-6 pt-5 pb-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Inflows by Payment Method</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{dateFrom} to {dateTo}</p>
                  </div>
                  <div className="px-6 py-5">
                    {cashByMethod.length === 0 ? (
                      <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No payments recorded in this period</p>
                    ) : (
                      <>
                        {cashByMethod.map(({ method, total, count }) => {
                          const pct = cashInflow > 0 ? (total / cashInflow) * 100 : 0
                          const label: Record<string, string> = { cash: 'Cash', mobile_money: 'Mobile Money', bank_transfer: 'Bank Transfer', cheque: 'Cheque', unspecified: 'Unspecified' }
                          const color: Record<string, string> = { cash: '#16a34a', mobile_money: '#7c3aed', bank_transfer: '#2563eb', cheque: '#0891b2', unspecified: '#94a3b8' }
                          return (
                            <div key={method} className="mb-4">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: color[method] ?? '#94a3b8', display: 'inline-block' }} />
                                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label[method] ?? method}</span>
                                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{count} {count === 1 ? 'payment' : 'payments'}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(total)}</span>
                                  <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{pct.toFixed(1)}%</span>
                                </div>
                              </div>
                              <div className="h-2 rounded-full" style={{ background: 'var(--border-light)' }}>
                                <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color[method] ?? '#94a3b8' }} />
                              </div>
                            </div>
                          )
                        })}
                        <div className="flex justify-between pt-3 text-sm font-semibold" style={{ borderTop: '1px solid var(--border-default)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Total received</span>
                          <span style={{ color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(cashInflow)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </Card>

                {/* Traditional cash flow statement */}
                <Card>
                  <div className="px-6 pt-5 pb-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Cash Flow Statement</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Indirect method · {dateFrom} to {dateTo}</p>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    <div>
                      <div className="pb-2 mb-1" style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>Operating Activities</h3>
                      </div>
                      <CashFlowLine label="Net income" amount={netIncome} sub />
                      <CashFlowLine label="Changes in receivables" amount={-sum(assets.filter(a => a.name.toLowerCase().includes('receivable')))} sub />
                      <CashFlowLine label="Changes in payables" amount={sum(liabilities.filter(a => a.name.toLowerCase().includes('payable')))} sub />
                      <div className="flex justify-between py-2 text-sm font-semibold mt-1" style={{ borderTop: '1px solid var(--border-default)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Net cash from operations</span>
                        <span style={{ color: cashFromOperations >= 0 ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(cashFromOperations)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="pb-2 mb-1" style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>Investing Activities</h3>
                      </div>
                      <CashFlowLine label="Purchase of assets" amount={cashFromInvesting} sub />
                      <div className="flex justify-between py-2 text-sm font-semibold mt-1" style={{ borderTop: '1px solid var(--border-default)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Net cash from investing</span>
                        <span style={{ color: cashFromInvesting >= 0 ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(cashFromInvesting)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between py-3 text-base font-bold" style={{ borderTop: '2px solid var(--border-default)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>Net Change in Cash</span>
                      <span style={{ color: netCashFlow >= 0 ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(netCashFlow)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* ── Trial Balance ── */}
            {report === 'trial' && (
              <div className="max-w-2xl">
                <Card>
                  <div className="px-6 pt-6 pb-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Trial Balance</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>As at {dateTo}</p>
                  </div>
                  <div className="px-6 py-5">
                    <div className="flex gap-4 pb-2 mb-1 text-xs font-semibold uppercase tracking-wide" style={{ borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                      <span className="w-16">Code</span>
                      <span className="flex-1">Account</span>
                      <span className="text-right w-28">Balance</span>
                    </div>
                    {data.map(a => (
                      <div key={a.code} className="flex gap-4 py-1.5 text-sm" style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <span className="w-16 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{a.code}</span>
                        <span className="flex-1" style={{ color: 'var(--text-secondary)' }}>{a.name}</span>
                        <span className="w-28 text-right font-medium" style={{ color: a.balance < 0 ? '#dc2626' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(a.balance)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ── Aged Receivables ── */}
            {report === 'aged_receivables' && (
              <div>
                <AgedBucketSummary items={agedReceivables} />
                <Card>
                  <div className="px-6 pt-5 pb-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Aged Receivables</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Unpaid invoices as at {dateTo}</p>
                  </div>
                  <DataTable>
                    <TableHead>
                      <Th>Invoice</Th>
                      <Th>Customer</Th>
                      <Th>Issued</Th>
                      <Th>Due</Th>
                      <Th>Age</Th>
                      <Th right>Amount</Th>
                    </TableHead>
                    <TableBody>
                      {agedReceivables.length === 0 ? (
                        <EmptyState title="No outstanding receivables" description="All invoices are paid or there are no invoices yet" />
                      ) : agedReceivables.map(item => (
                        <DataRow key={item.id}>
                          <Td mono style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.number}</Td>
                          <Td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.contact_name}</Td>
                          <Td>{formatDate(item.issue_date)}</Td>
                          <Td>{formatDate(item.due_date)}</Td>
                          <Td>
                            <Badge variant={ageBadgeVariant(item.days_overdue)}>
                              {ageBucket(item.days_overdue)}
                            </Badge>
                          </Td>
                          <Td right mono style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(item.total)}</Td>
                        </DataRow>
                      ))}
                    </TableBody>
                  </DataTable>
                </Card>
              </div>
            )}

            {/* ── Aged Payables ── */}
            {report === 'aged_payables' && (
              <div>
                <AgedBucketSummary items={agedPayables} />
                <Card>
                  <div className="px-6 pt-5 pb-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Aged Payables</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Unpaid bills as at {dateTo}</p>
                  </div>
                  <DataTable>
                    <TableHead>
                      <Th>Bill</Th>
                      <Th>Vendor</Th>
                      <Th>Issued</Th>
                      <Th>Due</Th>
                      <Th>Age</Th>
                      <Th right>Amount</Th>
                    </TableHead>
                    <TableBody>
                      {agedPayables.length === 0 ? (
                        <EmptyState title="No outstanding payables" description="All bills are paid or there are no bills yet" />
                      ) : agedPayables.map(item => (
                        <DataRow key={item.id}>
                          <Td mono style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.number}</Td>
                          <Td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.contact_name}</Td>
                          <Td>{formatDate(item.issue_date)}</Td>
                          <Td>{formatDate(item.due_date)}</Td>
                          <Td>
                            <Badge variant={ageBadgeVariant(item.days_overdue)}>
                              {ageBucket(item.days_overdue)}
                            </Badge>
                          </Td>
                          <Td right mono style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(item.total)}</Td>
                        </DataRow>
                      ))}
                    </TableBody>
                  </DataTable>
                </Card>
              </div>
            )}
            {/* ── VAT Return ── */}
            {report === 'vat_return' && (
              <div className="space-y-5">
                {/* Period selector */}
                <Card>
                  <div className="px-6 py-4 flex items-center gap-4">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>VAT Period:</p>
                    <select
                      className="h-9 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      style={{ background: 'white', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      value={vatMonth}
                      onChange={e => setVatMonth(+e.target.value)}
                    >
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    <select
                      className="h-9 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      style={{ background: 'white', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                      value={vatYear}
                      onChange={e => setVatYear(+e.target.value)}
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <Button size="sm" variant="secondary" onClick={loadVatReturn}>Refresh</Button>
                  </div>
                </Card>

                {vatLoading ? (
                  <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>Loading VAT data…</div>
                ) : (() => {
                  const totalOutputTax   = vatOutput.reduce((s, r) => s + r.tax, 0)
                  const totalInputTax    = vatInput.reduce((s, r) => s + r.tax, 0)
                  const totalOutputValue = vatOutput.reduce((s, r) => s + r.subtotal, 0)
                  const totalInputValue  = vatInput.reduce((s, r) => s + r.subtotal, 0)
                  const netVat           = totalOutputTax - totalInputTax
                  const monthName = ['January','February','March','April','May','June','July','August','September','October','November','December'][vatMonth - 1]

                  return (
                    <div className="max-w-3xl space-y-5">
                      {/* Summary boxes — mirrors ZRA VAT 3 form structure */}
                      <Card>
                        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>VAT 3 Return Summary — {monthName} {vatYear}</h3>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Due 18th of following month · File on ZRA TaxOnline portal</p>
                        </div>
                        <div className="px-6 py-5 space-y-3">
                          {[
                            { label: 'Box 1 — Value of taxable supplies (excl. VAT)', value: totalOutputValue, note: 'Total sales before VAT', color: 'var(--text-primary)' },
                            { label: 'Box 2 — Output Tax (16% VAT on sales)', value: totalOutputTax, note: 'VAT charged to customers', color: '#4f46e5' },
                            { label: 'Box 3 — Value of taxable purchases (excl. VAT)', value: totalInputValue, note: 'Total purchases before VAT', color: 'var(--text-primary)' },
                            { label: 'Box 4 — Input Tax (VAT on purchases)', value: totalInputTax, note: 'VAT paid to suppliers — claimable', color: '#16a34a' },
                          ].map(({ label, value, note, color }) => (
                            <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
                              <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{note}</p>
                              </div>
                              <span className="text-base font-bold ml-6" style={{ color, fontVariantNumeric: 'tabular-nums', minWidth: '120px', textAlign: 'right' }}>{formatCurrency(value)}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between py-3 mt-1 rounded-lg px-4" style={{ background: netVat > 0 ? '#fef2f2' : '#f0fdf4' }}>
                            <div>
                              <p className="text-sm font-bold" style={{ color: netVat > 0 ? '#dc2626' : '#16a34a' }}>
                                {netVat > 0 ? 'Box 5 — Net VAT Payable to ZRA' : 'Box 5 — VAT Refund Claimable from ZRA'}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Output Tax − Input Tax</p>
                            </div>
                            <span className="text-xl font-bold" style={{ color: netVat > 0 ? '#dc2626' : '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(Math.abs(netVat))}
                            </span>
                          </div>
                        </div>
                      </Card>

                      {/* Output tax detail */}
                      <Card>
                        <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Output Tax Detail — Sales Invoices ({vatOutput.length})</p>
                        </div>
                        <DataTable>
                          <TableHead>
                            <Th>Invoice</Th><Th>Customer</Th><Th>Date</Th>
                            <Th right>Taxable Value</Th><Th right>VAT (16%)</Th><Th right>Total</Th>
                          </TableHead>
                          <TableBody>
                            {vatOutput.length === 0 ? (
                              <EmptyState title="No invoices in this period" description="No invoices were issued in the selected month" />
                            ) : vatOutput.map(r => (
                              <DataRow key={r.number}>
                                <Td mono style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.number}</Td>
                                <Td style={{ color: 'var(--text-primary)' }}>{r.contact}</Td>
                                <Td>{formatDate(r.date)}</Td>
                                <Td right mono>{formatCurrency(r.subtotal)}</Td>
                                <Td right mono style={{ color: '#4f46e5' }}>{formatCurrency(r.tax)}</Td>
                                <Td right mono style={{ fontWeight: 600 }}>{formatCurrency(r.total)}</Td>
                              </DataRow>
                            ))}
                          </TableBody>
                        </DataTable>
                      </Card>

                      {/* Input tax detail */}
                      <Card>
                        <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Input Tax Detail — Purchase Bills ({vatInput.length})</p>
                        </div>
                        <DataTable>
                          <TableHead>
                            <Th>Bill</Th><Th>Supplier</Th><Th>Date</Th>
                            <Th right>Taxable Value</Th><Th right>VAT (Input)</Th><Th right>Total</Th>
                          </TableHead>
                          <TableBody>
                            {vatInput.length === 0 ? (
                              <EmptyState title="No bills in this period" description="No purchase bills were received in the selected month" />
                            ) : vatInput.map(r => (
                              <DataRow key={r.number}>
                                <Td mono style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.number}</Td>
                                <Td style={{ color: 'var(--text-primary)' }}>{r.contact}</Td>
                                <Td>{formatDate(r.date)}</Td>
                                <Td right mono>{formatCurrency(r.subtotal)}</Td>
                                <Td right mono style={{ color: '#16a34a' }}>{formatCurrency(r.tax)}</Td>
                                <Td right mono style={{ fontWeight: 600 }}>{formatCurrency(r.total)}</Td>
                              </DataRow>
                            ))}
                          </TableBody>
                        </DataTable>
                      </Card>
                    </div>
                  )
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
