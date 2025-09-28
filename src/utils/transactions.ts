import type { Transaction } from '../types'

const INTERNAL_TRANSFER_CATEGORY = 'Rút tiền'
const INTERNAL_TRANSFER_SOURCE_KEYS = new Set(['binance'])

export function normalizeCategoryName(value: string | undefined) {
  const normalized = (value ?? '').trim()
  return normalized || 'Không phân loại'
}

export function isInternalTransferExpense(transaction: Transaction) {
  if (transaction.type !== 'expense') return false
  const categoryName = normalizeCategoryName(transaction.category)
  if (categoryName !== INTERNAL_TRANSFER_CATEGORY) return false
  const sourceKey = transaction.source?.trim().toLowerCase()
  if (sourceKey && INTERNAL_TRANSFER_SOURCE_KEYS.has(sourceKey)) return true
  const note = transaction.note?.toLowerCase() ?? ''
  return note.includes('binance')
}