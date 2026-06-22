import { useRef, useState } from 'react'
import { Upload, Download, X, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from './Button'

export interface CsvColumn {
  key: string
  label: string
  required?: boolean
  hint?: string
}

interface ParsedRow {
  row: number
  data: Record<string, string>
  errors: string[]
}

interface CsvUploadProps {
  columns: CsvColumn[]
  templateFilename: string
  onImport: (rows: Record<string, string>[]) => Promise<{ imported: number; errors: string[] }>
  sampleRows?: Record<string, string>[]
}

function parseCsv(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
  return lines.map(line => {
    const cells: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (c === ',' && !inQuote) {
        cells.push(cur.trim()); cur = ''
      } else {
        cur += c
      }
    }
    cells.push(cur.trim())
    return cells
  })
}

function downloadCsv(filename: string, rows: string[][]): void {
  const content = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

type Phase = 'idle' | 'preview' | 'importing' | 'done'

export function CsvUpload({ columns, templateFilename, onImport, sampleRows = [] }: CsvUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [fileName, setFileName] = useState('')

  function downloadTemplate() {
    const header = columns.map(c => c.key)
    const sample = sampleRows.length > 0
      ? sampleRows.map(r => columns.map(c => r[c.key] ?? ''))
      : [columns.map(c => c.hint ?? '')]
    downloadCsv(templateFilename, [header, ...sample])
  }

  function handleFile(file: File) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = (e.target?.result as string) ?? ''
      const rows = parseCsv(text)
      if (rows.length < 2) { alert('CSV must have a header row and at least one data row.'); return }
      const [headerRow, ...dataRows] = rows
      const header = headerRow.map(h => h.toLowerCase().replace(/\s+/g, '_'))

      const parsedRows: ParsedRow[] = dataRows.map((cells, idx) => {
        const data: Record<string, string> = {}
        header.forEach((h, i) => { data[h] = cells[i] ?? '' })

        // Also allow matching by label (case-insensitive)
        columns.forEach(col => {
          if (data[col.key] === undefined) {
            const altKey = col.label.toLowerCase().replace(/\s+/g, '_')
            if (data[altKey] !== undefined) data[col.key] = data[altKey]
          }
        })

        const errors: string[] = []
        columns.filter(c => c.required).forEach(c => {
          if (!data[c.key]?.trim()) errors.push(`${c.label} is required`)
        })
        return { row: idx + 2, data, errors }
      }).filter(r => columns.some(c => r.data[c.key]?.trim())) // skip blank rows

      setParsed(parsedRows)
      setPhase('preview')
      setResult(null)
    }
    reader.readAsText(file)
  }

  async function runImport() {
    const valid = parsed.filter(r => r.errors.length === 0).map(r => r.data)
    setPhase('importing')
    const res = await onImport(valid)
    setResult(res)
    setPhase('done')
  }

  function reset() {
    setPhase('idle'); setParsed([]); setResult(null); setFileName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const validCount = parsed.filter(r => r.errors.length === 0).length
  const errorCount = parsed.filter(r => r.errors.length > 0).length

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
      {/* Header — always visible */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
        style={{ background: 'var(--card-bg)' }}
        onClick={() => { setOpen(o => !o); if (!open) reset() }}
      >
        <Upload className="w-4 h-4 shrink-0" style={{ color: '#4f46e5' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Bulk Import via CSV</span>
        <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>— upload multiple records at once</span>
        <div className="ml-auto" style={{ color: 'var(--text-muted)' }}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4" style={{ borderTop: '1px solid var(--border-light)', background: 'var(--card-bg)' }}>

          {/* Step 1: Download template */}
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Step 1 — Download the template
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Fill it in with your data, then upload below.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {columns.map(c => (
                  <span key={c.key} className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: c.required ? '#ede9fe' : '#f1f5f9', color: c.required ? '#6d28d9' : '#64748b' }}>
                    {c.key}{c.required ? '*' : ''}
                  </span>
                ))}
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>* required</p>
            </div>
            <Button size="sm" variant="secondary" onClick={downloadTemplate} type="button">
              <Download className="w-3.5 h-3.5" /> Template
            </Button>
          </div>

          {/* Step 2: Upload */}
          {phase === 'idle' && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Step 2 — Upload your filled CSV
              </p>
              <label
                className="flex flex-col items-center justify-center gap-2 rounded-lg cursor-pointer transition-colors"
                style={{ border: '2px dashed #c7d2fe', padding: '20px', background: '#f5f3ff' }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              >
                <Upload className="w-5 h-5" style={{ color: '#6d28d9' }} />
                <span className="text-sm font-medium" style={{ color: '#4f46e5' }}>Click to browse or drag & drop</span>
                <span className="text-xs" style={{ color: '#7c3aed' }}>CSV files only</span>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </label>
            </div>
          )}

          {/* Preview */}
          {phase === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 justify-between">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Preview — {fileName}
                </p>
                <button type="button" onClick={reset} className="text-xs" style={{ color: '#64748b' }}>
                  <X className="w-3.5 h-3.5 inline" /> Clear
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1" style={{ color: '#16a34a' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> {validCount} valid row{validCount !== 1 ? 's' : ''}
                </span>
                {errorCount > 0 && (
                  <span className="flex items-center gap-1" style={{ color: '#dc2626' }}>
                    <AlertCircle className="w-3.5 h-3.5" /> {errorCount} row{errorCount !== 1 ? 's' : ''} with errors (will be skipped)
                  </span>
                )}
              </div>

              {/* Error details */}
              {errorCount > 0 && (
                <div className="rounded-lg overflow-auto max-h-32" style={{ border: '1px solid #fecaca', background: '#fff5f5' }}>
                  {parsed.filter(r => r.errors.length > 0).map(r => (
                    <div key={r.row} className="px-3 py-1.5 text-xs" style={{ borderBottom: '1px solid #fecaca', color: '#dc2626' }}>
                      Row {r.row}: {r.errors.join(', ')}
                    </div>
                  ))}
                </div>
              )}

              {/* Data preview table */}
              <div className="rounded-lg overflow-auto max-h-48" style={{ border: '1px solid var(--border-default)' }}>
                <table className="w-full text-xs" style={{ minWidth: 'max-content' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>#</th>
                      {columns.map(c => (
                        <th key={c.key} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                          {c.label}
                        </th>
                      ))}
                      <th className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-default)' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 10).map(r => (
                      <tr key={r.row} style={{ background: r.errors.length > 0 ? '#fff5f5' : 'white', borderBottom: '1px solid var(--border-light)' }}>
                        <td className="px-3 py-1.5 font-mono" style={{ color: '#94a3b8' }}>{r.row}</td>
                        {columns.map(c => (
                          <td key={c.key} className="px-3 py-1.5 whitespace-nowrap" style={{ color: r.data[c.key] ? 'var(--text-primary)' : '#cbd5e1' }}>
                            {r.data[c.key] || '—'}
                          </td>
                        ))}
                        <td className="px-3 py-1.5">
                          {r.errors.length > 0
                            ? <AlertCircle className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                            : <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />
                          }
                        </td>
                      </tr>
                    ))}
                    {parsed.length > 10 && (
                      <tr><td colSpan={columns.length + 2} className="px-3 py-2 text-center" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        … and {parsed.length - 10} more rows
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={runImport} disabled={validCount === 0} type="button">
                  Import {validCount} record{validCount !== 1 ? 's' : ''}
                </Button>
                <Button size="sm" variant="secondary" onClick={reset} type="button">Cancel</Button>
              </div>
            </div>
          )}

          {phase === 'importing' && (
            <div className="flex items-center gap-2 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Importing…
            </div>
          )}

          {phase === 'done' && result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg px-4 py-3" style={{ background: result.imported > 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${result.imported > 0 ? '#bbf7d0' : '#fecaca'}` }}>
                {result.imported > 0
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#16a34a' }} />
                  : <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#dc2626' }} />
                }
                <span className="text-sm font-medium" style={{ color: result.imported > 0 ? '#15803d' : '#dc2626' }}>
                  {result.imported > 0
                    ? `Successfully imported ${result.imported} record${result.imported !== 1 ? 's' : ''}`
                    : 'Import failed — no records were saved'
                  }
                </span>
              </div>
              {result.errors.length > 0 && (
                <div className="rounded-lg overflow-auto max-h-32" style={{ border: '1px solid #fecaca', background: '#fff5f5' }}>
                  {result.errors.map((e, i) => (
                    <div key={i} className="px-3 py-1.5 text-xs" style={{ borderBottom: '1px solid #fecaca', color: '#dc2626' }}>{e}</div>
                  ))}
                </div>
              )}
              <Button size="sm" variant="secondary" onClick={reset} type="button">Import another file</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
