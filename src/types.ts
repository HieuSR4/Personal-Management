export type TransactionType = 'income' | 'expense'

export type Transaction = {
  id: string
  amount: number
  category: string
  type: TransactionType
  note?: string
  source?: string
  createdAt: string
  updatedAt?: string
}

export type MoneySource = {
  id: string
  key: string
  name: string
  initialBalance?: number
  createdAt: string
  updatedAt?: string
}

export type Task = {
  id: string
  title: string
  dueDate?: string
  completed: boolean
  createdAt: string
  updatedAt?: string
}

export type Note = {
  id: string
  title: string
  content: string
  updatedAt: string
}
