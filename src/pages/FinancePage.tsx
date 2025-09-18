import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { deleteTransaction, subscribeToTransactions, updateTransaction, subscribeToSources, addSource } from '../services/dataService'
import { saveTransaction } from '../services/saveService'
import type { Transaction, TransactionType, MoneySource } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { DonutChart } from '../components/DonutChart'
import { BarChart } from '../components/BarChart'

const LOGOS = {
  MoMo: new URL('../../res/img/momo.png', import.meta.url).href,
  Vietinbank: new URL('../../res/img/vietinbank.png', import.meta.url).href,
  MBBank: new URL('../../res/img/mbbank.png', import.meta.url).href,
  Binance: new URL('../../res/img/binance.png', import.meta.url).href,
} as const

// Category presets with fixed colors
const EXPENSE_CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: 'Ăn uống', label: 'Ăn uống', color: '#ef4444' },
  { key: 'Đi lại', label: 'Đi lại', color: '#f59e0b' },
  { key: 'Hóa đơn', label: 'Hóa đơn', color: '#0ea5e9' },
  { key: 'Mua sắm', label: 'Mua sắm', color: '#8b5cf6' },
  { key: 'Sức khỏe', label: 'Sức khỏe', color: '#14b8a6' },
  { key: 'Giải trí', label: 'Giải trí', color: '#f97316' },
  { key: 'Giáo dục', label: 'Giáo dục', color: '#22c55e' },
  { key: 'Nhà cửa', label: 'Nhà cửa', color: '#64748b' },
  { key: 'Du lịch', label: 'Du lịch', color: '#06b6d4' },
  { key: 'Khác', label: 'Khác', color: '#475569' },
]
const INCOME_CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: 'Lương', label: 'Lương', color: '#22c55e' },
  { key: 'Thưởng', label: 'Thưởng', color: '#10b981' },
  { key: 'Khác', label: 'Khác', color: '#84cc16' },
]
const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

const getCategoryOptions = (type: TransactionType) =>
  type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

function colorForCategory(label: string) {
  const found = ALL_CATEGORIES.find((c) => c.label === label)
  if (found) return found.color
  // Fallback deterministic palette
  const palette = ['#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#14b8a6', '#f97316']
  let hash = 0
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0
  return palette[hash % palette.length]
}

const defaultFormState = {
  type: 'expense' as TransactionType,
  amount: '',
  category: '',
  note: '',
  date: new Date().toISOString().slice(0, 10),
  source: '',
}

