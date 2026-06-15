import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react'

interface Stats {
  totalRevenue: number
  totalExpenses: number
  outstanding: number
  overdueCount: number
}

interface RecentInvoice {
  id: string
  number: string
  contact: string
  total: number
  status: string
  due_date: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalRevenue: 0, totalExpenses: 0, outstanding: 0, overdueCount: 0 })
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([])
  const [chartData, setChartData] = useState<{ month: string; revenue: number; expenses: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const year = now.getFullYear()
      const startOfYear = `${year}-01-01`

      const [invoicesRes, expensesRes] = await Promise.all([
        supabase.from('invoices').select('total, status, due_date, number, created_at, contacts(name)').gte('created_at', startOfYear),
        supabase.from('expenses').select('amount, date').gte('date', startOfYear),
      ])

      const invoices = invoicesRes.data ?? []
      const expenses = expensesRes.data ?? []

      const paidInvoices = invoices.filter(i => i.status === 'paid')
      const totalRevenue = paidInvoices.reduce((s, i) => s + i.total, 0)
      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
      const outstanding = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total, 0)
      const overdueCount = invoices.filter(i => i.status === 'overdue').length

      setStats({ totalRevenue, totalExpenses, outstanding, overdueCount })

      const monthly: Record<number, { revenue: number; expenses: number }> = {}
      for (let m = 0; m < 12; m++) monthly[m] = { revenue: 0, expenses: 0 }
      paidInvoices.forEach(i => {
        const m = new Date(i.created_at).getMonth()
        monthly[m].revenue += i.total
      })
      expenses.forEach(e => {
        const m = new Date(e.date).getMonth()
        monthly[m].expenses += e.amount
      })
      setChartData(Object.entries(monthly).map(([m, v]) => ({ month: MONTHS[+m], ...v })))

      const recent = invoices
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map(i => ({
          id: i.number,
          number: i.number,
          contact: (i.contacts as unknown as { name: string } | null)?.name ?? 'Unknown',
          total: i.total,
          status: i.status,
          due_date: i.due_date,
        }))
      setRecentInvoices(recent)
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(stats.totalExpenses),
      icon: TrendingDown,
      color: 'text-red-500',
      bg: 'bg-red-50',
    },
    {
      label: 'Outstanding',
      value: formatCurrency(stats.outstanding),
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Overdue Invoices',
      value: stats.overdueCount.toString(),
      icon: AlertCircle,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },
  ]

  return (
    <div>
      <PageHeader title="Dashboard" description={`Financial overview — ${new Date().getFullYear()}`} />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-4 py-5">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-xl font-semibold text-gray-900 mt-0.5">{loading ? '—' : value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <Card>
              <CardHeader>
                <h3 className="font-medium text-gray-900">Revenue vs Expenses</h3>
                <p className="text-xs text-gray-500 mt-0.5">Monthly comparison for {new Date().getFullYear()}</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6272f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6272f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Area type="monotone" dataKey="revenue" stroke="#6272f1" strokeWidth={2} fill="url(#revenue)" name="Revenue" />
                    <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} fill="url(#expenses)" name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h3 className="font-medium text-gray-900">Recent Invoices</h3>
            </CardHeader>
            <div className="divide-y divide-gray-50">
              {loading ? (
                <div className="px-6 py-8 text-sm text-gray-400 text-center">Loading...</div>
              ) : recentInvoices.length === 0 ? (
                <div className="px-6 py-8 text-sm text-gray-400 text-center">No invoices yet</div>
              ) : (
                recentInvoices.map(inv => (
                  <div key={inv.id} className="px-6 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{inv.contact}</p>
                        <p className="text-xs text-gray-500">{inv.number} · Due {formatDate(inv.due_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(inv.total)}</p>
                        <Badge {...statusBadge(inv.status)} className="mt-0.5">{inv.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
