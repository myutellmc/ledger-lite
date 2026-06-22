import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, TableHead, TableBody, DataRow, Th, Td, EmptyState } from '@/components/ui/TableRow'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { Plus, Search, Package, TrendingDown, AlertTriangle, History, Pencil, X, ArrowUp, ArrowDown } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string | null
  description: string | null
  unit: string
  category: string | null
  unit_cost: number
  selling_price: number
  stock_qty: number
  reorder_level: number
  is_active: boolean
}

interface Movement {
  id: string
  movement_type: string
  qty: number
  unit_cost: number | null
  reference: string | null
  notes: string | null
  created_at: string
}

const EMPTY_PRODUCT = {
  name: '', sku: '', description: '', unit: 'unit', category: '',
  unit_cost: 0, selling_price: 0, stock_qty: 0, reorder_level: 0,
}

const TYPE_LABEL: Record<string, string> = {
  sale: 'Sale', purchase: 'Purchase', adjustment: 'Adjustment', opening: 'Opening Stock',
}
const TYPE_COLOR: Record<string, string> = {
  sale: '#dc2626', purchase: '#16a34a', adjustment: '#2563eb', opening: '#7c3aed',
}

export function InventoryPage() {
  const { isAccountant, user } = useAuth()
  const toast = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_PRODUCT)
  const [saving, setSaving] = useState(false)

  // Adjust modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [adjustSaving, setAdjustSaving] = useState(false)

  // History modal
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  async function load() {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const totalValue = products.reduce((s, p) => s + p.stock_qty * p.unit_cost, 0)
  const lowStock = products.filter(p => p.is_active && p.stock_qty <= p.reorder_level && p.reorder_level > 0)
  const outOfStock = products.filter(p => p.is_active && p.stock_qty <= 0)

  function openNew() {
    setEditingId(null)
    setForm(EMPTY_PRODUCT)
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditingId(p.id)
    setForm({
      name: p.name, sku: p.sku ?? '', description: p.description ?? '',
      unit: p.unit, category: p.category ?? '',
      unit_cost: p.unit_cost, selling_price: p.selling_price,
      stock_qty: p.stock_qty, reorder_level: p.reorder_level,
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      sku: form.sku || null,
      description: form.description || null,
      unit: form.unit,
      category: form.category || null,
      unit_cost: Number(form.unit_cost),
      selling_price: Number(form.selling_price),
      reorder_level: Number(form.reorder_level),
      created_by: user?.id,
    }

    if (editingId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingId)
      if (error) { toast.error('Save failed', error.message); setSaving(false); return }
      toast.success('Product updated')
    } else {
      const { data: prod, error } = await supabase.from('products').insert({ ...payload, stock_qty: 0 }).select().single()
      if (error) { toast.error('Save failed', error.message); setSaving(false); return }
      // If opening stock > 0, create opening movement
      if (Number(form.stock_qty) > 0 && prod) {
        await supabase.from('stock_movements').insert({
          product_id: (prod as { id: string }).id,
          movement_type: 'opening',
          qty: Number(form.stock_qty),
          unit_cost: Number(form.unit_cost),
          notes: 'Opening stock',
          created_by: user?.id,
        })
      }
      toast.success('Product created')
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault()
    if (!adjustingProduct) return
    setAdjustSaving(true)
    const qty = Number(adjustQty)
    if (qty === 0) { toast.error('Enter a non-zero quantity'); setAdjustSaving(false); return }
    const { error } = await supabase.from('stock_movements').insert({
      product_id: adjustingProduct.id,
      movement_type: 'adjustment',
      qty,
      unit_cost: adjustingProduct.unit_cost,
      notes: adjustNotes || null,
      created_by: user?.id,
    })
    if (error) { toast.error('Adjustment failed', error.message); setAdjustSaving(false); return }
    toast.success('Stock adjusted', `${qty > 0 ? '+' : ''}${qty} ${adjustingProduct.unit}`)
    setAdjustingProduct(null)
    setAdjustQty('')
    setAdjustNotes('')
    setAdjustSaving(false)
    load()
  }

  async function openHistory(p: Product) {
    setHistoryProduct(p)
    setHistoryLoading(true)
    const { data } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', p.id)
      .order('created_at', { ascending: false })
    setMovements(data ?? [])
    setHistoryLoading(false)
  }

  return (
    <>
    <div>
      <PageHeader
        title="Inventory"
        description="Manage products, stock levels and movements"
        actions={isAccountant && (
          <Button onClick={openNew} size="sm">
            <Plus className="w-3.5 h-3.5" /> New Product
          </Button>
        )}
      />

      <div className="p-8 space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Products', value: products.filter(p => p.is_active).length, suffix: 'active', color: '#6366f1', icon: Package },
            { label: 'Stock Value', value: formatCurrency(totalValue), suffix: 'at cost', color: '#2563eb', icon: Package },
            { label: 'Low Stock', value: lowStock.length, suffix: 'items', color: '#d97706', icon: AlertTriangle },
            { label: 'Out of Stock', value: outOfStock.length, suffix: 'items', color: '#dc2626', icon: TrendingDown },
          ].map(({ label, value, suffix, color, icon: Icon }) => (
            <Card key={label}>
              <div className="px-5 py-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-xl font-bold" style={{ color }}>{value}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{suffix}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* New / Edit form */}
        {showForm && (
          <Card>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{editingId ? 'Edit Product' : 'New Product'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Input label="Product Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Plastic Garden Chair" required />
                <Input label="SKU / Item Code" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. PGC-001" />
                <Input label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Furniture" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <Input label="Unit Cost (ZMW)" type="number" min="0" step="0.01" value={String(form.unit_cost)} onChange={e => setForm(f => ({ ...f, unit_cost: +e.target.value }))} />
                <Input label="Selling Price (ZMW)" type="number" min="0" step="0.01" value={String(form.selling_price)} onChange={e => setForm(f => ({ ...f, selling_price: +e.target.value }))} />
                <Input label="Unit of Measure" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="unit, kg, litre…" />
                <Input label="Reorder Level" type="number" min="0" step="0.01" value={String(form.reorder_level)} onChange={e => setForm(f => ({ ...f, reorder_level: +e.target.value }))} />
              </div>
              {!editingId && (
                <Input label="Opening Stock Qty" type="number" min="0" step="0.01" value={String(form.stock_qty)} onChange={e => setForm(f => ({ ...f, stock_qty: +e.target.value }))} placeholder="0" />
              )}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <textarea rows={2} className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ background: 'white', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} placeholder="Optional product description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" loading={saving}>{editingId ? 'Save Changes' : 'Create Product'}</Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              className="pl-9 pr-3 h-9 w-64 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'white', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              placeholder="Search by name, SKU, category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} {filtered.length === 1 ? 'product' : 'products'}</span>
        </div>

        {/* Products table */}
        <Card>
          <DataTable>
            <TableHead>
              <Th>SKU</Th>
              <Th>Product</Th>
              <Th>Category</Th>
              <Th right>Unit Cost</Th>
              <Th right>Selling Price</Th>
              <Th right>Stock</Th>
              <Th right>Reorder At</Th>
              <Th>Status</Th>
              <Th></Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading inventory…</td></tr>
              ) : filtered.length === 0 ? (
                <EmptyState title="No products found" description="Add your first product using the button above" />
              ) : filtered.map(p => {
                const isLow = p.is_active && p.reorder_level > 0 && p.stock_qty <= p.reorder_level
                const isOut = p.is_active && p.stock_qty <= 0
                return (
                  <DataRow key={p.id}>
                    <Td mono style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{p.sku ?? '—'}</Td>
                    <Td>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                      {p.description && <p className="text-xs truncate max-w-xs" style={{ color: 'var(--text-muted)' }}>{p.description}</p>}
                    </Td>
                    <Td style={{ color: 'var(--text-muted)' }}>{p.category ?? '—'}</Td>
                    <Td right mono>{formatCurrency(p.unit_cost)}</Td>
                    <Td right mono style={{ color: '#2563eb', fontWeight: 600 }}>{formatCurrency(p.selling_price)}</Td>
                    <Td right>
                      <span className="font-semibold" style={{ color: isOut ? '#dc2626' : isLow ? '#d97706' : '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                        {p.stock_qty % 1 === 0 ? p.stock_qty : p.stock_qty.toFixed(2)} {p.unit}
                      </span>
                    </Td>
                    <Td right mono style={{ color: 'var(--text-muted)' }}>{p.reorder_level > 0 ? `${p.reorder_level} ${p.unit}` : '—'}</Td>
                    <Td>
                      {isOut ? <Badge variant="danger">Out of stock</Badge>
                        : isLow ? <Badge variant="warning">Low stock</Badge>
                        : p.is_active ? <Badge variant="success">In stock</Badge>
                        : <Badge variant="neutral">Inactive</Badge>}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        {isAccountant && (
                          <>
                            <button
                              onClick={() => { setAdjustingProduct(p); setAdjustQty(''); setAdjustNotes('') }}
                              className="p-1.5 rounded hover:bg-indigo-50 transition-colors text-xs font-medium flex items-center gap-1"
                              style={{ color: '#6366f1' }}
                              title="Adjust stock"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEdit(p)}
                              className="p-1.5 rounded hover:bg-slate-100 transition-colors"
                              style={{ color: 'var(--text-muted)' }}
                              title="Edit product"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openHistory(p)}
                          className="p-1.5 rounded hover:bg-slate-100 transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          title="Stock history"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
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

    {/* Stock Adjustment Modal */}
    {adjustingProduct && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.5)' }} onClick={e => { if (e.target === e.currentTarget) setAdjustingProduct(null) }}>
        <div className="w-full max-w-sm rounded-2xl shadow-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <div>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Adjust Stock</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{adjustingProduct.name} · current: {adjustingProduct.stock_qty} {adjustingProduct.unit}</p>
            </div>
            <button onClick={() => setAdjustingProduct(null)}><X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></button>
          </div>
          <form onSubmit={handleAdjust} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Quantity change</label>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Use a positive number to add stock, negative to reduce.</p>
              <div className="flex gap-2 mb-2">
                {['+10', '+5', '+1', '-1', '-5', '-10'].map(v => (
                  <button key={v} type="button"
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: v.startsWith('+') ? '#f0fdf4' : '#fef2f2', color: v.startsWith('+') ? '#16a34a' : '#dc2626', border: `1px solid ${v.startsWith('+') ? '#bbf7d0' : '#fecaca'}` }}
                    onClick={() => setAdjustQty(String(Number(adjustQty || 0) + Number(v)))}
                  >{v}</button>
                ))}
              </div>
              <input
                type="number"
                step="0.01"
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg font-bold"
                style={{ background: 'white', border: '1px solid var(--border-default)', color: Number(adjustQty) >= 0 ? '#16a34a' : '#dc2626' }}
                placeholder="0"
                value={adjustQty}
                onChange={e => setAdjustQty(e.target.value)}
                required
              />
              {adjustQty && (
                <p className="text-xs mt-1.5 text-center font-medium" style={{ color: 'var(--text-muted)' }}>
                  New stock: <span style={{ color: 'var(--text-primary)' }}>{(adjustingProduct.stock_qty + Number(adjustQty)).toFixed(2)} {adjustingProduct.unit}</span>
                </p>
              )}
            </div>
            <Input label="Reason / Notes" value={adjustNotes} onChange={e => setAdjustNotes(e.target.value)} placeholder="e.g. Damaged goods, stock count correction…" />
            <div className="flex gap-2">
              <Button type="submit" loading={adjustSaving} className="flex-1">Confirm Adjustment</Button>
              <Button type="button" variant="secondary" onClick={() => setAdjustingProduct(null)}>Cancel</Button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Stock History Modal */}
    {historyProduct && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.5)' }} onClick={e => { if (e.target === e.currentTarget) setHistoryProduct(null) }}>
        <div className="w-full max-w-xl rounded-2xl shadow-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <div>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Stock History</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{historyProduct.name} · current stock: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{historyProduct.stock_qty} {historyProduct.unit}</span></p>
            </div>
            <button onClick={() => setHistoryProduct(null)}><X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></button>
          </div>
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            {historyLoading ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Loading…</p>
            ) : movements.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>No stock movements recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {movements.map(m => (
                  <div key={m.id} className="flex items-start justify-between py-2.5 px-3 rounded-lg" style={{ background: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border-light)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${TYPE_COLOR[m.movement_type]}15` }}>
                        {m.qty >= 0
                          ? <ArrowUp className="w-3 h-3" style={{ color: TYPE_COLOR[m.movement_type] }} />
                          : <ArrowDown className="w-3 h-3" style={{ color: TYPE_COLOR[m.movement_type] }} />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: TYPE_COLOR[m.movement_type] }}>{TYPE_LABEL[m.movement_type]}</p>
                        {m.reference && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ref: {m.reference}</p>}
                        {m.notes && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.notes}</p>}
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold" style={{ color: m.qty >= 0 ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                      {m.qty >= 0 ? '+' : ''}{m.qty}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  )
}