export function FinancePage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [sources, setSources] = useState<MoneySource[]>([])
  const [formState, setFormState] = useState(defaultFormState)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [sourceInputs, setSourceInputs] = useState<Record<string, string>>({})
  const [sourceSaving, setSourceSaving] = useState<Record<string, boolean>>({})
  const [sourceExpanded, setSourceExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!user) return
    return subscribeToTransactions(user.uid, setTransactions)
  }, [user])

  useEffect(() => {
    if (!user) return
    return subscribeToSources(user.uid, setSources)
  }, [user])

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'income') {
          acc.income += transaction.amount
        } else {
          acc.expense += transaction.amount
        }
        return acc
      },
      { income: 0, expense: 0 },
    )
  }, [transactions])
  const balance = summary.income - summary.expense

  const sourceBalances = useMemo(() => {
    const sums = new Map<string, number>()
    sources.forEach((s) => sums.set(s.key, Number(s.initialBalance || 0)))
    transactions.forEach((t) => {
      const key = (t as any).source as string | undefined
      if (!key) return
      const curr = sums.get(key) ?? 0
      const delta = t.type === 'income' ? t.amount : -t.amount
      sums.set(key, curr + delta)
    })
    return sums
  }, [transactions, sources])

  const handleDepositToSource = async (s: MoneySource) => {
    if (!user) return
    const raw = sourceInputs[s.id] || ''
    const amount = toNumber(raw)
    if (amount <= 0) {
      setError('So tien nap vao phai lon hon 0')
      return
    }
    setError(null)
    setSourceSaving((prev) => ({ ...prev, [s.id]: true }))
    try {
      await saveTransaction(user.uid, {
        amount,
        type: 'income',
        category: 'Nạp tiền',
        note: `Nạp vào ${s.name}`,
        source: s.key,
        date: new Date().toISOString().slice(0, 10),
      })
      setSourceInputs((prev) => ({ ...prev, [s.id]: '' }))
      setSourceExpanded((prev) => ({ ...prev, [s.id]: false }))
    } catch (e) {
      console.error(e)
      setError('Không thể nạp tiền vào nguồn này.')
    } finally {
      setSourceSaving((prev) => ({ ...prev, [s.id]: false }))
    }
  }

  const digitsOnly = (s: string) => s.replace(/\D/g, '')
  const formatAmount = (s: string) => {
    const d = digitsOnly(s)
    if (!d) return ''
    return Number(d).toLocaleString('vi-VN')
  }
  const toNumber = (s: string) => Number(digitsOnly(String(s)) || 0)

  const formatSource = (s?: string) => {
    if (!s) return ''
    if (s === 'MoMo') return 'Ví điện tử MoMo'
    if (s === 'Vietinbank') return 'Ngân hàng Vietinbank'
    if (s === 'MBBank') return 'Ngân hàng MBBank'
    return s
  }


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return

    if (!formState.amount) {
      setError('Bạn cần nhập số tiền')
      return
    }

    setSaving(true)
    setError(null)
    const previous = formState
    if (!editingId) setFormState(defaultFormState)
    try {
      if (editingId) {
        const update: Record<string, unknown> = {
          amount: toNumber(previous.amount),
          category: previous.category || 'Không phân loại',
          type: previous.type,
        }
        if (previous.note && previous.note.trim()) update.note = previous.note.trim()
        if (previous.source && previous.source.trim()) update.source = previous.source.trim()
        if (previous.date) update.createdAt = new Date(`${previous.date}T00:00:00`).toISOString()
        await updateTransaction(user.uid, editingId, update)
        setEditingId(null)
        setFormState(defaultFormState)
        setShowForm(false)
      } else {
        await saveTransaction(user.uid, {
          amount: toNumber(previous.amount),
          category: previous.category || 'Không phân loại',
          type: previous.type,
          note: previous.note || undefined,
          date: previous.date,
          source: previous.source,
        })
        setShowForm(false)
      }
    } catch (err) {
      const anyErr = err as { code?: string; message?: string }
      console.error('save/update transaction failed:', anyErr?.code, anyErr?.message)
      if (!editingId) setFormState(previous)
      if (anyErr?.code === 'permission-denied') {
        setError('Không có quyền ghi dữ liệu. Vui lòng kiểm tra Firestore Rules hoặc đăng nhập lại.')
      } else if (anyErr?.code === 'unauthenticated') {
        setError('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.')
      } else {
        setError('Không thể lưu giao dịch. Vui lòng thử lại.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    try {
      await deleteTransaction(user.uid, id)
    } catch (err) {
      console.error(err)
      setError('Không thể xoá giao dịch.')
    }
  }

  const startEditing = (t: Transaction) => {
    const date = t.createdAt
      ? new Date(t.createdAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
    setFormState({
      type: t.type,
      amount: Number(t.amount).toLocaleString('vi-VN'),
      category: t.category,
      note: t.note || '',
      date,
      source: (t as any).source || '',
    })
    setEditingId(t.id)
    setShowForm(true)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setFormState(defaultFormState)
    setShowForm(false)
  }

  return (
    <section className="page finance-page">
      <div className="page-header">
        <div>
          <h2>Quản lý tài chính</h2>
          <p>Theo dõi thu chi và số dư của bạn.</p>
        </div>
        <div className="header-right">
          <button
            type="button"
            className="add-btn"
            title="Thêm giao dịch"
            onClick={() => {
              setEditingId(null)
              setFormState(defaultFormState)
              setShowForm(true)
            }}
          >
            +
          </button>
          <div className="finance-summary">
          <div>
            <span>Thu</span>
            <strong>{summary.income.toLocaleString('vi-VN')} VND</strong>
          </div>
          <div>
            <span>Chi</span>
            <strong>{summary.expense.toLocaleString('vi-VN')} VND</strong>
          </div>
          <div>
            <span>Số dư</span>
            <strong className={balance >= 0 ? 'positive' : 'negative'}>
              {balance.toLocaleString('vi-VN')} VND
            </strong>
          </div>
          </div>
        </div>
      </div>

      {/* Sources overview */}
      <div className="card">
        <h3>Nguồn tiền</h3>
        {sources.length === 0 ? (
          <div className="mini-stats">
            <span>Chưa có nguồn tiền nào.</span>
            {user && (
              <div className="form-actions">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const defaults: Array<{ key: string; name: string }> = [
                        { key: 'MoMo', name: 'Ví điện tử MoMo' },
                        { key: 'Vietinbank', name: 'Ngân hàng Vietinbank' },
                        { key: 'Binance', name: 'Ví Binance' },
                      ]
                      for (const d of defaults) {
                        await addSource(user.uid, { key: d.key, name: d.name, initialBalance: 0 })
                      }
                    } catch (e) {
                      console.error(e)
                      setError('Không thể thêm nguồn mặc định.')
                    }
                  }}
                >
                  Thêm nguồn mặc định (MoMo, Vietinbank, Binance)
                </button>
              </div>
            )}
          </div>
        ) : (
          <ul className="list-sources" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {sources.map((s) => {
              const bal = sourceBalances.get(s.key) ?? (s.initialBalance || 0)
              const key = s.key as keyof typeof LOGOS
              const logo = LOGOS[key]
              return (
                <li key={s.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {logo ? (
                      <img className="source-logo" src={logo} alt={s.name} title={s.name} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: '#eef2ff', color: '#3730a3', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {s.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <strong>{s.name}</strong>
                      <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b' }}>{s.key}</span>
                    </div>
                  </div>
                  <div className="source-actions">
                    <div>
                      <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b' }}>Số dư</span>
                      <strong className={bal >= 0 ? 'positive' : 'negative'}>{bal.toLocaleString('vi-VN')} VND</strong>
                    </div>
                    <button
                      type="button"
                      title="Nạp vào nguồn"
                      aria-label={`Nạp vào ${s.name}`}
                      onClick={() => setSourceExpanded((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                      className="icon-btn source-add-btn"
                    >
                      +
                    </button>
                  </div>
                  {sourceExpanded[s.id] && (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleDepositToSource(s) }}
                      className="source-deposit-form"
                    >
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      placeholder="Số tiền nạp"
                      value={sourceInputs[s.id] ?? ''}
                      onChange={(e) => setSourceInputs((prev) => ({ ...prev, [s.id]: (e.target.value || '').replace(/[^\d.,\s]/g, '') }))}
                      onBlur={(e) => setSourceInputs((prev) => ({ ...prev, [s.id]: (e.target.value ? (Number((e.target.value || '').replace(/\D/g, '')) || 0).toLocaleString('vi-VN') : '') }))}
                      style={{ maxWidth: 180 }}
                    />
                    <button type="submit" disabled={!!sourceSaving[s.id]}>
                      {sourceSaving[s.id] ? 'Đang nạp...' : 'Nạp' }
                    </button>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Charts */}
      <div className="card charts-grid">
        <div className="chart-card">
          <h3>Phân bổ chi theo nhóm (tháng này)</h3>
          {(() => {
            const now = new Date()
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
            const byCat = new Map<string, number>()
            transactions.forEach((t) => {
              if (t.type !== 'expense') return
              const d = new Date(t.createdAt)
              if (d < monthStart) return
              const key = t.category || 'Khác'
              byCat.set(key, (byCat.get(key) || 0) + t.amount)
            })
            const data = Array.from(byCat.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 7)
              .map(([label, value]) => ({ label, value, color: colorForCategory(label) }))
            if (data.length === 0) return <p>Chưa có chi tiêu trong tháng này.</p>
            return (
              <div className="chart-flex">
                <DonutChart data={data} />
                <ul className="chart-legend">
                  {data.map((d) => (
                    <li key={d.label}>
                      <span className="swatch" style={{ background: d.color }} />
                      <span className="label">{d.label}</span>
                      <span className="value">{d.value.toLocaleString('vi-VN')} VND</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })()}
        </div>
        <div className="chart-card">
          <h3>Tổng thu vs chi (tháng này)</h3>
          {(() => {
            const now = new Date()
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
            let income = 0
            let expense = 0
            transactions.forEach((t) => {
              const d = new Date(t.createdAt)
              if (d < monthStart) return
              if (t.type === 'income') income += t.amount
              else expense += t.amount
            })
            const data = [
              { label: 'Thu', value: income, color: '#22c55e' },
              { label: 'Chi', value: expense, color: '#ef4444' },
            ]
            if (income === 0 && expense === 0) return <p>Chưa có dữ liệu trong tháng này.</p>
            return <BarChart data={data} />
          })()}
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={cancelEditing}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form className="form" onSubmit={handleSubmit}>
              <h3>{editingId ? 'Cập nhật giao dịch' : 'Thêm giao dịch'}</h3>
              {error && <p className="form-error">{error}</p>}
              <div className="form-row">
                <label>
                  Loại giao dịch
                  <select
                    value={formState.type}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, type: event.target.value as TransactionType }))
                    }
                  >
                    <option value="income">Thu</option>
                    <option value="expense">Chi</option>
                    <option value="Binance">Ví Binance</option>
                  </select>
                </label>
                <label>
                  Số tiền (VND)
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formState.amount}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, amount: formatAmount(event.target.value) }))
                    }
                    placeholder="0"
                    required
                  />
                </label>
                <label>
                  Nhóm
                  <input
                    type="text"
                    value={formState.category}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, category: event.target.value }))
                    }
                    placeholder="Ví dụ: Ăn uống, Lương, Đi lại..."
                  />
                </label>
                <label>
                  Nhóm
                  <select
                    value={formState.category}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, category: event.target.value }))
                    }
                  >
                    <option value="">-- Chọn nhóm --</option>
                    {getCategoryOptions(formState.type).map((c) => (
                      <option key={c.key} value={c.label}>{c.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label>
                  Ngày giao dịch
                  <input
                    type="date"
                    value={formState.date}
                    onChange={(event) => setFormState((prev) => ({ ...prev, date: event.target.value }))}
                  />
                </label>
                <label>
                  Nguồn (Ngân hàng/Ví điện tử)
                  <select
                    value={formState.source}
                    onChange={(event) => setFormState((prev) => ({ ...prev, source: event.target.value }))}
                  >
                    <option value="">-- Chọn nguồn --</option>
                    <option value="MoMo">Ví điện tử MoMo</option>
                    <option value="Vietinbank">Ngân hàng Vietinbank</option>
                    <option value="MBBank">Ngân hàng MBBank</option>
                  </select>
                </label>
              </div>
              <label>
                Ghi chú
                <textarea
                  value={formState.note}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, note: event.target.value }))
                  }
                  rows={2}
                  placeholder="Thông tin thêm..."
                />
              </label>
              <div className="form-actions">
                {editingId ? (
                  <>
                    <button type="submit" disabled={saving}>
                      {saving ? 'Đang cập nhật...' : 'Cập nhật giao dịch'}
                    </button>
                    <button type="button" onClick={cancelEditing} disabled={saving}>
                      Hủy sửa
                    </button>
                  </>
                ) : (
                  <>
                    <button type="submit" disabled={saving}>
                      {saving ? 'Đang lưu...' : 'Lưu giao dịch'}
                    </button>
                    <button type="button" onClick={cancelEditing} disabled={saving}>
                      Đóng
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card list">
        <h3>Lịch sử giao dịch</h3>
        {transactions.length === 0 ? (
          <p>Chưa có giao dịch nào. Hãy thêm giao dịch đầu tiên của bạn.</p>
        ) : (
          <ul>
            {transactions.map((transaction) => (
              <li key={transaction.id} className={`item ${transaction.type}`}>
                <div>
                  <strong>{transaction.category}</strong>
                  <div className="note-line">
                    {transaction.note && <span>{transaction.note} - </span>}
                    <time dateTime={transaction.createdAt}>
                      {new Date(transaction.createdAt).toLocaleDateString('vi-VN')}
                    </time>
                  </div>
                  <div className="transaction-meta">
                    <span className={`amount ${transaction.type}`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {transaction.amount.toLocaleString('vi-VN')} VND
                    </span>
                  </div>
                </div>
                <div className="item-actions">
                  {((transaction as any).source as string | undefined) && (() => {
                    const key = (transaction as any).source as keyof typeof LOGOS
                    const src = LOGOS[key]
                    if (!src) return null
                    return (
                      <img
                        className="source-logo"
                        src={src}
                        alt={formatSource((transaction as any).source)}
                        title={formatSource((transaction as any).source)}
                      />
                    )
                  })()}
                  <button type="button" onClick={() => startEditing(transaction)}>
                    Sửa
                  </button>
                  <button type="button" onClick={() => handleDelete(transaction.id)}>
                    Xóa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
