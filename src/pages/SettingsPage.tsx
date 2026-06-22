import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { Save, Building2, Globe, FileText, ImagePlus, Trash2, Percent } from 'lucide-react'

interface Settings {
  id: string
  company_name: string
  company_email: string
  company_phone: string
  company_address: string
  company_website: string
  tax_number: string
  tax_label: string
  default_tax_rate: number
  currency_code: string
  currency_symbol: string
  financial_year_start: number
  invoice_notes: string
  quote_notes: string
  logo_url: string | null
}

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD — US Dollar ($)' },
  { value: 'ZMW', label: 'ZMW — Zambian Kwacha (K)' },
  { value: 'GBP', label: 'GBP — British Pound (£)' },
  { value: 'EUR', label: 'EUR — Euro (€)' },
  { value: 'ZAR', label: 'ZAR — South African Rand (R)' },
  { value: 'KES', label: 'KES — Kenyan Shilling (KSh)' },
  { value: 'NGN', label: 'NGN — Nigerian Naira (₦)' },
  { value: 'GHS', label: 'GHS — Ghanaian Cedi (₵)' },
]

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', ZMW: 'K', GBP: '£', EUR: '€', ZAR: 'R', KES: 'KSh', NGN: '₦', GHS: '₵',
}

const MONTH_OPTIONS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' },   { value: '4', label: 'April' },
  { value: '5', label: 'May' },     { value: '6', label: 'June' },
  { value: '7', label: 'July' },    { value: '8', label: 'August' },
  { value: '9', label: 'September' },{ value: '10', label: 'October' },
  { value: '11', label: 'November' },{ value: '12', label: 'December' },
]

const EMPTY: Settings = {
  id: '',
  company_name: '',
  company_email: '',
  company_phone: '',
  company_address: '',
  company_website: '',
  tax_number: '',
  tax_label: 'VAT',
  default_tax_rate: 16,
  currency_code: 'USD',
  currency_symbol: '$',
  financial_year_start: 1,
  invoice_notes: '',
  quote_notes: '',
  logo_url: null,
}

