import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { Banknote, Smartphone, Building2, FileText, X } from 'lucide-react'

type PaymentMethod = 'cash' | 'mobile_money' | 'bank_transfer' | 'cheque'

const METHODS: { value: PaymentMethod; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'cash',          label: 'Cash',          icon: Banknote,   color: '#16a34a' },
  { value: 'mobile_money',  label: 'Mobile Money',  icon: Smartphone, color: '#7c3aed' },
  { value: 'bank_transfer', label: 'Bank Transfer',  icon: Building2,  color: '#2563eb' },
  { value: 'cheque',        label: 'Cheque',         icon: FileText,   color: '#0891b2' },
]

interface Props {
  invoiceId: string
  invoiceNumber: string
  customerName: string
  balanceDue: number
  bankAccounts: { id: string; name: string }[]
  onPaid: () => void
  onClose: () => void
}

export function RecordPaymentModal({ invoiceId, invoiceNumber, customerName, balanceDue, bankAccounts, onPaid, onClose }: Props) {
  const toast = useToast()
  const { user } = useAuth()
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: String(balanceDue),
    account_id: bankAccounts[0]?.id ?? '',
    transaction_id: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const needsTransactionId = method !== 'cash'

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (needsTransactionId && !form.transaction_id.trim()) {
      toast.error('Transaction ID required', `Please enter the ${method === 'mobile_money' ? 'mobile money' : method === 'cheque' ? 'cheque' : 'bank transfer'} reference`)
      return
    }
    setSaving(true)
    try {
      // Insert payment
      const { error: payErr } = await supabase.from('payments').insert({
        date: form.date,
        amount: parseFloat(form.amount),
        account_id: form.account_id || null,
        invoice_id: invoiceId,
        payment_method: method,
        transaction_id: form.transaction_id || null,
        notes: form.notes || null,
        reference: form.transaction_id || null,
        created_by: user?.id,
      })
      if (payErr) throw payErr

      // The DB trigger sync_amount_paid handles marking invoice as 'paid' when amount_paid >= total
      toast.success('Payment recorded', `${invoiceNumber} — ${formatCurrency(parseFloat(form.amount))} via ${METHODS.find(m => m.value === method)?.label}`)
      onPaid()
    } catch (err: unknown) {
      toast.error('Failed to record payment', err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl shadow-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-default)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Record Payment</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{invoiceNumber} · {customerName} · {formatCurrency(balanceDue)} due</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          {/* Payment method pills */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
              Payment method
            </label>
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map(m => {
                const Icon = m.icon
                const active = method === m.value
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      border: active ? `2px solid ${m.color}` : '2px solid var(--border-default)',
                      background: active ? `${m.color}15` : 'transparent',
                      color: active ? m.color : 'var(--text-muted)',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Payment date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            <Input label="Amount (ZMW)" type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
          </div>

          {bankAccounts.length > 0 && (
            <Select
              label="Deposit to account"
              value={form.account_id}
              onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}
              options={bankAccounts.map(a => ({ value: a.id, label: a.name }))}
              placeholder="Select account"
            />
          )}

          {needsTransactionId && (
            <Input
              label={
                method === 'mobile_money' ? 'Mobile Money Transaction ID *' :
                method === 'cheque' ? 'Cheque Number *' :
                'Bank Reference / Transaction ID *'
              }
              value={form.transaction_id}
              onChange={e => setForm(f => ({ ...f, transaction_id: e.target.value }))}
              placeholder={
                method === 'mobile_money' ? 'e.g. CG25AB1234' :
                method === 'cheque' ? 'e.g. 000123' :
                'e.g. FT25001234'
              }
              required
            />
          )}

          <Input label="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." />

          <div className="flex gap-2 pt-1">
            <Button type="submit" loading={saving} className="flex-1">
              Confirm Payment
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
