import { useRef, useState } from 'react'
import { X, Upload, FileText, Sparkles, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { Button } from './Button'
import { supabase } from '@/lib/supabase'

export interface ExtractedDocument {
  document_type: string
  vendor_name: string | null
  vendor_tpin: string | null
  vendor_address: string | null
  vendor_email: string | null
  client_name: string | null
  reference_number: string | null
  issue_date: string | null
  due_date: string | null
  currency: string
  subtotal: number | null
  tax_amount: number | null
  total: number | null
  tax_rate: number | null
  notes: string | null
  line_items: { description: string; quantity: number; unit_price: number; tax_rate: number; amount: number }[]
  confidence: 'high' | 'medium' | 'low'
}

interface Props {
  onExtracted: (data: ExtractedDocument) => void
  onClose: () => void
  accept?: string
}

type Phase = 'idle' | 'extracting' | 'done' | 'error'

const CONFIDENCE_COLORS = {
  high:   { bg: '#dcfce7', color: '#15803d', label: 'High confidence' },
  medium: { bg: '#fef3c7', color: '#b45309', label: 'Medium confidence' },
  low:    { bg: '#fee2e2', color: '#b91c1c', label: 'Low confidence — please review carefully' },
}

export function ImportDocumentModal({ onExtracted, onClose, accept = 'image/*,.pdf' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState<ExtractedDocument | null>(null)
  const [dragging, setDragging] = useState(false)

  async function processFile(file: File) {
    setPhase('extracting')
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data, error: fnError } = await supabase.functions.invoke('extract-document', { body: fd })
      if (fnError) throw new Error(fnError.message)
      if (!data?.success) throw new Error(data?.error ?? 'Extraction failed')
      setResult(data.data as ExtractedDocument)
      setPhase('done')
    } catch (e) {
      setError((e as Error).message)
      setPhase('error')
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  function handleUse() {
    if (result) onExtracted(result)
  }

  const conf = result ? CONFIDENCE_COLORS[result.confidence] : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content rounded-2xl w-full max-w-lg mx-4" style={{ background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#7c3aed' }} />
            </div>
            <div>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>AI Document Import</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Upload any invoice, bill, PO, or receipt</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Upload zone */}
          {(phase === 'idle' || phase === 'error') && (
            <>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className="rounded-xl flex flex-col items-center justify-center gap-3 py-10 cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${dragging ? '#6366f1' : '#c7d2fe'}`,
                  background: dragging ? '#eef2ff' : '#f5f7ff',
                }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Drop your document here</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>or click to browse — PNG, JPG, PDF supported</p>
                </div>
              </div>
              <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onFileChange} />

              {phase === 'error' && (
                <div className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2.5" style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#991b1b' }}>Extraction failed</p>
                    <p className="text-xs mt-0.5" style={{ color: '#b91c1c' }}>{error}</p>
                    {error.includes('ANTHROPIC_API_KEY') && (
                      <p className="text-xs mt-1.5 font-medium" style={{ color: '#92400e' }}>
                        To enable AI extraction, add your Anthropic API key as a secret named <code className="font-mono bg-amber-100 px-1 rounded">ANTHROPIC_API_KEY</code> in your Supabase project's Edge Function secrets.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Extracting */}
          {phase === 'extracting' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                  <Loader className="w-3.5 h-3.5 animate-spin" style={{ color: '#6366f1' }} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Analysing document…</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Claude AI is extracting vendor, amounts, line items & dates</p>
              </div>
              <div className="w-full rounded-full h-1 overflow-hidden" style={{ background: '#e0e7ff' }}>
                <div className="h-full rounded-full animate-pulse" style={{ width: '60%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
              </div>
            </div>
          )}

          {/* Results */}
          {phase === 'done' && result && (
            <div className="space-y-4">
              {/* Confidence banner */}
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: conf!.bg }}>
                <CheckCircle className="w-4 h-4 shrink-0" style={{ color: conf!.color }} />
                <p className="text-xs font-medium" style={{ color: conf!.color }}>
                  Extraction complete — {conf!.label}
                </p>
                <span className="ml-auto text-xs font-semibold capitalize px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.6)', color: conf!.color }}>
                  {result.document_type?.replace('_', ' ')}
                </span>
              </div>

              {/* Key fields grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Vendor', value: result.vendor_name },
                  { label: 'Reference', value: result.reference_number },
                  { label: 'Issue Date', value: result.issue_date },
                  { label: 'Due Date', value: result.due_date },
                  { label: 'Subtotal', value: result.subtotal != null ? `${result.currency} ${result.subtotal.toFixed(2)}` : null },
                  { label: 'Tax', value: result.tax_amount != null ? `${result.currency} ${result.tax_amount.toFixed(2)}` : null },
                  { label: 'Total', value: result.total != null ? `${result.currency} ${result.total.toFixed(2)}` : null },
                  { label: 'TPIN', value: result.vendor_tpin },
                ].map(({ label, value }) => value ? (
                  <div key={label} className="rounded-lg px-3 py-2" style={{ background: '#f8fafc', border: '1px solid var(--border-light)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <p className="text-sm font-medium mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  </div>
                ) : null)}
              </div>

              {/* Line items preview */}
              {result.line_items?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {result.line_items.length} line item{result.line_items.length !== 1 ? 's' : ''} detected
                  </p>
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-light)' }}>
                    {result.line_items.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 text-xs" style={{ borderBottom: i < Math.min(result.line_items.length, 3) - 1 ? '1px solid var(--border-light)' : 'none', background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                        <span className="truncate flex-1 mr-3" style={{ color: 'var(--text-primary)' }}>{item.description}</span>
                        <span className="font-medium shrink-0" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{result.currency} {item.amount?.toFixed(2)}</span>
                      </div>
                    ))}
                    {result.line_items.length > 3 && (
                      <div className="px-3 py-1.5 text-xs" style={{ color: 'var(--text-muted)', background: '#f8fafc' }}>
                        +{result.line_items.length - 3} more items
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Review all fields before saving. You can edit anything after importing.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border-light)' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          {phase === 'done' && (
            <Button size="sm" onClick={handleUse}>
              <Sparkles className="w-3.5 h-3.5" /> Use Extracted Data
            </Button>
          )}
          {phase === 'error' && (
            <Button size="sm" variant="secondary" onClick={() => { setPhase('idle'); setError('') }}>
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
