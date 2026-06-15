import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/layout/PageHeader'

type ReportType = 'pl' | 'balance' | 'trial'

interface AccountBalance {
  code: string
  name: string
  type: string
  balance: number
}

export function ReportsPage() {
  const [report, setReport] = useState<ReportType>('pl')
  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-01-01`)
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState<AccountBalance[]>([])
  const [loading, setLoading] = useState(false)

  async function runReport() {
    setLoading(true)
    const { data: accounts } = await supabase.from('accounts').select('code, name, type, balance').order('code')
    setData(accounts ?? [])
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
  const totalLiabilities = sum(liabilities)
  const totalEquity = sum(equity)

  function Section({ title, accounts, label }: { title: string; accounts: AccountBalance[]; label: string }) {
    const total = sum(accounts)
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between pb-2 mb-1" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{title}</h3>
        </div>
        {accounts.length === 0 ? (
          <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>No accounts</p>
        ) : accounts.map(a => (
          <div key={a.code} className="flex justify-between py-1.5 text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>
              <span className="font-mono mr-2 text-xs" style={{ color: 'var(--text-muted)' }}>{a.code}</span>{a.name}
            </span>
            <span className="font-medium tabular-nums" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(a.balance)}</span>
          </div>
        ))}
        <div className="flex justify-between py-2 mt-1 text-sm font-semibold" style={{ borderTop: '1px solid var(--border-default)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(total)}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Financial Reports" description="Profit & Loss, Balance Sheet, and Trial Balance" />

      <div className="p-8 space-y-5">
        <Card>
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex gap-1.5 p-1 rounded-lg" style={{ background: 'var(--border-light)' }}>
              {(['pl', 'balance', 'trial'] as ReportType[]).map(r => (
                <button
                  key={r}
                  onClick={() => setReport(r)}
                  className="px-3.5 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={{
                    background: report === r ? 'white' : 'transparent',
                    color: report === r ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: report === r ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {r === 'pl' ? 'Profit & Loss' : r === 'balance' ? 'Balance Sheet' : 'Trial Balance'}
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
          <div className="max-w-2xl">
            {report === 'pl' && (
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
            )}

            {report === 'balance' && (
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
            )}

            {report === 'trial' && (
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
            )}
          </div>
        )}
      </div>
    </div>
  )
}
