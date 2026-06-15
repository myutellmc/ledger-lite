import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
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
  const totalAssets = sum(assets)
  const totalLiabilities = sum(liabilities)
  const totalEquity = sum(equity)

  function renderSection(title: string, accounts: AccountBalance[], subtotalLabel: string, highlight?: boolean) {
    const total = sum(accounts)
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between py-2 border-b border-gray-200 mb-2">
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        {accounts.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No accounts</p>
        ) : (
          accounts.map(a => (
            <div key={a.code} className="flex justify-between py-1.5 text-sm">
              <span className="text-gray-600">{a.code} — {a.name}</span>
              <span className="font-medium text-gray-900">{formatCurrency(a.balance)}</span>
            </div>
          ))
        )}
        <div className={`flex justify-between py-2 mt-1 border-t border-gray-200 ${highlight ? 'font-bold' : 'font-semibold'}`}>
          <span className={highlight ? 'text-gray-900' : 'text-gray-700'}>{subtotalLabel}</span>
          <span className={highlight ? (total >= 0 ? 'text-green-700' : 'text-red-700') : 'text-gray-900'}>{formatCurrency(total)}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Financial Reports" description="Profit & Loss, Balance Sheet, and Trial Balance" />

      <div className="p-8 space-y-6">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex gap-2">
              {(['pl', 'balance', 'trial'] as ReportType[]).map(r => (
                <Button
                  key={r}
                  variant={report === r ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setReport(r)}
                >
                  {r === 'pl' ? 'Profit & Loss' : r === 'balance' ? 'Balance Sheet' : 'Trial Balance'}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <Input label="" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" />
              <span className="text-gray-400 text-sm">to</span>
              <Input label="" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" />
              <Button size="sm" variant="secondary" onClick={runReport}>Refresh</Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-10 text-sm text-gray-400">Generating report...</div>
        ) : (
          <div className="max-w-2xl">
            {report === 'pl' && (
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">Profit & Loss Statement</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{dateFrom} to {dateTo}</p>
                </CardHeader>
                <CardContent>
                  {renderSection('Revenue', revenue, 'Total Revenue')}
                  {renderSection('Expenses', expenses, 'Total Expenses')}
                  <div className={`flex justify-between py-3 border-t-2 border-gray-300 font-bold text-base`}>
                    <span className="text-gray-900">Net Income</span>
                    <span className={netIncome >= 0 ? 'text-green-700' : 'text-red-700'}>{formatCurrency(netIncome)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {report === 'balance' && (
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">Balance Sheet</h2>
                  <p className="text-xs text-gray-500 mt-0.5">As at {dateTo}</p>
                </CardHeader>
                <CardContent>
                  {renderSection('Assets', assets, 'Total Assets')}
                  {renderSection('Liabilities', liabilities, 'Total Liabilities')}
                  {renderSection('Equity', equity, 'Total Equity')}
                  <div className="flex justify-between py-3 border-t-2 border-gray-300 font-bold text-base">
                    <span className="text-gray-900">Total Liabilities + Equity</span>
                    <span className={Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 ? 'text-green-700' : 'text-red-600'}>
                      {formatCurrency(totalLiabilities + totalEquity)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {report === 'trial' && (
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">Trial Balance</h2>
                  <p className="text-xs text-gray-500 mt-0.5">As at {dateTo}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3 py-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    <span className="col-span-1">Code</span>
                    <span className="col-span-2">Account</span>
                    <span className="col-span-1 text-right">Balance</span>
                  </div>
                  {data.map(a => (
                    <div key={a.code} className="grid grid-cols-4 gap-3 py-1.5 text-sm border-b border-gray-50">
                      <span className="col-span-1 font-mono text-gray-500">{a.code}</span>
                      <span className="col-span-2 text-gray-800">{a.name}</span>
                      <span className={`col-span-1 text-right font-medium ${a.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(a.balance)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
