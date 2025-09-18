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
import type { Note, Task, Transaction, MoneySource } from '../types'

type Unsubscribe = () => void

type FirestoreItem = { id: string; [key: string]: unknown }

type FirestoreCallback<T extends FirestoreItem> = (items: T[]) => void

function collectionPath(userId: string, key: 'transactions' | 'tasks' | 'notes' | 'sources') {
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

export function subscribeToTransactions(userId: string, callback: FirestoreCallback<Transaction>): Unsubscribe {
  const q = query(collectionPath(userId, 'transactions'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Transaction[] = snapshot.docs.map((snap) => {
        const data = snap.data()
      return {
        id: snap.id,
        amount: Number(data.amount) || 0,
        category: String(data.category ?? 'General'),
        type: (data.type === 'income' ? 'income' : 'expense') as Transaction['type'],
        note: data.note ? String(data.note) : undefined,
        source: data.source ? String(data.source) : undefined,
        createdAt: toISODate(data.createdAt),
        updatedAt: data.updatedAt ? toISODate(data.updatedAt) : undefined,
      }
    })
      callback(items)
    },
    (error) => {
      const anyErr = error as { code?: string; message?: string }
      console.warn('subscribeToTransactions error:', anyErr?.code, anyErr?.message)
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
