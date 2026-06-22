import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, TableHead, TableBody, DataRow, Th, Td, EmptyState } from '@/components/ui/TableRow'
import { Printer, Search, Banknote, Smartphone, Building2, FileText as ChequeIcon } from 'lucide-react'

interface Receipt {
  id: string
  number: string
  receipt_number: string | null
  receipt_issued_at: string | null
  paid_at: string | null
  total: number
  amount_paid: number
  contacts: { name: string } | null
  payments: {
    id: string
    amount: number
    date: string
    payment_method: string | null
    transaction_id: string | null
  }[]
}

const METHOD_ICON: Record<string, React.ElementType> = {
  cash: Banknote,
  mobile_money: Smartphone,
  bank_transfer: Building2,
  cheque: ChequeIcon,
}
const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
}
const METHOD_COLOR: Record<string, string> = {
  cash: '#16a34a',
  mobile_money: '#7c3aed',
  bank_transfer: '#2563eb',
  cheque: '#0891b2',
}

export function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase
      .from('invoices')
      .select('id, number, receipt_number, receipt_issued_at, paid_at, total, amount_paid, contacts(name), payments(id, amount, date, payment_method, transaction_id)')
      .eq('status', 'paid')
      .order('receipt_issued_at', { ascending: false })
      .then(({ data }) => {
        setReceipts((data ?? []) as any)
        setLoading(false)
      })
  }, [])

  const filtered = receipts.filter(r =>
    !search ||
    r.number.toLowerCase().includes(search.toLowerCase()) ||
    r.receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
    r.contacts?.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalReceived = receipts.reduce((s, r) => s + r.amount_paid, 0)

  return (
    <div>
      <PageHeader
        title="Receipts"
        description="Official receipts for all paid invoices"
      />

      <div className="p-8 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <div className="px-5 py-4">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total Receipts</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{receipts.length}</p>
            </div>
          </Card>
          <Card>
            <div className="px-5 py-4">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total Received</p>
              <p className="text-2xl font-bold" style={{ color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totalReceived)}</p>
            </div>
          </Card>
          {(['cash', 'mobile_money'] as const).map(method => {
            const Icon = METHOD_ICON[method]
            const total = receipts
              .flatMap(r => r.payments)
              .filter(p => p.payment_method === method)
              .reduce((s, p) => s + p.amount, 0)
            return (
              <Card key={method}>
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${METHOD_COLOR[method]}15` }}>
                    <Icon className="w-4 h-4" style={{ color: METHOD_COLOR[method] }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>{METHOD_LABEL[method]}</p>
                    <p className="text-base font-bold" style={{ color: METHOD_COLOR[method], fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(total)}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              className="pl-9 pr-3 h-9 w-72 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              style={{ background: 'white', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Search by receipt #, invoice #, or customer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} receipts</span>
        </div>

        <Card>
          <DataTable>
            <TableHead>
              <Th>Receipt #</Th>
              <Th>Invoice #</Th>
              <Th>Customer</Th>
              <Th>Date Paid</Th>
              <Th>Method</Th>
              <Th>Transaction ID</Th>
              <Th right>Amount</Th>
              <Th></Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading receipts…</td></tr>
              ) : filtered.length === 0 ? (
                <EmptyState title="No receipts yet" description="Receipts are generated automatically when invoices are marked as paid" />
              ) : filtered.map(r => {
                const pmt = r.payments?.[0]
                const method = pmt?.payment_method ?? null
                const Icon = method ? METHOD_ICON[method] : null
                return (
                  <DataRow key={r.id}>
                    <Td mono style={{ color: '#16a34a', fontWeight: 600 }}>{r.receipt_number ?? '—'}</Td>
                    <Td mono style={{ color: 'var(--text-muted)' }}>{r.number}</Td>
                    <Td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.contacts?.name ?? '—'}</Td>
                    <Td>{formatDate(pmt?.date ?? r.paid_at ?? r.receipt_issued_at ?? '')}</Td>
                    <Td>
                      {method ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium">
                          {Icon && <Icon className="w-3.5 h-3.5" style={{ color: METHOD_COLOR[method] }} />}
                          <span style={{ color: METHOD_COLOR[method] }}>{METHOD_LABEL[method]}</span>
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </Td>
                    <Td mono style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{pmt?.transaction_id ?? '—'}</Td>
                    <Td right mono style={{ color: '#16a34a', fontWeight: 600 }}>{formatCurrency(r.amount_paid)}</Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <Link to={`/invoices/${r.id}/receipt`} target="_blank" className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-emerald-50" style={{ color: '#16a34a' }}>
                          <Printer className="w-3 h-3" /> Receipt
                        </Link>
                        <Link to={`/invoices/${r.id}/print`} target="_blank" className="text-xs font-medium px-2 py-1 rounded-md transition-colors hover:bg-slate-50" style={{ color: '#64748b' }}>
                          Invoice
                        </Link>
                      </div>
                    </Td>
                  </DataRow>
                )
              })}
            </TableBody>
          </DataTable>
        </Card>
      </div>
    </div>
  )
}
