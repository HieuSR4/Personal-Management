import { useMemo, useState } from 'react'
import type { Transaction } from '../types'
import { TrendChart, type TrendPoint } from './TrendChart.tsx'

const RANGE_OPTIONS = [
  { key: '3m', label: '3 tháng gần nhất', months: 3 },
  { key: '6m', label: '6 tháng gần nhất', months: 6 },
  { key: '12m', label: '12 tháng gần nhất', months: 12 },
  { key: '24m', label: '24 tháng gần nhất', months: 24 },
  { key: 'all', label: 'Toàn bộ dữ liệu', months: undefined },
] as const

const MONTH_LABELS = [
  'T01',
  'T02',
  'T03',
  'T04',
  'T05',
  'T06',
  'T07',
  'T08',
  'T09',
  'T10',
  'T11',
  'T12',
]

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return '0'
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 0 })
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const absolute = Math.abs(value)
  if (absolute === 0) return '0%'
  if (absolute >= 10) return `${absolute.toFixed(0)}%`
  return `${absolute.toFixed(1)}%`
}

type TrendRangeKey = (typeof RANGE_OPTIONS)[number]['key']

type TrendComputation = {
  points: TrendPoint[]
  total: number
  average: number
  maxPoint: TrendPoint | null
  lastPoint: TrendPoint | null
  previousPoint: TrendPoint | null
  trailingAverage: number
  previousTrailingAverage: number | null
  nonZeroMonths: number
}

function normalizeMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function computeMonthlyTrend(transactions: Transaction[], range: TrendRangeKey): TrendComputation {
  const expenseTransactions = transactions.filter((transaction) => transaction.type === 'expense')
  const monthTotals = new Map<string, number>()
  let minMonth: Date | null = null
  let maxMonth: Date | null = null

  expenseTransactions.forEach((transaction) => {
    const parsed = new Date(transaction.createdAt)
    if (Number.isNaN(parsed.getTime())) return
    const monthDate = normalizeMonth(parsed)
    const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + transaction.amount)
    if (!minMonth || monthDate < minMonth) minMonth = monthDate
    if (!maxMonth || monthDate > maxMonth) maxMonth = monthDate
  })

  if (!minMonth || !maxMonth) {
    return {
      points: [],
      total: 0,
      average: 0,
      maxPoint: null,
      lastPoint: null,
      previousPoint: null,
      trailingAverage: 0,
      previousTrailingAverage: null,
      nonZeroMonths: 0,
    }
  }

  const rangeOption = RANGE_OPTIONS.find((option) => option.key === range)
  const rangeMonths = rangeOption?.months ?? null
  const end = normalizeMonth(maxMonth)
  let start = normalizeMonth(minMonth)

  if (rangeMonths && rangeMonths > 0) {
    const candidate = new Date(end.getFullYear(), end.getMonth() - (rangeMonths - 1), 1)
    if (candidate > start) start = candidate
  }

  const points: TrendPoint[] = []
  const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())

  for (let offset = 0; offset <= Math.max(0, monthsDiff); offset += 1) {
    const iterDate = new Date(start.getFullYear(), start.getMonth() + offset, 1)
    const key = `${iterDate.getFullYear()}-${iterDate.getMonth()}`
    const value = monthTotals.get(key) ?? 0
    const label = `${MONTH_LABELS[iterDate.getMonth()]}/${String(iterDate.getFullYear()).slice(-2)}`
    points.push({ label, value, date: iterDate })
  }

  const total = points.reduce((sum, point) => sum + point.value, 0)
  const average = points.length ? total / points.length : 0
  const maxPoint = points.reduce<TrendPoint | null>((acc, point) => {
    if (!acc || point.value > acc.value) return point
    return acc
  }, null)
  const lastPoint = points.length ? points[points.length - 1] : null
  const previousPoint = points.length > 1 ? points[points.length - 2] : null

  const trailingWindow = Math.min(3, points.length)
  const trailingPoints = points.slice(-trailingWindow)
  const trailingAverage = trailingPoints.length
    ? trailingPoints.reduce((sum, point) => sum + point.value, 0) / trailingPoints.length
    : 0
  const previousTrailingPoints = points.slice(-trailingWindow * 2, -trailingWindow)
  const previousTrailingAverage = previousTrailingPoints.length
    ? previousTrailingPoints.reduce((sum, point) => sum + point.value, 0) / previousTrailingPoints.length
    : null

  const nonZeroMonths = points.filter((point) => point.value > 0).length

  return {
    points,
    total,
    average,
    maxPoint,
    lastPoint,
    previousPoint,
    trailingAverage,
    previousTrailingAverage,
    nonZeroMonths,
  }
}

type TrendAnalysisModalProps = {
  transactions: Transaction[]
  onClose: () => void
}

