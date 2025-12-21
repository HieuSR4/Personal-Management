import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  addInvestmentTrade,
  subscribeToInvestmentTrades,
  subscribeToTransactions,
  updateInvestmentTrade,
} from '../services/dataService'
import type { InvestmentTrade, Transaction } from '../types'
import { normalizeCategoryName } from '../utils/transactions'
import { combineDateWithCurrentTime } from '../utils/date.ts'

const INVESTMENT_CATEGORY_LABEL = 'Đầu tư'

function normalizeForComparison(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const INVESTMENT_CATEGORY_KEY = normalizeForComparison(INVESTMENT_CATEGORY_LABEL)

function formatDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : ''
  return date.toLocaleDateString('vi-VN')
}

function toDateInputValue(value: string | Date | undefined) {
  if (!value) return new Date().toISOString().slice(0, 10)
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

type TradeFormState = {
  asset: string
  quantity: string
  price: string
  fee: string
  note: string
  date: string
}

const defaultTradeForm = (): TradeFormState => ({
  asset: 'Quỹ ETF E1VFVN30',
  quantity: '',
  price: '',
  fee: '',
  note: '',
  date: new Date().toISOString().slice(0, 10),
})

export function InvestmentPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [trades, setTrades] = useState<InvestmentTrade[]>([])
  const [tradeForm, setTradeForm] = useState<TradeFormState>(() => defaultTradeForm())
  const [savingTrade, setSavingTrade] = useState(false)
  const [tradeError, setTradeError] = useState<string | null>(null)
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    return subscribeToTransactions(user.uid, setTransactions)
  }, [user])

  useEffect(() => {
    if (!user) return
    return subscribeToInvestmentTrades(user.uid, setTrades)
  }, [user])

  const investmentDeposits = useMemo(() => {
    return transactions.filter((transaction) => {
      if (transaction.type !== 'expense') return false
      const category = normalizeCategoryName(transaction.category)
      return normalizeForComparison(category) === INVESTMENT_CATEGORY_KEY
    })
  }, [transactions])

  const sortedInvestmentDeposits = useMemo(() => {
    const parseTime = (value?: string) => {
      if (!value) return 0
      const time = new Date(value).getTime()
      return Number.isNaN(time) ? 0 : time
    }
    const getSortKey = (transaction: Transaction) =>
      Math.max(transaction.sortTimestamp ?? 0, parseTime(transaction.updatedAt), parseTime(transaction.createdAt))
    return investmentDeposits.slice().sort((a, b) => getSortKey(b) - getSortKey(a))
  }, [investmentDeposits])

  const totalDeposited = useMemo(
    () => sortedInvestmentDeposits.reduce((sum, transaction) => sum + transaction.amount, 0),
    [sortedInvestmentDeposits],
  )

  const lastDepositDate = sortedInvestmentDeposits[0]?.createdAt ?? null

  const sortedTrades = useMemo(() => {
    const parseTime = (value?: string | Date) => {
      if (!value) return 0
      const time = value instanceof Date ? value.getTime() : new Date(value).getTime()
      return Number.isNaN(time) ? 0 : time
    }
    const getSortKey = (trade: InvestmentTrade) =>
      Math.max(trade.sortTimestamp ?? 0, parseTime(trade.updatedAt), parseTime(trade.createdAt))
    return trades.slice().sort((a, b) => getSortKey(b) - getSortKey(a))
  }, [trades])

  const totalSpent = useMemo(
    () =>
      sortedTrades.reduce((sum, trade) => {
        const fee = trade.fee ?? 0
        return sum + trade.quantity * trade.price + fee
      }, 0),
    [sortedTrades],
  )

  const availableForInvestment = totalDeposited - totalSpent

  const tradePreviewTotal = useMemo(() => {
    const quantity = Number(tradeForm.quantity)
    const price = Number(tradeForm.price)
    const fee = Number(tradeForm.fee) || 0
    if (!Number.isFinite(quantity) || !Number.isFinite(price)) return 0
    return quantity * price + fee
  }, [tradeForm.quantity, tradeForm.price, tradeForm.fee])

  const resetTradeForm = () => {
    setTradeForm(defaultTradeForm())
    setTradeError(null)
    setEditingTradeId(null)
  }

  const handleTradeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return
    const quantity = Number(tradeForm.quantity)
    const price = Number(tradeForm.price)
    const fee = Number(tradeForm.fee) || 0
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) {
      setTradeError('Số lượng và giá mua phải lớn hơn 0.')
      return
    }

    try {
      setSavingTrade(true)
      setTradeError(null)
      const createdAtValue = new Date(combineDateWithCurrentTime(tradeForm.date))
      const payload = {
        asset: tradeForm.asset.trim() || 'Quỹ ETF',
        quantity,
        price,
        fee,
        note: tradeForm.note.trim() || undefined,
        createdAt: createdAtValue,
      }

      if (editingTradeId) {
        await updateInvestmentTrade(user.uid, editingTradeId, payload)
      } else {
        await addInvestmentTrade(user.uid, payload)
      }
      resetTradeForm()
    } catch (err) {
      console.error(err)
      setTradeError('Không thể lưu lệnh mua. Vui lòng thử lại.')
    } finally {
      setSavingTrade(false)
    }
  }

  const startEditingTrade = (trade: InvestmentTrade) => {
    setEditingTradeId(trade.id)
    setTradeForm({
      asset: trade.asset || 'Quỹ ETF',
      quantity: String(trade.quantity),
      price: String(trade.price),
      fee: trade.fee !== undefined ? String(trade.fee) : '',
      note: trade.note || '',
      date: toDateInputValue(trade.createdAt as string | Date | undefined),
    })
    setTradeError(null)
  }

  return (
    <section className="page investment-page">
      <div className="page-header">
        <div>
          <h2>Đầu tư</h2>
          <p>Theo dõi danh mục và hiệu quả đầu tư của bạn.</p>
        </div>
        <div className="header-right">
          <div className="finance-summary">
            <div>
              <span>Tổng tiền đã nạp</span>
              <strong>{totalDeposited.toLocaleString('vi-VN')} VND</strong>
            </div>
            <div>
              <span>Đã dùng mua ETF</span>
              <strong>{totalSpent.toLocaleString('vi-VN')} VND</strong>
            </div>
            <div>
              <span>Số dư đầu tư</span>
              <strong className={availableForInvestment >= 0 ? 'positive' : 'negative'}>
                {availableForInvestment.toLocaleString('vi-VN')} VND
              </strong>
            </div>
            <div>
              <span>Lần nạp gần nhất</span>
              <strong>{lastDepositDate ? formatDate(lastDepositDate) : 'Chưa có'}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Lệnh mua quỹ ETF</h3>
        <form className="form" onSubmit={handleTradeSubmit}>
          {tradeError && <p className="form-error">{tradeError}</p>}
          <div className="form-row">
            <label>
              Tên quỹ / mã
              <input
                type="text"
                value={tradeForm.asset}
                onChange={(event) => setTradeForm((prev) => ({ ...prev, asset: event.target.value }))}
                placeholder="Quỹ ETF"
              />
            </label>
            <label>
              Số lượng
              <input
                type="number"
                min="0"
                step="0.0001"
                inputMode="decimal"
                value={tradeForm.quantity}
                onChange={(event) => setTradeForm((prev) => ({ ...prev, quantity: event.target.value }))}
                required
              />
            </label>
            <label>
              Giá mua (VND)
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={tradeForm.price}
                onChange={(event) => setTradeForm((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
            </label>
            <label>
              Phí mua (VND)
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={tradeForm.fee}
                onChange={(event) => setTradeForm((prev) => ({ ...prev, fee: event.target.value }))}
                placeholder="0"
              />
            </label>
            <label>
              Ngày mua
              <input
                type="date"
                value={tradeForm.date}
                onChange={(event) => setTradeForm((prev) => ({ ...prev, date: event.target.value }))}
                required
              />
            </label>
          </div>
          <label>
            Ghi chú
            <textarea
              rows={2}
              value={tradeForm.note}
              onChange={(event) => setTradeForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Ví dụ: Mua định kỳ, tích lũy lâu dài..."
            />
          </label>
          <div className="mini-stats">
            <span>
              Tổng giá trị lệnh: <strong>{tradePreviewTotal.toLocaleString('vi-VN')} VND</strong>
            </span>
            <span>
              Số dư sau lệnh (ước tính):{' '}
              <strong className={availableForInvestment - tradePreviewTotal >= 0 ? 'positive' : 'negative'}>
                {(availableForInvestment - tradePreviewTotal).toLocaleString('vi-VN')} VND
              </strong>
            </span>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={savingTrade}>
              {savingTrade ? 'Đang lưu...' : editingTradeId ? 'Cập nhật lệnh' : 'Lưu lệnh mua'}
            </button>
            <button type="button" onClick={resetTradeForm} disabled={savingTrade}>
              {editingTradeId ? 'Hủy chỉnh sửa' : 'Xóa nhập'}
            </button>
          </div>
        </form>
      </div>

      <div className="investment-history-grid">
        <div className="card list investment-history-card investment-history-card--trades">
        <h3>Lịch sử lệnh mua</h3>
        {sortedTrades.length === 0 ? (
          <p>Chưa có lệnh mua nào.</p>
        ) : (
          <ul>
            {sortedTrades.map((trade) => {
              const fee = trade.fee ?? 0
              const total = trade.quantity * trade.price + fee
              return (
                <li key={trade.id} className="item expense">
                  <div>
                    <strong>Mua {trade.asset || 'Quỹ ETF'}</strong>
                    <div className="note-line">
                      <span>
                        SL: {trade.quantity} • Giá: {trade.price.toLocaleString('vi-VN')} VND
                        {fee ? ` • Phí: ${fee.toLocaleString('vi-VN')} VND` : ''}
                      </span>
                      <time dateTime={new Date(trade.createdAt).toISOString()}>
                        {formatDate(trade.createdAt)}
                      </time>
                    </div>
                    {trade.note ? <span className="note-line">{trade.note}</span> : null}
                    <div className="transaction-meta">
                      <span className="amount expense">-{total.toLocaleString('vi-VN')} VND</span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

        <div className="card list investment-history-card investment-history-card--deposits">
        <h3>Lịch sử nạp tiền vào đầu tư</h3>
        {sortedInvestmentDeposits.length === 0 ? (
          <p>Chưa có giao dịch nạp tiền cho danh mục đầu tư.</p>
        ) : (
          <ul>
            {sortedInvestmentDeposits.map((transaction) => (
              <li key={transaction.id} className={`item ${transaction.type}`}>
                <div>
                  <strong>{INVESTMENT_CATEGORY_LABEL}</strong>
                  <div className="note-line">
                    {transaction.note && <span>{transaction.note} - </span>}
                    <time dateTime={new Date(transaction.createdAt).toISOString()}>
                      {formatDate(transaction.createdAt)}
                    </time>
                  </div>
                  <div className="transaction-meta">
                    <span className={`amount ${transaction.type}`}>
                      -{transaction.amount.toLocaleString('vi-VN')} VND
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        </div>
      </div>
    </section>
  )
}