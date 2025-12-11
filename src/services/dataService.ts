import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Note, Task, Transaction, MoneySource, Budget, InvestmentTrade } from '../types'

type Unsubscribe = () => void

type FirestoreItem = { id: string; [key: string]: unknown }

type FirestoreCallback<T extends FirestoreItem> = (items: T[]) => void

function collectionPath(
  userId: string,
  key: 'transactions' | 'tasks' | 'notes' | 'sources' | 'budgets' | 'investmentTrades',
) {
  if (!db) throw new Error('Firebase is not initialized')
  return collection(db, 'users', userId, key)
}

function toISODate(value: unknown) {
  if (!value) return new Date().toISOString()
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'toDate' in (value as Record<string, unknown>)) {
    const date = (value as { toDate: () => Date }).toDate()
    return date.toISOString()
  }

  return new Date().toISOString()
}

function parseTimestamp(value?: string) {
  if (!value) return 0
  const time = Date.parse(value)
  return Number.isNaN(time) ? 0 : time
}

export function subscribeToTransactions(userId: string, callback: FirestoreCallback<Transaction>): Unsubscribe {
  const q = query(collectionPath(userId, 'transactions'), orderBy('createdAt', 'desc'))
  const arrivalTimes = new Map<string, number>()
  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now()
      const initialLoad = arrivalTimes.size === 0
      const seenIds = new Set<string>()

      const items: Transaction[] = snapshot.docs.map((snap, index) => {
        const data = snap.data()
        const createdAt = toISODate(data.createdAt)
        const updatedAt = data.updatedAt ? toISODate(data.updatedAt) : undefined

        if (!arrivalTimes.has(snap.id)) {
          const offset = initialLoad ? -index : snapshot.docs.length - index
          arrivalTimes.set(snap.id, now + offset)
        }
        const arrivalTime = arrivalTimes.get(snap.id) ?? now

        const sortTimestamp = Math.max(parseTimestamp(createdAt), parseTimestamp(updatedAt), arrivalTime)

        seenIds.add(snap.id)

        return {
          id: snap.id,
          amount: Number(data.amount) || 0,
          category: String(data.category ?? 'General'),
          type: (data.type === 'income' ? 'income' : 'expense') as Transaction['type'],
          note: data.note ? String(data.note) : undefined,
          source: data.source ? String(data.source) : undefined,
          createdAt,
          updatedAt,
          sortTimestamp,
        }
      })

      if (!initialLoad) {
        arrivalTimes.forEach((_, key) => {
          if (!seenIds.has(key)) arrivalTimes.delete(key)
        })
      }
      callback(items)
    },
    (error) => {
      const anyErr = error as { code?: string; message?: string }
      console.warn('subscribeToTransactions error:', anyErr?.code, anyErr?.message)
    },
  )
}

export function subscribeToInvestmentTrades(
  userId: string,
  callback: FirestoreCallback<InvestmentTrade>,
): Unsubscribe {
  const q = query(collectionPath(userId, 'investmentTrades'), orderBy('createdAt', 'desc'))
  const arrivalTimes = new Map<string, number>()
  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now()
      const initialLoad = arrivalTimes.size === 0
      const seenIds = new Set<string>()

      const items = snapshot.docs.map((snap, index) => {
        const data = snap.data() as Record<string, unknown>
        const createdAt = toISODate(data.createdAt)
        const updatedAt = data.updatedAt ? toISODate(data.updatedAt) : undefined

        if (!arrivalTimes.has(snap.id)) {
          const offset = initialLoad ? -index : snapshot.docs.length - index
          arrivalTimes.set(snap.id, now + offset)
        }
        const arrivalTime = arrivalTimes.get(snap.id) ?? now
        const sortTimestamp = Math.max(parseTimestamp(createdAt), parseTimestamp(updatedAt), arrivalTime)

        seenIds.add(snap.id)

        return {
          id: snap.id,
          asset: data.asset ? String(data.asset) : undefined,
          quantity: Number(data.quantity) || 0,
          price: Number(data.price) || 0,
          fee: data.fee !== undefined ? Number(data.fee) || 0 : undefined,
          note: data.note ? String(data.note) : undefined,
          createdAt,
          updatedAt,
          sortTimestamp,
        }
      })

      if (!initialLoad) {
        arrivalTimes.forEach((_, key) => {
          if (!seenIds.has(key)) arrivalTimes.delete(key)
        })
      }

      callback(items)
    },
    (error) => {
      const anyErr = error as { code?: string; message?: string }
      console.warn('subscribeToInvestmentTrades error:', anyErr?.code, anyErr?.message)
    },
  )
}

