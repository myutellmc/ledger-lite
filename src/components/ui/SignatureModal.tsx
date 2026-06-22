import { useRef, useState, useEffect } from 'react'
import { X, RotateCcw, Check, PenLine } from 'lucide-react'
import { Button } from './Button'

interface Props {
  onConfirm: (dataUrl: string) => void
  onClose: () => void
  title?: string
}

export function SignatureModal({ onConfirm, onClose, title = 'Sign Document' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#1e1b4b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const canvas = canvasRef.current!
    setDrawing(true)
    lastPos.current = getPos(e, canvas)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)
    if (lastPos.current) {
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      setIsEmpty(false)
    }
    lastPos.current = pos
  }

  function stopDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    setDrawing(false)
    lastPos.current = null
  }

  function clear() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  function confirm() {
    if (isEmpty) return
    const canvas = canvasRef.current!
    onConfirm(canvas.toDataURL('image/png'))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-content rounded-2xl w-full max-w-md mx-4" style={{ background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#ede9fe' }}>
              <PenLine className="w-4 h-4" style={{ color: '#7c3aed' }} />
            </div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas */}
        <div className="px-6 pt-4 pb-2">
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Draw your signature below using your mouse or touchscreen.</p>
          <div className="rounded-xl overflow-hidden" style={{ border: '1.5px dashed #c7d2fe', background: '#fafafe', touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              width={480}
              height={160}
              className="w-full"
              style={{ cursor: 'crosshair', display: 'block' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs" style={{ color: '#c7d2fe' }}>Sign above</p>
            <button onClick={clear} className="flex items-center gap-1 text-xs transition-colors" style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#6366f1'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border-light)' }}>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={confirm} disabled={isEmpty}>
            <Check className="w-3.5 h-3.5" /> Apply Signature
          </Button>
        </div>
      </div>
    </div>
  )
}
