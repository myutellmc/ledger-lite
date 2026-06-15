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
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react'

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

const statCards = (stats: Stats) => [
  {
    label: 'Total Revenue',
    value: formatCurrency(stats.totalRevenue),
    icon: TrendingUp,
    iconBg: '#dcfce7',
    iconColor: '#16a34a',
    trend: 'This year',
    trendColor: '#16a34a',
  },
  {
    label: 'Total Expenses',
    value: formatCurrency(stats.totalExpenses),
    icon: TrendingDown,
    iconBg: '#fee2e2',
    iconColor: '#dc2626',
    trend: stats.totalRevenue > 0 ? `${Math.round((stats.totalExpenses / stats.totalRevenue) * 100)}% of revenue` : '—',
    trendColor: '#94a3b8',
  },
  {
    label: 'Outstanding',
    value: formatCurrency(stats.outstanding),
    icon: DollarSign,
    iconBg: '#dbeafe',
    iconColor: '#2563eb',
    trend: 'Awaiting payment',
    trendColor: '#94a3b8',
  },
  {
    label: 'Overdue',
    value: `${stats.overdueCount} invoice${stats.overdueCount !== 1 ? 's' : ''}`,
    icon: AlertTriangle,
    iconBg: '#fef3c7',
    iconColor: '#d97706',
    trend: stats.overdueCount > 0 ? 'Requires attention' : 'All clear',
    trendColor: stats.overdueCount > 0 ? '#d97706' : '#16a34a',
  },
]

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg px-3 py-2.5 text-sm"
      style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <p className="font-medium mb-1.5" style={{ color: '#0f172a' }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span style={{ color: '#64748b' }}>{p.name}:</span>
          <span className="font-medium" style={{ color: '#0f172a' }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalRevenue: 0, totalExpenses: 0, outstanding: 0, overdueCount: 0 })
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([])
  const [chartData, setChartData] = useState<{ month: string; revenue: number; expenses: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const year = new Date().getFullYear()
      const startOfYear = `${year}-01-01`

      const [invoicesRes, expensesRes] = await Promise.all([
        supabase.from('invoices').select('total, status, due_date, number, created_at, contacts(name)').gte('created_at', startOfYear),
        supabase.from('expenses').select('amount, date').gte('date', startOfYear),
      ])

      const invoices = invoicesRes.data ?? []
      const expenses = expensesRes.data ?? []

      const paidInvoices = invoices.filter((i: { status: string }) => i.status === 'paid')
      const totalRevenue = paidInvoices.reduce((s: number, i: { total: number }) => s + i.total, 0)
      const totalExpenses = expenses.reduce((s: number, e: { amount: number }) => s + e.amount, 0)
      const outstanding = invoices.filter((i: { status: string }) => i.status === 'sent').reduce((s: number, i: { total: number }) => s + i.total, 0)
      const overdueCount = invoices.filter((i: { status: string }) => i.status === 'overdue').length

      setStats({ totalRevenue, totalExpenses, outstanding, overdueCount })

      const monthly: Record<number, { revenue: number; expenses: number }> = {}
      for (let m = 0; m < 12; m++) monthly[m] = { revenue: 0, expenses: 0 }
      paidInvoices.forEach((i: { created_at: string; total: number }) => {
        monthly[new Date(i.created_at).getMonth()].revenue += i.total
      })
      expenses.forEach((e: { date: string; amount: number }) => {
        monthly[new Date(e.date).getMonth()].expenses += e.amount
      })
      setChartData(Object.entries(monthly).map(([m, v]) => ({ month: MONTHS[+m], ...v })))

      const recent = invoices
        .sort((a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6)
        .map((i: { number: string; contacts: unknown; total: number; status: string; due_date: string }) => ({
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

  const cards = statCards(stats)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Financial overview — ${new Date().getFullYear()}`}
      />

      <div className="p-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {cards.map(({ label, value, icon: Icon, iconBg, iconColor, trend, trendColor }) => (
            <Card key={label}>
              <CardContent className="py-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                    {label}
                  </p>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: iconBg }}
                  >
                    <Icon className="w-4 h-4" style={{ color: iconColor }} />
                  </div>
                </div>
                <p
                  className="text-2xl font-bold leading-none mb-2"
                  style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}
                >
                  {loading ? '—' : value}
                </p>
                <p className="text-xs font-medium" style={{ color: trendColor }}>{trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart + recent invoices */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      Revenue vs Expenses
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Monthly comparison for {new Date().getFullYear()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#6366f1' }} />
                      Revenue
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#f87171' }} />
                      Expenses
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 8, right: 0, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Inter' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Inter' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#gradRevenue)"
                      name="Revenue"
                      dot={false}
                      activeDot={{ r: 4, fill: '#6366f1', stroke: 'white', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#f87171"
                      strokeWidth={2}
                      fill="url(#gradExpenses)"
                      name="Expenses"
                      dot={false}
                      activeDot={{ r: 4, fill: '#f87171', stroke: 'white', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent invoices */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Recent Invoices
              </h3>
            </CardHeader>
            {loading ? (
              <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Loading...
              </div>
            ) : recentInvoices.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No invoices yet</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Create your first invoice to get started</p>
              </div>
            ) : (
              <div>
                {recentInvoices.map((inv, idx) => (
                  <div
                    key={inv.id}
                    className="px-5 py-3 flex items-center justify-between"
                    style={{
                      borderBottom: idx < recentInvoices.length - 1 ? '1px solid var(--border-light)' : 'none',
                    }}
                  >
                    <div className="min-w-0 mr-3">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {inv.contact}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {inv.number} · {formatDate(inv.due_date)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(inv.total)}
                      </p>
                      <div className="mt-0.5">
                        <Badge {...statusBadge(inv.status)}>{inv.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