export function subscribeToSources(userId: string, callback: FirestoreCallback<MoneySource>): Unsubscribe {
  const q = query(collectionPath(userId, 'sources'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snapshot) => {
      const items: MoneySource[] = snapshot.docs.map((snap) => {
        const data = snap.data() as Record<string, unknown>
        return {
          id: snap.id,
          key: String(data.key ?? ''),
          name: String(data.name ?? ''),
          initialBalance: data.initialBalance !== undefined ? Number(data.initialBalance) : undefined,
          createdAt: toISODate(data.createdAt),
          updatedAt: data.updatedAt ? toISODate(data.updatedAt) : undefined,
        }
      })
      callback(items)
    },
    (error) => {
      const anyErr = error as { code?: string; message?: string }
      console.warn('subscribeToSources error:', anyErr?.code, anyErr?.message)
    },
  )
}

export function subscribeToBudgets(userId: string, callback: FirestoreCallback<Budget>): Unsubscribe {
  const q = query(collectionPath(userId, 'budgets'), orderBy('month', 'desc'))
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Budget[] = snapshot.docs.map((snap) => {
        const data = snap.data()
        return {
          id: snap.id,
          category: String(data.category ?? 'Không phân loại'),
          month: String(data.month ?? ''),
          limitAmount: Number(data.limitAmount) || 0,
          createdAt: toISODate(data.createdAt),
          updatedAt: data.updatedAt ? toISODate(data.updatedAt) : undefined,
        }
      })
      callback(items)
    },
    (error) => {
      const anyErr = error as { code?: string; message?: string }
      console.warn('subscribeToBudgets error:', anyErr?.code, anyErr?.message)
    },
  )
}

export function subscribeToTasks(userId: string, callback: FirestoreCallback<Task>): Unsubscribe {
  const q = query(collectionPath(userId, 'tasks'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Task[] = snapshot.docs.map((snap) => {
        const data = snap.data()
        return {
          id: snap.id,
          title: String(data.title ?? ''),
          completed: Boolean(data.completed),
          dueDate: data.dueDate ? String(data.dueDate) : undefined,
          createdAt: toISODate(data.createdAt),
          updatedAt: data.updatedAt ? toISODate(data.updatedAt) : undefined,
        }
      })
      callback(items)
    },
    (error) => {
      const anyErr = error as { code?: string; message?: string }
      console.warn('subscribeToTasks error:', anyErr?.code, anyErr?.message)
    },
  )
}

export function subscribeToNotes(userId: string, callback: FirestoreCallback<Note>): Unsubscribe {
  const q = query(collectionPath(userId, 'notes'), orderBy('updatedAt', 'desc'))
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Note[] = snapshot.docs.map((snap) => {
        const data = snap.data()
        return {
          id: snap.id,
          title: String(data.title ?? ''),
          content: String(data.content ?? ''),
          updatedAt: toISODate(data.updatedAt),
        }
      })
      callback(items)
    },
    (error) => {
      const anyErr = error as { code?: string; message?: string }
      console.warn('subscribeToNotes error:', anyErr?.code, anyErr?.message)
    },
  )
}

export function addTransaction(userId: string, transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) {
  return addDoc(collectionPath(userId, 'transactions'), {
    ...transaction,
    amount: Number(transaction.amount),
    createdAt: serverTimestamp(),
  })
}

export function updateTransaction(userId: string, id: string, update: Partial<Omit<Transaction, 'id'>>) {
  return updateDoc(doc(collectionPath(userId, 'transactions'), id), {
    ...update,
    amount: update.amount !== undefined ? Number(update.amount) : undefined,
    updatedAt: serverTimestamp(),
  })
}

export function deleteTransaction(userId: string, id: string) {
  return deleteDoc(doc(collectionPath(userId, 'transactions'), id))
}

