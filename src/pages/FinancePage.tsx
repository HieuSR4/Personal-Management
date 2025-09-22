import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addSource,
  deleteBudget,
  deleteTransaction,
  saveBudget,
  subscribeToBudgets,
  subscribeToSources,
  subscribeToTransactions,
  updateTransaction,
} from '../services/dataService'
import { saveTask, saveTransaction } from '../services/saveService'
import type { Budget, MoneySource, Transaction, TransactionType } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { DonutChart } from '../components/DonutChart'
import { BarChart } from '../components/BarChart'
import { TrendAnalysisModal } from '../components/TrendAnalysisModal'
import { combineDateWithCurrentTime } from '../utils/date.ts'

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

const monthLabelFormatter = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' })

type BudgetFormState = {
  id: string | null
  category: string
  month: string
  limitAmount: string
}

type BudgetProgress = Budget & {
  spent: number
  percent: number
  status: 'ok' | 'warning' | 'danger' | 'no-limit'
  remaining: number
  overspent: number
}

function normalizeCategoryName(value: string | undefined) {
  const normalized = (value ?? '').trim()
  return normalized || 'Không phân loại'
}

function toMonthKey(date: Date) {
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

function formatBudgetMonthLabel(month: string) {
  if (!month) return 'Không xác định'
  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1
  if (!Number.isFinite(year) || Number.isNaN(monthIndex) || monthIndex < 0) return month
  const date = new Date(year, monthIndex)
  if (Number.isNaN(date.getTime())) return month
  return monthLabelFormatter.format(date)
}

function getDefaultBudgetMonth() {
  return toMonthKey(new Date())
}

function parseMonthKey(month: string) {
  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const monthNumber = Number(monthStr)
  if (!Number.isFinite(year) || !Number.isFinite(monthNumber)) return null
  if (monthNumber < 1 || monthNumber > 12) return null
  return { year, month: monthNumber }
}

function compareMonthKeys(a: string, b: string) {
  if (!a && !b) return 0
  if (!a) return -1
  if (!b) return 1
  const parsedA = parseMonthKey(a)
  const parsedB = parseMonthKey(b)
  if (!parsedA && !parsedB) return 0
  if (!parsedA) return -1
  if (!parsedB) return 1
  if (parsedA.year !== parsedB.year) return parsedA.year - parsedB.year
  return parsedA.month - parsedB.month
}

function getBudgetTaskDueDate(month: string) {
  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1
  if (!Number.isFinite(year) || Number.isNaN(monthIndex) || monthIndex < 0) return undefined
  const lastDay = new Date(year, monthIndex + 1, 0)
  if (Number.isNaN(lastDay.getTime())) return undefined
  return lastDay.toISOString().slice(0, 10)
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
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [currentMonthKey, setCurrentMonthKey] = useState(() => getDefaultBudgetMonth())
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [budgetFormState, setBudgetFormState] = useState<BudgetFormState>(() => ({
    id: null,
    category: '',
    month: getDefaultBudgetMonth(),
    limitAmount: '',
  }))
  const [budgetFormError, setBudgetFormError] = useState<string | null>(null)
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [budgetDeletingId, setBudgetDeletingId] = useState<string | null>(null)
  const [dismissedBudgetAlerts, setDismissedBudgetAlerts] = useState<Record<string, boolean>>({})
  const [budgetTaskError, setBudgetTaskError] = useState<Record<string, string | null>>({})
  const [creatingTaskForBudget, setCreatingTaskForBudget] = useState<string | null>(null)
  const [formState, setFormState] = useState(defaultFormState)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [analysisModal, setAnalysisModal] = useState<null | 'trend' | 'compare' | 'top' | 'summary'>(null)
  const [sourceInputs, setSourceInputs] = useState<Record<string, string>>({})
  const [sourceSaving, setSourceSaving] = useState<Record<string, boolean>>({})
  const [sourceExpanded, setSourceExpanded] = useState<Record<string, boolean>>({})
  const [usdtVndRate, setUsdtVndRate] = useState<number | null>(null)
  const [usdtRateUpdatedAt, setUsdtRateUpdatedAt] = useState<string | null>(null)
  const [usdtRateLoading, setUsdtRateLoading] = useState(false)
  const [usdtRateError, setUsdtRateError] = useState<string | null>(null)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferTarget, setTransferTarget] = useState('')
  const [transferSaving, setTransferSaving] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transactionCategoryFilter, setTransactionCategoryFilter] = useState<string>('all')
  const isMountedRef = useRef(true)

  const fetchUsdtRate = useCallback(async () => {
    try {
      if (!isMountedRef.current) return
      setUsdtRateLoading(true)
      setUsdtRateError(null)
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=vnd',
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = (await response.json()) as { tether?: { vnd?: number } }
      const rate = data?.tether?.vnd
      if (typeof rate !== 'number' || Number.isNaN(rate)) throw new Error('Missing USDT/VND rate')
      if (!isMountedRef.current) return
      setUsdtVndRate(rate)
      setUsdtRateUpdatedAt(new Date().toISOString())
    } catch (err) {
      console.error('Failed to fetch USDT/VND rate', err)
      if (!isMountedRef.current) return
      setUsdtRateError('Không thể lấy tỷ giá USDT/VND. Vui lòng thử lại sau.')
    } finally {
      if (isMountedRef.current) setUsdtRateLoading(false)
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    fetchUsdtRate()
    const interval = typeof window !== 'undefined' ? window.setInterval(fetchUsdtRate, 60 * 60 * 1000) : undefined
    return () => {
      isMountedRef.current = false
      if (interval) window.clearInterval(interval)
    }
  }, [fetchUsdtRate])

  useEffect(() => {
    if (!user) return
    return subscribeToTransactions(user.uid, setTransactions)
  }, [user])

  useEffect(() => {
    if (!user) return
    return subscribeToSources(user.uid, setSources)
  }, [user])

  useEffect(() => {
    if (!user) return
    return subscribeToBudgets(user.uid, setBudgets)
  }, [user])

  useEffect(() => {
    const updateMonthKey = () => {
      setCurrentMonthKey((prev) => {
        const next = getDefaultBudgetMonth()
        return prev === next ? prev : next
      })
    }

    if (typeof window === 'undefined') {
      updateMonthKey()
      return
    }

    let timeoutId: number | undefined

    const scheduleNextUpdate = () => {
      const now = new Date()
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0)
      const diff = nextMonthStart.getTime() - now.getTime()
      const MIN_DELAY = 1_000
      const MAX_DELAY = 2_147_483_647
      const delay = Math.min(Math.max(diff, MIN_DELAY), MAX_DELAY)
      timeoutId = window.setTimeout(() => {
        updateMonthKey()
        scheduleNextUpdate()
      }, delay)
    }

    updateMonthKey()
    scheduleNextUpdate()

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    const exists = transferTarget ? sources.some((source) => source.key === transferTarget) : false
    if (transferTarget && !exists) {
      setTransferTarget('')
      return
    }
    if (!transferTarget) {
      const preferred = sources.find((source) => source.key === 'Vietinbank')
      if (preferred) {
        setTransferTarget(preferred.key)
        return
      }
      const fallback = sources.find((source) => source.key !== 'Binance')
      if (fallback) setTransferTarget(fallback.key)
    }
  }, [sources, transferTarget])

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
      const key = t.source
      if (!key) return
      const curr = sums.get(key) ?? 0
      const delta = t.type === 'income' ? t.amount : -t.amount
      sums.set(key, curr + delta)
    })
    return sums
  }, [transactions, sources])

  const selectedTransferTarget = useMemo(
    () => sources.find((source) => source.key === transferTarget) ?? null,
    [sources, transferTarget],
  )
  const selectedTransferTargetBalance = selectedTransferTarget
    ? sourceBalances.get(selectedTransferTarget.key) ?? Number(selectedTransferTarget.initialBalance || 0)
    : 0

  const sortedTransactions = useMemo(() => {
    const parseTime = (value?: string) => {
      if (!value) return 0
      const time = new Date(value).getTime()
      return Number.isNaN(time) ? 0 : time
    }

    const withSortKey = (transaction: Transaction) =>
      Math.max(
        transaction.sortTimestamp ?? 0,
        parseTime(transaction.createdAt),
        parseTime(transaction.updatedAt),
      )

    const originalOrder = new Map<string, number>()
    transactions.forEach((transaction, index) => {
      originalOrder.set(transaction.id, index)
    })

    return transactions
      .slice()
      .sort((a, b) => {
        const sortKeyA = withSortKey(a)
        const sortKeyB = withSortKey(b)
        if (sortKeyA !== sortKeyB) return sortKeyB - sortKeyA

        const createdAtA = parseTime(a.createdAt)
        const createdAtB = parseTime(b.createdAt)
        if (createdAtA !== createdAtB) return createdAtB - createdAtA

        const fallbackA = a.sortTimestamp ?? 0
        const fallbackB = b.sortTimestamp ?? 0
        if (fallbackA !== fallbackB) return fallbackB - fallbackA

        return (originalOrder.get(a.id) ?? 0) - (originalOrder.get(b.id) ?? 0)
      })
  }, [transactions])

  const transactionCategoryOptions = useMemo(() => {
    const categoriesInData = new Set<string>()
    transactions.forEach((transaction) => {
      const categoryName = normalizeCategoryName(transaction.category)
      categoriesInData.add(categoryName)
    })

    const preferredOrder = Array.from(
      new Set(
        ALL_CATEGORIES.map((category) => category.label).filter((label) =>
          categoriesInData.has(label),
        ),
      ),
    )
    const dynamicCategories = Array.from(categoriesInData).filter(
      (category) => !preferredOrder.includes(category),
    )
    dynamicCategories.sort((a, b) => a.localeCompare(b, 'vi'))

    return [...preferredOrder, ...dynamicCategories]
  }, [transactions])

  useEffect(() => {
    if (
      transactionCategoryFilter !== 'all' &&
      !transactionCategoryOptions.includes(transactionCategoryFilter)
    ) {
      setTransactionCategoryFilter('all')
    }
  }, [transactionCategoryFilter, transactionCategoryOptions])

  const filteredTransactions = useMemo(() => {
    if (transactionCategoryFilter === 'all') return sortedTransactions
    return sortedTransactions.filter(
      (transaction) => normalizeCategoryName(transaction.category) === transactionCategoryFilter,
    )
  }, [sortedTransactions, transactionCategoryFilter])

  const expensesByCategoryMonth = useMemo(() => {
    const totals = new Map<string, number>()
    transactions.forEach((transaction) => {
      if (transaction.type !== 'expense') return
      const date = new Date(transaction.createdAt)
      const monthKey = toMonthKey(date)
      if (!monthKey) return
      const category = normalizeCategoryName(transaction.category)
      const key = `${monthKey}|${category}`
      totals.set(key, (totals.get(key) ?? 0) + transaction.amount)
    })
    return totals
  }, [transactions])

  const budgetsWithSpending = useMemo<BudgetProgress[]>(() => {
    return budgets
      .map((budget) => {
        const category = normalizeCategoryName(budget.category)
        const rawMonth = (budget.month || '').trim()
        let month = rawMonth || currentMonthKey
        if (month && currentMonthKey && compareMonthKeys(month, currentMonthKey) < 0) {
          month = currentMonthKey
        }
        const key = `${month}|${category}`
        const spent = expensesByCategoryMonth.get(key) ?? 0
        const limitAmount = Number(budget.limitAmount) || 0
        const hasLimit = limitAmount > 0
        const percent = hasLimit && limitAmount > 0 ? (spent / limitAmount) * 100 : 0
        let status: BudgetProgress['status'] = 'no-limit'
        if (hasLimit) {
          if (spent >= limitAmount) status = 'danger'
          else if (spent >= limitAmount * 0.8) status = 'warning'
          else status = 'ok'
        }
        const remaining = hasLimit ? Math.max(limitAmount - spent, 0) : 0
        const overspent = hasLimit ? Math.max(spent - limitAmount, 0) : 0
        return {
          ...budget,
          category,
          month,
          limitAmount,
          spent,
          percent: hasLimit ? percent : 0,
          status,
          remaining,
          overspent,
        }
      })
      .sort((a, b) => {
        if (a.month !== b.month) return b.month.localeCompare(a.month)
        return a.category.localeCompare(b.category, 'vi', { sensitivity: 'base' })
      })
  }, [budgets, currentMonthKey, expensesByCategoryMonth])

  const overspentBudgets = useMemo(
    () => budgetsWithSpending.filter((budget) => budget.status === 'danger'),
    [budgetsWithSpending],
  )

  const activeBudgetAlerts = useMemo(
    () => overspentBudgets.filter((budget) => !dismissedBudgetAlerts[budget.id]),
    [overspentBudgets, dismissedBudgetAlerts],
  )

  const expenseCategoryNames = useMemo(() => {
    const names = new Set<string>()
    EXPENSE_CATEGORIES.forEach((category) => names.add(category.label))
    transactions.forEach((transaction) => {
      if (transaction.type === 'expense' && transaction.category) {
        names.add(normalizeCategoryName(transaction.category))
      }
    })
    budgets.forEach((budget) => {
      if (budget.category) names.add(normalizeCategoryName(budget.category))
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }))
  }, [budgets, transactions])

  useEffect(() => {
    setDismissedBudgetAlerts((prev) => {
      let changed = false
      const next = { ...prev }
      budgetsWithSpending.forEach((budget) => {
        if (budget.status === 'danger') return
        if (next[budget.id]) {
          delete next[budget.id]
          changed = true
        }
      })
      return changed ? next : prev
    })
    setBudgetTaskError((prev) => {
      let changed = false
      const next = { ...prev }
      budgetsWithSpending.forEach((budget) => {
        if (budget.status === 'danger') return
        if (next[budget.id]) {
          delete next[budget.id]
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [budgetsWithSpending])

  const handleDepositToSource = async (s: MoneySource) => {
    if (!user) return
    const raw = sourceInputs[s.id] || ''
    const isBinance = s.key === 'Binance'
    let amount = 0
    let usdtAmount = 0

    if (isBinance) {
      usdtAmount = parseUsdtAmount(raw)
      if (usdtAmount <= 0) {
        setError('Số USDT nạp vào phải lớn hơn 0')
        return
      }
      if (!usdtVndRate) {
        setUsdtRateError('Chưa có tỷ giá USDT/VND. Vui lòng thử lại sau.')
        if (!usdtRateLoading) fetchUsdtRate()
        return
      }
      amount = Number((usdtAmount * usdtVndRate).toFixed(5))
    } else {
      amount = toNumber(raw)
      if (amount <= 0) {
        setError('Số tiền nạp vào phải lớn hơn 0')
        return
      }
    }

    setError(null)
    setUsdtRateError(null)
    setSourceSaving((prev) => ({ ...prev, [s.id]: true }))
    try {
      await saveTransaction(user.uid, {
        amount,
        type: 'income',
        category: 'Nạp tiền',
        note: isBinance
          ? `Nạp ${formatUsdtAmount(usdtAmount)} USDT vào ${s.name}${usdtVndRate ? ` (tỷ giá ${usdtVndRate.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VND)` : ''}`
          : `Nạp vào ${s.name}`,
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

  const handleTransferFromBinance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return
    const binance = sources.find((source) => source.key === 'Binance')
    if (!binance) {
      setTransferError('Chưa có nguồn Binance để rút.')
      return
    }
    if (!transferTarget) {
      setTransferError('Bạn cần chọn ngân hàng/ví nhận tiền.')
      return
    }
    const targetSource = selectedTransferTarget
    if (!targetSource) {
      setTransferError('Nguồn nhận không hợp lệ.')
      return
    }
    const amount = toNumber(transferAmount)
    if (amount <= 0) {
      setTransferError('Bạn cần nhập số tiền muốn rút.')
      return
    }
    const availableBalance = sourceBalances.get('Binance') ?? Number(binance.initialBalance || 0)
    if (amount > availableBalance) {
      setTransferError('Số dư Binance không đủ để rút số tiền này.')
      return
    }
    if (!usdtVndRate) {
      setTransferError('Chưa có tỷ giá USDT/VND. Vui lòng tải lại tỷ giá.')
      if (!usdtRateLoading) fetchUsdtRate()
      return
    }

    const usdtAmount = Number((amount / usdtVndRate).toFixed(5))
    const today = new Date().toISOString().slice(0, 10)
    setTransferSaving(true)
    setTransferError(null)
    try {
      const withdrawNote = `Rút ${amount.toLocaleString('vi-VN')} VND (≈ ${formatUsdtAmount(usdtAmount)} USDT) về ${targetSource.name}`
      const receiveNote = `Nhận ${amount.toLocaleString('vi-VN')} VND từ Binance (≈ ${formatUsdtAmount(usdtAmount)} USDT)`
      await saveTransaction(user.uid, {
        amount,
        type: 'expense',
        category: 'Rút tiền',
        note: withdrawNote,
        date: today,
        source: 'Binance',
      })
      await saveTransaction(user.uid, {
        amount,
        type: 'income',
        category: 'Nạp tiền',
        note: receiveNote,
        date: today,
        source: targetSource.key,
      })
      setTransferAmount('')
    } catch (error) {
      console.error('Transfer from Binance failed', error)
      setTransferError('Không thể thực hiện giao dịch rút tiền. Vui lòng thử lại.')
    } finally {
      setTransferSaving(false)
    }
  }

  const digitsOnly = (s: string) => s.replace(/\D/g, '')
  const formatAmount = (s: string) => {
    const d = digitsOnly(s)
    if (!d) return ''
    return Number(d).toLocaleString('vi-VN')
  }
  const toNumber = (s: string) => Number(digitsOnly(String(s)) || 0)

  const sanitizeUsdtInput = (value: string) => {
    const filtered = value.replace(/[^0-9.,]/g, '')
    let integerPart = ''
    let decimalPart = ''
    let hasDecimal = false
    for (const char of filtered) {
      if (char === '.' || char === ',') {
        hasDecimal = true
        continue
      }
      if (!hasDecimal) {
        integerPart += char
      } else if (decimalPart.length < 5) {
        decimalPart += char
      }
    }
    if (!integerPart && (hasDecimal || decimalPart)) integerPart = '0'
    if (hasDecimal) {
      if (!decimalPart) return `${integerPart || '0'}.`
      return `${integerPart || '0'}.${decimalPart}`
    }
    return integerPart
  }

  const normalizeUsdtInput = (value: string) => {
    const sanitized = sanitizeUsdtInput(value)
    if (!sanitized) return ''
    if (sanitized.endsWith('.')) return sanitized.slice(0, -1)
    return sanitized
  }

  const parseUsdtAmount = (value: string) => {
    const normalized = normalizeUsdtInput(value)
    if (!normalized) return 0
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const formatUsdtAmount = (value: number) => {
    if (!Number.isFinite(value)) return '0'
    return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 5 })
  }

  const formatSource = (s?: string) => {
    if (!s) return ''
    if (s === 'MoMo') return 'Ví điện tử MoMo'
    if (s === 'Vietinbank') return 'Ngân hàng Vietinbank'
    if (s === 'MBBank') return 'Ngân hàng MBBank'
    return s
  }

  const openBudgetModal = (budget?: BudgetProgress) => {
    if (budget) {
      setBudgetFormState({
        id: budget.id,
        category: budget.category,
        month: budget.month || getDefaultBudgetMonth(),
        limitAmount:
          budget.limitAmount > 0 ? budget.limitAmount.toLocaleString('vi-VN') : '',
      })
    } else {
      setBudgetFormState({
        id: null,
        category: '',
        month: getDefaultBudgetMonth(),
        limitAmount: '',
      })
    }
    setBudgetFormError(null)
    setBudgetModalOpen(true)
  }

  const closeBudgetModal = () => {
    setBudgetModalOpen(false)
    setBudgetFormError(null)
    setBudgetFormState((prev) => ({
      id: null,
      category: '',
      month: prev.month || getDefaultBudgetMonth(),
      limitAmount: '',
    }))
  }

  const handleBudgetFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return

    const categoryInput = budgetFormState.category.trim()
    if (!categoryInput) {
      setBudgetFormError('Bạn cần nhập danh mục chi tiêu.')
      return
    }

    const monthInput = budgetFormState.month.trim()
    if (!monthInput) {
      setBudgetFormError('Bạn cần chọn tháng áp dụng ngân sách.')
      return
    }

    const limitAmount = toNumber(budgetFormState.limitAmount)
    if (limitAmount <= 0) {
      setBudgetFormError('Hạn mức ngân sách phải lớn hơn 0 VND.')
      return
    }

    setBudgetSaving(true)
    setBudgetFormError(null)

    try {
      await saveBudget(user.uid, {
        id: budgetFormState.id ?? undefined,
        category: normalizeCategoryName(categoryInput),
        month: monthInput,
        limitAmount,
      })
      setBudgetModalOpen(false)
      setBudgetFormState({
        id: null,
        category: '',
        month: monthInput,
        limitAmount: '',
      })
    } catch (err) {
      const anyErr = err as { code?: string; message?: string }
      console.error('save budget failed:', anyErr?.code, anyErr?.message)
      if (anyErr?.code === 'permission-denied') {
        setBudgetFormError('Không có quyền lưu ngân sách. Vui lòng kiểm tra quyền truy cập.')
      } else if (anyErr?.code === 'unauthenticated') {
        setBudgetFormError('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.')
      } else {
        setBudgetFormError('Không thể lưu ngân sách. Vui lòng thử lại.')
      }
    } finally {
      setBudgetSaving(false)
    }
  }

  const handleDeleteBudget = async (id: string) => {
    if (!user) return
    const confirmed =
      typeof window === 'undefined' ? true : window.confirm('Bạn có chắc chắn muốn xóa ngân sách này?')
    if (!confirmed) return

    setBudgetFormError(null)
    setBudgetDeletingId(id)
    try {
      await deleteBudget(user.uid, id)
      setBudgetFormState((prev) => {
        if (prev.id !== id) return prev
        return {
          id: null,
          category: '',
          month: getDefaultBudgetMonth(),
          limitAmount: '',
        }
      })
      setBudgetModalOpen(false)
      setDismissedBudgetAlerts((prev) => {
        if (!prev[id]) return prev
        const next = { ...prev }
        delete next[id]
        return next
      })
      setBudgetTaskError((prev) => {
        if (!prev[id]) return prev
        const next = { ...prev }
        delete next[id]
        return next
      })
    } catch (err) {
      console.error('delete budget failed:', err)
      setBudgetFormError('Không thể xoá ngân sách này. Vui lòng thử lại.')
    } finally {
      setBudgetDeletingId(null)
    }
  }

  const dismissBudgetAlert = (id: string) => {
    setDismissedBudgetAlerts((prev) => ({ ...prev, [id]: true }))
    setBudgetTaskError((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleCreateBudgetTask = async (budget: BudgetProgress) => {
    if (!user) return
    setCreatingTaskForBudget(budget.id)
    setBudgetTaskError((prev) => ({ ...prev, [budget.id]: null }))
    try {
      const monthLabel = formatBudgetMonthLabel(budget.month)
      const title = `Rà soát chi tiêu danh mục ${budget.category} (${monthLabel})`
      const dueDate = getBudgetTaskDueDate(budget.month)
      await saveTask(user.uid, { title, dueDate })
      dismissBudgetAlert(budget.id)
    } catch (err) {
      console.error('create budget task failed:', err)
      setBudgetTaskError((prev) => ({
        ...prev,
        [budget.id]: 'Không thể tạo nhiệm vụ. Vui lòng thử lại.',
      }))
    } finally {
      setCreatingTaskForBudget(null)
    }
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
        if (previous.date) update.createdAt = combineDateWithCurrentTime(previous.date)
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
      source: t.source || '',
    })
    setEditingId(t.id)
    setShowForm(true)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setFormState(defaultFormState)
    setShowForm(false)
  }

  const openTransferModal = () => {
    setTransferError(null)
    setShowTransferModal(true)
    if ((!usdtVndRate || usdtRateError) && !usdtRateLoading) fetchUsdtRate()
  }

  const closeTransferModal = () => {
    setShowTransferModal(false)
    setTransferError(null)
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
          <button
            type="button"
            className="transfer-btn"
            title="Rút tiền từ Binance"
            aria-label="Rút tiền từ Binance"
            onClick={openTransferModal}
          >
            ⇄
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
              const isBinance = s.key === 'Binance'
              const rawInput = sourceInputs[s.id] ?? ''
              const usdtInputAmount = isBinance ? parseUsdtAmount(rawInput) : 0
              const convertedPreview =
                isBinance && usdtVndRate
                  ? Number((usdtInputAmount * usdtVndRate).toFixed(5))
                  : 0
              const formattedBalance = isBinance
                ? bal.toLocaleString('vi-VN', { maximumFractionDigits: 5 })
                : bal.toLocaleString('vi-VN')
              const disableDeposit = !!sourceSaving[s.id] || (isBinance && !usdtVndRate)
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
                      <strong className={bal >= 0 ? 'positive' : 'negative'}>{formattedBalance} VND</strong>
                      {isBinance && (
                        <span className="source-balance-hint">
                          {usdtVndRate
                            ? `Tỷ giá 1 USDT ≈ ${usdtVndRate.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VND`
                            : usdtRateLoading
                              ? 'Đang tải tỷ giá USDT/VND...'
                              : 'Chưa có tỷ giá USDT/VND'}
                        </span>
                      )}
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
                        inputMode="decimal"
                        autoFocus
                        className="source-deposit-input"
                        placeholder={isBinance ? 'Số USDT nạp' : 'Số tiền nạp'}
                        value={sourceInputs[s.id] ?? ''}
                        onChange={(e) =>
                          setSourceInputs((prev) => ({
                            ...prev,
                            [s.id]: isBinance
                              ? sanitizeUsdtInput(e.target.value || '')
                              : (e.target.value || '').replace(/[^\d.,\s]/g, ''),
                          }))
                        }
                        onBlur={(e) =>
                          setSourceInputs((prev) => ({
                            ...prev,
                            [s.id]: isBinance
                              ? normalizeUsdtInput(e.target.value || '')
                              : formatAmount(e.target.value || ''),
                          }))
                        }
                      />
                      <button type="submit" disabled={disableDeposit}>
                        {sourceSaving[s.id] ? 'Đang nạp...' : 'Nạp'}
                      </button>
                      {isBinance && (
                        <div className="source-deposit-meta">
                          <div className="source-rate-row">
                            <span>Tỷ giá:</span>
                            <strong>
                              {usdtVndRate
                                ? `1 USDT ≈ ${usdtVndRate.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VND`
                                : usdtRateLoading
                                  ? 'Đang tải...'
                                  : 'Chưa có dữ liệu'}
                            </strong>
                            <button
                              type="button"
                              className="link-button"
                              onClick={fetchUsdtRate}
                              disabled={usdtRateLoading}
                            >
                              {usdtRateLoading ? 'Đang cập nhật...' : 'Làm mới'}
                            </button>
                          </div>
                          {usdtRateUpdatedAt && (
                            <span className="source-rate-updated">
                              Cập nhật: {new Date(usdtRateUpdatedAt).toLocaleString('vi-VN')}
                            </span>
                          )}
                          {usdtRateError && <span className="source-rate-error">{usdtRateError}</span>}
                          {convertedPreview > 0 && (
                            <span className="source-rate-preview">
                              ≈ <strong>{convertedPreview.toLocaleString('vi-VN', { maximumFractionDigits: 5 })} VND</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {activeBudgetAlerts.length > 0 && (
        <div className="budget-toast-container" role="alert">
          {activeBudgetAlerts.map((budget) => (
            <div key={budget.id} className="budget-toast">
              <div className="budget-toast-content">
                <strong>Chi vượt ngân sách</strong>
                <p>
                  Danh mục <strong>{budget.category}</strong> ({formatBudgetMonthLabel(budget.month)}) đã chi{' '}
                  <strong>{budget.spent.toLocaleString('vi-VN')} VND</strong>, vượt hạn mức{' '}
                  <strong>{budget.overspent.toLocaleString('vi-VN')} VND</strong>.
                </p>
                {budgetTaskError[budget.id] && (
                  <span className="budget-toast-error">{budgetTaskError[budget.id]}</span>
                )}
              </div>
              <div className="budget-toast-actions">
                <button
                  type="button"
                  className="budget-toast-btn"
                  onClick={() => handleCreateBudgetTask(budget)}
                  disabled={creatingTaskForBudget === budget.id}
                >
                  {creatingTaskForBudget === budget.id ? 'Đang tạo nhiệm vụ...' : 'Tạo nhiệm vụ tiết chế'}
                </button>
                <button
                  type="button"
                  className="budget-toast-btn secondary"
                  onClick={() => openBudgetModal(budget)}
                >
                  Chỉnh sửa ngân sách
                </button>
                <button
                  type="button"
                  className="budget-toast-btn ghost"
                  onClick={() => dismissBudgetAlert(budget.id)}
                >
                  Bỏ qua
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card budgets-card">
        <div className="budgets-header">
          <div>
            <h3>Ngân sách theo danh mục</h3>
            <p>Theo dõi hạn mức chi tiêu theo từng tháng.</p>
          </div>
          <button type="button" className="budget-manage-btn" onClick={() => openBudgetModal()}>
            Thiết lập ngân sách
          </button>
        </div>
        {budgetsWithSpending.length === 0 ? (
          <p>
            Chưa có ngân sách nào. Nhấn “Thiết lập ngân sách” để đặt hạn mức cho các danh mục chi tiêu quan trọng.
          </p>
        ) : (
          <ul className="budget-list">
            {budgetsWithSpending.map((budget) => {
              const hasLimit = budget.limitAmount > 0
              const percentValue = hasLimit ? Math.min(Math.round(budget.percent), 999) : 0
              return (
                <li key={budget.id} className={`budget-item ${budget.status}`}>
                  <div className="budget-item-head">
                    <div className="budget-item-meta">
                      <span
                        className="swatch"
                        style={{ background: colorForCategory(budget.category) }}
                        aria-hidden
                      />
                      <div>
                        <strong>{budget.category}</strong>
                        <span className="budget-month">{formatBudgetMonthLabel(budget.month)}</span>
                      </div>
                    </div>
                    <div className="budget-item-actions">
                      <button type="button" className="link-button" onClick={() => openBudgetModal(budget)}>
                        Chỉnh sửa
                      </button>
                      <button
                        type="button"
                        className="link-button danger-link"
                        onClick={() => handleDeleteBudget(budget.id)}
                        disabled={budgetDeletingId === budget.id}
                      >
                        {budgetDeletingId === budget.id ? 'Đang xóa...' : 'Xóa'}
                      </button>
                    </div>
                  </div>
                  <div className="budget-values">
                    <span>
                      Đã chi: <strong>{budget.spent.toLocaleString('vi-VN')} VND</strong>
                    </span>
                    <span>
                      Hạn mức: <strong>{budget.limitAmount.toLocaleString('vi-VN')} VND</strong>
                    </span>
                  </div>
                  <div className="budget-progress" aria-hidden={!hasLimit}>
                    <div
                      className={`budget-progress-fill ${budget.status}`}
                      style={{ width: `${hasLimit ? Math.min(budget.percent, 100) : 0}%` }}
                    />
                  </div>
                  <div className="budget-status-row">
                    <span className={`budget-status ${budget.status}`}>
                      {budget.status === 'danger'
                        ? `Vượt ${budget.overspent.toLocaleString('vi-VN')} VND`
                        : budget.status === 'warning' || budget.status === 'ok'
                        ? `Còn ${budget.remaining.toLocaleString('vi-VN')} VND`
                        : 'Chưa thiết lập hạn mức.'}
                    </span>
                    {hasLimit && <span className="budget-percent">{percentValue}%</span>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {budgetModalOpen && (
        <div className="modal-overlay" onClick={closeBudgetModal}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <form className="form" onSubmit={handleBudgetFormSubmit}>
              <h3>{budgetFormState.id ? 'Cập nhật ngân sách' : 'Thiết lập ngân sách'}</h3>
              {budgetFormError && <p className="form-error">{budgetFormError}</p>}
              <label>
                Danh mục chi tiêu
                <input
                  type="text"
                  list="budget-category-options"
                  value={budgetFormState.category}
                  onChange={(event) =>
                    setBudgetFormState((prev) => ({ ...prev, category: event.target.value }))
                  }
                  placeholder="Ví dụ: Ăn uống, Đi lại..."
                  required
                />
                <datalist id="budget-category-options">
                  {expenseCategoryNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
              <label>
                Tháng áp dụng
                <input
                  type="month"
                  value={budgetFormState.month}
                  onChange={(event) =>
                    setBudgetFormState((prev) => ({ ...prev, month: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Hạn mức chi (VND)
                <input
                  type="text"
                  inputMode="numeric"
                  value={budgetFormState.limitAmount}
                  onChange={(event) =>
                    setBudgetFormState((prev) => ({
                      ...prev,
                      limitAmount: formatAmount(event.target.value),
                    }))
                  }
                  placeholder="Ví dụ: 5.000.000"
                  required
                />
              </label>
              <div className="form-actions">
                <button type="submit" disabled={budgetSaving}>
                  {budgetSaving
                    ? 'Đang lưu...'
                    : budgetFormState.id
                    ? 'Cập nhật ngân sách'
                    : 'Lưu ngân sách'}
                </button>
                <button type="button" onClick={closeBudgetModal} disabled={budgetSaving}>
                  Đóng
                </button>
              </div>
              
            </form>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="modal-overlay" onClick={closeTransferModal}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="transfer-card">
              <h3>Rút tiền từ Binance về ngân hàng</h3>
              {transferError && <p className="form-error">{transferError}</p>}
              {!sources.some((source) => source.key === 'Binance') ? (
                <p>Chưa có nguồn Binance. Vui lòng thêm Binance trong danh sách nguồn tiền.</p>
              ) : sources.filter((source) => source.key !== 'Binance').length === 0 ? (
                <p>Chưa có ngân hàng/ví đích để nhận tiền. Hãy thêm Vietinbank hoặc nguồn khác.</p>
              ) : (
                <form className="transfer-form" onSubmit={handleTransferFromBinance}>
                  <div className="transfer-sources">
                    <div className="transfer-source">
                      <div className="transfer-source-header">
                        <div className="transfer-source-logo">
                          <img src={LOGOS.Binance} alt="Binance" title="Binance" />
                        </div>
                        <div className="transfer-source-info">
                          <strong>Ví Binance</strong>
                          <span>Số dư hiện tại</span>
                          <span className="transfer-balance">
                            {(sourceBalances.get('Binance') ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 5 })} VND
                          </span>
                          {usdtVndRate && (
                            <span className="transfer-hint">
                              ≈ {((sourceBalances.get('Binance') ?? 0) / usdtVndRate).toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 5,
                              })}{' '}
                              USDT
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="transfer-arrow" aria-hidden>
                      →
                    </div>
                    <div className="transfer-source">
                      <div className="transfer-source-header">
                        <div className="transfer-source-logo">
                          {selectedTransferTarget ? (
                            (() => {
                              const key = selectedTransferTarget.key as keyof typeof LOGOS
                              const logoSrc = LOGOS[key]
                              if (!logoSrc)
                                return (
                                  <span className="transfer-logo-placeholder">
                                    {selectedTransferTarget.name.slice(0, 2).toUpperCase()}
                                  </span>
                                )
                              return (
                                <img src={logoSrc} alt={selectedTransferTarget.name} title={selectedTransferTarget.name} />
                              )
                            })()
                          ) : (
                            <span className="transfer-logo-placeholder">NH</span>
                          )}
                        </div>
                        <div className="transfer-source-info">
                          <label className="transfer-label">
                            Chọn ngân hàng nhận
                            <select value={transferTarget} onChange={(event) => setTransferTarget(event.target.value)}>
                              <option value="">-- Chọn --</option>
                              {sources
                                .filter((source) => source.key !== 'Binance')
                                .map((source) => (
                                  <option key={source.id} value={source.key}>
                                    {source.name}
                                  </option>
                                ))}
                            </select>
                          </label>
                          {selectedTransferTarget && (
                            <span className="transfer-balance">
                              Số dư: {selectedTransferTargetBalance.toLocaleString('vi-VN')} VND
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="transfer-inputs">
                    <label>
                      Số tiền muốn rút (VND)
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={transferAmount}
                        onChange={(event) => setTransferAmount(formatAmount(event.target.value))}
                      />
                    </label>
                  </div>
                  <div className="transfer-summary">
                    {usdtVndRate ? (
                      <span>
                        1 USDT ≈ {usdtVndRate.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VND
                        {transferAmount && (
                          <>
                            {' '}| Tương đương ≈
                            <strong>
                              {' '}
                              {(toNumber(transferAmount) / usdtVndRate).toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 5,
                              })}{' '}
                              USDT
                            </strong>
                          </>
                        )}
                      </span>
                    ) : (
                      <span>
                        Chưa có tỷ giá USDT/VND.
                        <button type="button" className="link-button" onClick={fetchUsdtRate} disabled={usdtRateLoading}>
                          {usdtRateLoading ? 'Đang cập nhật...' : 'Làm mới'}
                        </button>
                      </span>
                    )}
                  </div>
                  <div className="form-actions">
                    <button type="submit" disabled={transferSaving}>
                      {transferSaving ? 'Đang xử lý...' : 'Rút về ngân hàng'}
                    </button>
                    <button type="button" onClick={closeTransferModal} disabled={transferSaving}>
                      Đóng
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

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
        {/* Actions row spanning full width under charts */}
        <div className="chart-actions-row" style={{ gridColumn: '1 / -1' }}>
          <div className="chart-actions">
            <button type="button" className="icon-btn" title="Biểu đồ xu hướng chi tiêu" onClick={() => setAnalysisModal('trend')}>Biểu đồ xu hướng chi tiêu</button>
            <button type="button" className="icon-btn" title="So sánh chi tiêu" onClick={() => setAnalysisModal('compare')}>So sánh chi tiêu</button>
            <button type="button" className="icon-btn" title="Top danh mục chi tiêu" onClick={() => setAnalysisModal('top')}>Top danh mục chi tiêu</button>
            <button type="button" className="icon-btn" title="Báo cáo tổng quan định kỳ" onClick={() => setAnalysisModal('summary')}>Báo cáo tổng quan định kỳ</button>
          </div>
        </div>
      </div>

      {analysisModal && (
        <div className="modal-overlay" onClick={() => setAnalysisModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
                {analysisModal === 'trend' ? (
              <TrendAnalysisModal transactions={transactions} onClose={() => setAnalysisModal(null)} />
            ) : (
              <div className="form" style={{ gap: 16 }}>
                <h3>
                  {analysisModal === 'compare' && 'So sánh chi tiêu'}
                  {analysisModal === 'top' && 'Top danh mục chi tiêu'}
                  {analysisModal === 'summary' && 'Báo cáo tổng quan định kỳ'}
                </h3>
                <p style={{ margin: 0, color: '#94a3b8' }}>Nội dung sẽ được bổ sung chi tiết theo chức năng. Hiện tại là cửa sổ minh họa.</p>
                <div className="form-actions">
                  <button type="button" onClick={() => setAnalysisModal(null)}>Đóng</button>
                </div>
              </div>
              )}
          </div>
        </div>
      )}

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
        <div className="transaction-history-header">
          <h3>Lịch sử giao dịch</h3>
          <div className="transaction-filter">
            <label className="transaction-filter-field" htmlFor="transaction-category-filter">
              <div className="transaction-filter-select-wrapper">
                <span className="transaction-filter-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M4 5.5C4 5.22386 4.22386 5 4.5 5H19.5C19.7761 5 20 5.22386 20 5.5C20 5.63261 19.9473 5.75979 19.8536 5.85355L14.8536 10.8536C14.7598 10.9473 14.7071 11.0745 14.7071 11.2071V17.25L9.29289 19.9142C9.02698 20.0472 8.70203 19.972 8.53968 19.7325C8.487 19.6535 8.45868 19.561 8.45868 19.4661V11.2071C8.45868 11.0745 8.40598 10.9473 8.31223 10.8536L3.31223 5.85355C3.21848 5.75979 3.16577 5.63261 3.16577 5.5C3.16577 5.22386 3.38962 5 3.66577 5H4Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <select
                  id="transaction-category-filter"
                  value={transactionCategoryFilter}
                  onChange={(event) => setTransactionCategoryFilter(event.target.value)}
                >
                  <option value="all">Tất cả</option>
                  {transactionCategoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <span className="transaction-filter-caret" aria-hidden="true">▾</span>
              </div>
            </label>
            {transactionCategoryFilter !== 'all' && (
              <button
                type="button"
                className="transaction-filter-reset"
                onClick={() => setTransactionCategoryFilter('all')}
              >
                Xóa lọc
              </button>
            )}
          </div>
        </div>
        {sortedTransactions.length === 0 ? (
          <p>Chưa có giao dịch nào. Hãy thêm giao dịch đầu tiên của bạn.</p>
          ) : filteredTransactions.length === 0 ? (
          <p>Không có giao dịch nào trong danh mục này.</p>
        ) : (
          <ul>
            {filteredTransactions.map((transaction) => (
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
                  {transaction.source && (() => {
                    const key = transaction.source as keyof typeof LOGOS
                    const src = LOGOS[key]
                    if (!src) return null
                    return (
                      <img
                        className="source-logo"
                        src={src}
                        alt={formatSource(transaction.source)}
                        title={formatSource(transaction.source)}
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