export function TrendAnalysisModal({ transactions, onClose }: TrendAnalysisModalProps) {
  const [range, setRange] = useState<TrendRangeKey>('6m')

  const trend = useMemo(() => computeMonthlyTrend(transactions, range), [transactions, range])

  const changeValue = (() => {
    if (!trend.lastPoint || !trend.previousPoint) return null
    return trend.lastPoint.value - trend.previousPoint.value
  })()

  const changePercent = (() => {
    if (!trend.lastPoint || !trend.previousPoint || trend.previousPoint.value === 0) return null
    return ((trend.lastPoint.value - trend.previousPoint.value) / trend.previousPoint.value) * 100
  })()

  const trailingDiff = (() => {
    if (!Number.isFinite(trend.trailingAverage) || !Number.isFinite(Number(trend.previousTrailingAverage))) {
      return null
    }
    if (trend.previousTrailingAverage === null || trend.previousTrailingAverage === 0) return null
    return ((trend.trailingAverage - trend.previousTrailingAverage) / trend.previousTrailingAverage) * 100
  })()

  const insights = useMemo(() => {
    const items: string[] = []
    if (trend.maxPoint) {
      items.push(
        `Tháng chi tiêu cao nhất: ${trend.maxPoint.label} với ${formatCurrency(trend.maxPoint.value)} VND.`,
      )
    }
    if (trend.lastPoint && trend.previousPoint) {
      const diff = trend.lastPoint.value - trend.previousPoint.value
      const direction = diff >= 0 ? 'tăng' : 'giảm'
      const formatted = formatCurrency(Math.abs(diff))
      const percentText = formatPercent(changePercent)
      const percentFragment = percentText !== '—' ? ` (${percentText})` : ''
      items.push(
        `Tháng cuối (${trend.lastPoint.label}) ${direction} ${formatted} VND so với tháng trước (${trend.previousPoint.label})${percentFragment}.`,
      )
    } else if (trend.lastPoint) {
      items.push(`Tháng gần nhất ghi nhận ${formatCurrency(trend.lastPoint.value)} VND chi tiêu.`)
    }
    if (trend.points.length > 3 && trend.previousTrailingAverage !== null) {
      const direction = trend.trailingAverage >= trend.previousTrailingAverage ? 'tăng' : 'giảm'
      items.push(
        `Chi tiêu trung bình 3 tháng gần nhất ${direction} ${formatCurrency(
          Math.abs(trend.trailingAverage - trend.previousTrailingAverage),
        )} VND so với 3 tháng liền kề trước đó.`,
      )
    }
    if (trend.nonZeroMonths < trend.points.length) {
      items.push('Có những tháng không phát sinh chi tiêu, hãy kiểm tra lại các giao dịch để đảm bảo dữ liệu đầy đủ.')
    }
    return items
  }, [trend, changePercent])

  const rangeOption = RANGE_OPTIONS.find((option) => option.key === range)
  const rangeDescription = rangeOption?.months
    ? `${rangeOption.months} tháng gần nhất`
    : 'Toàn bộ dữ liệu hiện có'
  const startLabel = trend.points[0]?.label
  const endLabel = trend.lastPoint?.label

  return (
    <div className="trend-analysis">
      <div className="trend-analysis__header">
        <div>
          <h3>Biểu đồ xu hướng chi tiêu</h3>
          <p>Theo dõi biến động chi tiêu theo tháng để kịp thời điều chỉnh kế hoạch tài chính.</p>
          {startLabel && endLabel && (
            <div className="trend-analysis__meta">
              <span>Khoảng thời gian: {startLabel} → {endLabel}</span>
              <span>Số tháng thống kê: {trend.points.length}</span>
            </div>
          )}
        </div>
        <div className="trend-analysis__filters">
          <label>
            <span>Phạm vi hiển thị</span>
            <select value={range} onChange={(event) => setRange(event.target.value as TrendRangeKey)}>
              {RANGE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {trend.points.length > 0 ? (
        <>
          <div className="trend-analysis__chart">
            <TrendChart points={trend.points} />
          </div>

          <div className="trend-analysis__summary">
            <div className="trend-summary-card">
              <span className="trend-summary-card__label">Tổng chi trong {rangeDescription}</span>
              <strong>{formatCurrency(trend.total)} VND</strong>
              <span>Trung bình {formatCurrency(trend.average)} VND / tháng</span>
            </div>
            <div className="trend-summary-card">
              <span className="trend-summary-card__label">Biến động tháng cuối</span>
              <strong
                className={
                  changeValue === null
                    ? undefined
                    : changeValue >= 0
                      ? 'trend-positive'
                      : 'trend-negative'
                }
              >
                {changeValue === null ? 'Không có dữ liệu' : `${changeValue >= 0 ? '+' : '-'}${formatCurrency(Math.abs(changeValue))} VND`}
              </strong>
              <span>
                {changePercent === null
                  ? 'Thiếu dữ liệu để so sánh.'
                  : `${changePercent >= 0 ? 'Tăng' : 'Giảm'} ${formatPercent(changePercent)} so với ${
                      trend.previousPoint?.label ?? 'tháng trước'
                    }.`}
              </span>
            </div>
            <div className="trend-summary-card">
              <span className="trend-summary-card__label">Trung bình 3 tháng gần nhất</span>
              <strong>{formatCurrency(trend.trailingAverage)} VND</strong>
              <span>
                {trend.previousTrailingAverage === null
                  ? 'Chưa đủ dữ liệu để so sánh.'
                  : trailingDiff === null
                    ? 'Không thể tính tỷ lệ thay đổi do 3 tháng trước đó bằng 0.'
                    : `So với 3 tháng trước đó: ${formatPercent(trailingDiff)} thay đổi.`}
              </span>
            </div>
          </div>

          {insights.length > 0 && (
            <div className="trend-analysis__insights">
              <h4>Nhận xét nhanh</h4>
              <ul>
                {insights.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="trend-analysis__empty">
          <p>
            Chưa có giao dịch chi tiêu trong phạm vi đã chọn. Hãy thêm giao dịch mới hoặc thử mở rộng phạm vi để xem xu hướng
            chi tiêu.
          </p>
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={onClose}>
          Đóng
        </button>
      </div>
    </div>
  )
}