export function addInvestmentTrade(
  userId: string,
  trade: Omit<InvestmentTrade, 'id' | 'updatedAt' | 'sortTimestamp'>,
) {
  const payload: Record<string, unknown> = {
    quantity: Number(trade.quantity) || 0,
    price: Number(trade.price) || 0,
    fee: trade.fee !== undefined ? Number(trade.fee) || 0 : 0,
    createdAt: trade.createdAt ?? serverTimestamp(),
  }
  if (trade.asset) payload.asset = trade.asset
  if (trade.note) payload.note = trade.note
  return addDoc(collectionPath(userId, 'investmentTrades'), payload)
}

export function updateInvestmentTrade(
  userId: string,
  id: string,
  update: Partial<Omit<InvestmentTrade, 'id'>>,
) {
  return updateDoc(doc(collectionPath(userId, 'investmentTrades'), id), {
    ...update,
    quantity: update.quantity !== undefined ? Number(update.quantity) : undefined,
    price: update.price !== undefined ? Number(update.price) : undefined,
    fee: update.fee !== undefined ? Number(update.fee) : undefined,
    updatedAt: serverTimestamp(),
  })
}

export function deleteInvestmentTrade(userId: string, id: string) {
  return deleteDoc(doc(collectionPath(userId, 'investmentTrades'), id))
}

export function addSource(
  userId: string,
  source: Omit<MoneySource, 'id' | 'createdAt' | 'updatedAt'>,
) {
  return addDoc(collectionPath(userId, 'sources'), {
    ...source,
    initialBalance:
      (source.initialBalance !== undefined && !Number.isNaN(Number(source.initialBalance)))
        ? Number(source.initialBalance)
        : 0,
    createdAt: serverTimestamp(),
  })
}

export function updateSource(
  userId: string,
  id: string,
  update: Partial<Omit<MoneySource, 'id'>>,
) {
  return updateDoc(doc(collectionPath(userId, 'sources'), id), {
    ...update,
    initialBalance:
      update.initialBalance !== undefined
        ? Number(update.initialBalance)
        : undefined,
    updatedAt: serverTimestamp(),
  })
}

export function deleteSource(userId: string, id: string) {
  return deleteDoc(doc(collectionPath(userId, 'sources'), id))
}

export async function saveBudget(
  userId: string,
  budget: { id?: string; category: string; month: string; limitAmount: number },
) {
  const category = (budget.category || '').trim() || 'Không phân loại'
  const month = (budget.month || '').trim()
  const limitAmount = Number(budget.limitAmount) || 0

  const payload = {
    category,
    month,
    limitAmount,
  }

  if (budget.id) {
    await updateDoc(doc(collectionPath(userId, 'budgets'), budget.id), {
      ...payload,
      updatedAt: serverTimestamp(),
    })
    return budget.id
  }

  const ref = await addDoc(collectionPath(userId, 'budgets'), {
    ...payload,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export function deleteBudget(userId: string, id: string) {
  return deleteDoc(doc(collectionPath(userId, 'budgets'), id))
}

export function addTask(userId: string, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
  return addDoc(collectionPath(userId, 'tasks'), {
    ...task,
    createdAt: serverTimestamp(),
  })
}

export function updateTask(userId: string, id: string, update: Partial<Omit<Task, 'id'>>) {
  return updateDoc(doc(collectionPath(userId, 'tasks'), id), {
    ...update,
    updatedAt: serverTimestamp(),
  })
}

export function deleteTask(userId: string, id: string) {
  return deleteDoc(doc(collectionPath(userId, 'tasks'), id))
}

export function addNote(userId: string, note: Omit<Note, 'id' | 'updatedAt'>) {
  return addDoc(collectionPath(userId, 'notes'), {
    ...note,
    updatedAt: serverTimestamp(),
  })
}

export function updateNote(userId: string, id: string, update: Partial<Omit<Note, 'id'>>) {
  return updateDoc(doc(collectionPath(userId, 'notes'), id), {
    ...update,
    updatedAt: serverTimestamp(),
  })
}

export function deleteNote(userId: string, id: string) {
  return deleteDoc(doc(collectionPath(userId, 'notes'), id))
}
