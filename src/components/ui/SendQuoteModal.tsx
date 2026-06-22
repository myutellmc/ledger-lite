import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { Send, Link2, X, CheckCircle } from 'lucide-react'

interface Props {
  quoteId: string
  quoteNumber: string
  customerName: string
  customerEmail: string | null
  companyName: string
  customerToken: string
  onSent: () => void
  onClose: () => void
}

export function SendQuoteModal({
  quoteId,
  quoteNumber,
  customerName,
  customerEmail,
  companyName,
  customerToken,
  onSent,
  onClose,
}: Props) {
  const toast = useToast()
  const portalUrl = `${window.location.origin}/q/${customerToken}`

  const [email, setEmail] = useState(customerEmail ?? '')
  const [subject, setSubject] = useState(`Quotation ${quoteNumber} from ${companyName}`)
  const [message, setMessage] = useState(
    `Dear ${customerName},\n\nPlease find attached your quotation ${quoteNumber}.\n\nYou can review and accept or decline this quote using the link below:\n${portalUrl}\n\nPlease don't hesitate to contact us if you have any questions.\n\nKind regards,\n${companyName}`
  )
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleSend() {
    if (!email) { toast.error('Email required', 'Please enter the customer email address'); return }
    setSending(true)
    try {
      const { error } = await supabase.functions.invoke('send-quote-email', {
        body: { quoteId, to: email, subject, message, portalUrl },
      })
      if (error) throw error
      // Mark as sent
      await supabase.from('quotes').update({ status: 'sent', customer_email: email }).eq('id', quoteId)
      toast.success('Quote sent', `Email delivered to ${email}`)
      onSent()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('RESEND_API_KEY')) {
        toast.error('Email not configured', 'Set RESEND_API_KEY in Supabase Edge Function secrets to enable email')
      } else {
        toast.error('Send failed', msg)
      }
      setSending(false)
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
    // Also mark as sent even if just sharing the link
    await supabase.from('quotes').update({ status: 'sent', customer_email: email || null }).eq('id', quoteId)
    toast.success('Link copied', 'Quote link copied — share it with your customer')
    onSent()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div className="flex items-center gap-2.5">
            <Send className="w-4 h-4" style={{ color: '#4f46e5' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Send Quote {quoteNumber}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <Input
            label="Customer email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="customer@example.com"
          />
          <Input
            label="Subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Message
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={8}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              style={{
                background: 'white',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                lineHeight: '1.6',
              }}
            />
          </div>

          {/* Portal link preview */}
          <div className="rounded-lg px-4 py-3 text-xs" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <p className="font-semibold mb-1" style={{ color: '#0369a1' }}>Customer portal link</p>
            <p className="break-all font-mono" style={{ color: '#0c4a6e' }}>{portalUrl}</p>
            <p className="mt-1.5" style={{ color: '#0369a1' }}>Customer can accept or decline from this link — no login required.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border-light)' }}>
          <Button onClick={handleSend} loading={sending} className="flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" /> Send via Email
          </Button>
          <Button variant="secondary" onClick={copyLink} className="flex items-center gap-1.5">
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Link2 className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Link Only'}
          </Button>
          <Button variant="ghost" onClick={onClose} className="ml-auto">Cancel</Button>
        </div>
      </div>
    </div>
  )
}