export function SettingsPage() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<Settings>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    supabase.from('settings').select('*').single().then(({ data }) => {
      if (data) setForm(data as Settings)
      setLoading(false)
    })
  }, [])

  function set(field: keyof Settings, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const path = `logo.${ext}`
    const { error: upErr } = await supabase.storage.from('company-assets').upload(path, file, { upsert: true })
    if (upErr) { toast.error('Upload failed', upErr.message); setUploadingLogo(false); return }
    const { data: { publicUrl } } = supabase.storage.from('company-assets').getPublicUrl(path)
    setForm(f => ({ ...f, logo_url: publicUrl }))
    setUploadingLogo(false)
    toast.success('Logo uploaded')
  }

  async function handleRemoveLogo() {
    setForm(f => ({ ...f, logo_url: null }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { id, ...fields } = form
    if (id) {
      await supabase.from('settings').update(fields).eq('id', id)
    } else {
      await supabase.from('settings').insert(fields)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading settings…</div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure your company details, currency, and document defaults"
      />

      <form onSubmit={handleSave}>
        <div className="p-8 space-y-6">

          {/* Company details */}
          <Card>
            <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <Building2 className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Company Details</h3>
            </div>
            <div className="px-6 py-5 grid grid-cols-2 gap-4">
              <Input
                label="Company Name"
                value={form.company_name}
                onChange={e => set('company_name', e.target.value)}
                placeholder="Acme Corp"
                required
                disabled={!isAdmin}
              />
              <Input
                label="Email"
                type="email"
                value={form.company_email}
                onChange={e => set('company_email', e.target.value)}
                placeholder="accounts@company.com"
                disabled={!isAdmin}
              />
              <Input
                label="Phone"
                value={form.company_phone}
                onChange={e => set('company_phone', e.target.value)}
                placeholder="+260 97 000 0000"
                disabled={!isAdmin}
              />
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Address
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: 'white', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="Street address, city, country"
                  value={form.company_address}
                  onChange={e => set('company_address', e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
              <Input
                label="Website"
                value={form.company_website}
                onChange={e => set('company_website', e.target.value)}
                placeholder="https://company.com"
                disabled={!isAdmin}
              />
            </div>
          </Card>

          {/* Company Branding */}
          <Card>
            <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <ImagePlus className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Company Branding</h3>
              <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>— logo appears on all printed documents</span>
            </div>
            <div className="px-6 py-5 flex items-start gap-6">
              {/* Logo preview */}
              <div
                className="w-36 h-24 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ border: '1.5px dashed var(--border-default)', background: '#f8fafc' }}
              >
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Company logo" className="max-w-full max-h-full object-contain p-2" />
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <ImagePlus className="w-6 h-6" style={{ color: '#cbd5e1' }} />
                    <span className="text-xs" style={{ color: '#94a3b8' }}>No logo</span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Company Logo</p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  PNG, JPG or SVG, max 2 MB. Recommended: square or landscape, minimum 200×100px. Will appear top-left on invoices, quotes, and payroll returns.
                </p>
                <div className="flex items-center gap-2">
                  <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} disabled={!isAdmin} />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    disabled={!isAdmin}
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    {form.logo_url ? 'Replace Logo' : 'Upload Logo'}
                  </Button>
                  {form.logo_url && isAdmin && (
                    <Button type="button" variant="ghost" size="sm" onClick={handleRemoveLogo}>
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Tax Settings */}
          <Card>
            <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <Percent className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Tax Settings</h3>
              <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>— applied to quotes, invoices and receipts</span>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Tax Label"
                  value={form.tax_label}
                  onChange={e => set('tax_label', e.target.value)}
                  placeholder="e.g. VAT, GST, Sales Tax"
                  disabled={!isAdmin}
                />
                <Input
                  label="Default Tax Rate (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={String(form.default_tax_rate)}
                  onChange={e => set('default_tax_rate', parseFloat(e.target.value) || 0)}
                  placeholder="16"
                  disabled={!isAdmin}
                />
                <Input
                  label="Tax Registration Number (TPIN)"
                  value={form.tax_number}
                  onChange={e => set('tax_number', e.target.value)}
                  placeholder="e.g. 1234567890"
                  disabled={!isAdmin}
                />
              </div>
              <div className="rounded-lg px-4 py-3 text-xs space-y-1" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                <p className="font-semibold">ZRA (Zambia Revenue Authority) notes</p>
                <p>• Standard VAT rate in Zambia is <strong>16%</strong>. Zero-rated: basic foodstuffs. Exempt: financial services, education, healthcare.</p>
                <p>• VAT registration required when annual turnover exceeds <strong>ZMW 800,000</strong> (or ZMW 200,000 in any 3-month period).</p>
                <p>• From <strong>1 Jan 2026</strong>, ZRA only accepts input VAT claims backed by Smart Invoice-generated receipts. VAT-registered businesses must issue invoices through the ZRA Smart Invoice system.</p>
                <p>• Retain copies of all invoices for a minimum of <strong>6 years</strong> and produce them to an authorised ZRA officer on request.</p>
              </div>
            </div>
          </Card>

          {/* Finance settings */}
          <Card>
            <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <Globe className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Finance Settings</h3>
            </div>
            <div className="px-6 py-5 grid grid-cols-3 gap-4">
              <Select
                label="Currency"
                value={form.currency_code}
                onChange={e => {
                  const code = e.target.value
                  set('currency_code', code)
                  set('currency_symbol', CURRENCY_SYMBOLS[code] ?? code)
                }}
                options={CURRENCY_OPTIONS}
                disabled={!isAdmin}
              />
              <Input
                label="Currency Symbol"
                value={form.currency_symbol}
                onChange={e => set('currency_symbol', e.target.value)}
                placeholder="$"
                disabled={!isAdmin}
              />
              <Select
                label="Financial Year Start"
                value={String(form.financial_year_start)}
                onChange={e => set('financial_year_start', parseInt(e.target.value))}
                options={MONTH_OPTIONS}
                disabled={!isAdmin}
              />
            </div>
          </Card>

          {/* Document defaults */}
          <Card>
            <div className="px-6 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <FileText className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Document Defaults</h3>
              <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>— printed on invoices and quotes</span>
            </div>
            <div className="px-6 py-5 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Default Invoice Notes
                </label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: 'white', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="e.g. Payment due within 30 days. Bank details: …"
                  value={form.invoice_notes}
                  onChange={e => set('invoice_notes', e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Default Quote Notes
                </label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: 'white', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  placeholder="e.g. Quote valid for 30 days from issue date."
                  value={form.quote_notes}
                  onChange={e => set('quote_notes', e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </Card>

          {isAdmin && (
            <div className="flex items-center gap-3">
              <Button type="submit" loading={saving}>
                <Save className="w-3.5 h-3.5" /> Save Settings
              </Button>
              {saved && (
                <span className="text-sm font-medium" style={{ color: '#16a34a' }}>
                  ✓ Settings saved
                </span>
              )}
            </div>
          )}
          {!isAdmin && (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Only administrators can modify settings.
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
