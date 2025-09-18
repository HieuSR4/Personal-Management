import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { deleteTransaction, subscribeToTransactions, updateTransaction } from '../services/dataService'
import { saveTransaction } from '../services/saveService'
import type { Transaction, TransactionType } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { DonutChart } from '../components/DonutChart'
import { BarChart } from '../components/BarChart'

const LOGOS = {
  MoMo: new URL('../../res/img/momo.png', import.meta.url).href,
  Vietinbank: new URL('../../res/img/vietinbank.png', import.meta.url).href,
  MBBank: new URL('../../res/img/mbbank.png', import.meta.url).href,
} as const

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
  const [formState, setFormState] = useState(defaultFormState)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (!user) return
    return subscribeToTransactions(user.uid, setTransactions)
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
            const palette = ['#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#14b8a6', '#f97316']
            const data = Array.from(byCat.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 7)
              .map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }))
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
