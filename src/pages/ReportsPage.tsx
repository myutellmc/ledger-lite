import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, TableHead, TableBody, DataRow, Th, Td, EmptyState } from '@/components/ui/TableRow'

type ReportType = 'pl' | 'balance' | 'trial' | 'aged_receivables' | 'aged_payables' | 'cashflow'

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

  async function runReport() {
    setLoading(true)
    const [{ data: accounts }, { data: invoices }, { data: bills }] = await Promise.all([
      supabase.from('accounts').select('code, name, type, balance').order('code'),
      supabase.from('invoices').select('id, number, issue_date, due_date, total, status, contacts(name)').in('status', ['sent', 'overdue', 'paid']),
      supabase.from('bills').select('id, number, issue_date, due_date, total, status, contacts(name)').in('status', ['received', 'overdue', 'paid']),
    ])
    setData(accounts ?? [])

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
            <div className="flex items-center gap-2 ml-auto">
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
              <div className="max-w-2xl">
                <Card>
                  <div className="px-6 pt-6 pb-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Cash Flow Statement</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{dateFrom} to {dateTo}</p>
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
          </>
        )}
      </div>
    </div>
  )
}
