import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { TransactionType } from '../types'
import { combineDateWithCurrentTime } from '../utils/date.ts'

type Collections = 'transactions' | 'tasks' | 'notes'

function getUserCollection(userId: string, key: Collections) {
  if (!db) throw Object.assign(new Error('Firebase is not initialized'), { code: 'unavailable' })
  return collection(db, 'users', userId, key)
}

export async function saveTransaction(
  userId: string,
  input: {
    amount: number | string
    category?: string
    type: TransactionType
    note?: string
    date?: string // yyyy-mm-dd
    source?: string
  },
) {
  const payload: Record<string, unknown> = {
    amount: Number(input.amount),
    type: input.type,
  }
  // Optional fields: only include when present (Firestore disallows undefined)
  const category = (input.category || 'Khong phan loai').trim()
  if (category) payload.category = category
  const note = input.note?.trim()
  if (note) payload.note = note
  const source = input.source?.trim()
  if (source) payload.source = source
  if (input.date) {
    payload.createdAt = combineDateWithCurrentTime(input.date)
  } else {
    payload.createdAt = serverTimestamp()
  }

  const ref = await addDoc(getUserCollection(userId, 'transactions'), payload)
  return ref.id
}

export async function saveTask(
  userId: string,
  input: { title: string; dueDate?: string; completed?: boolean },
) {
  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    completed: Boolean(input.completed ?? false),
    createdAt: serverTimestamp(),
  }
  if (input.dueDate) payload.dueDate = input.dueDate

  const ref = await addDoc(getUserCollection(userId, 'tasks'), payload)
  return ref.id
}

export async function saveNote(userId: string, input: { title: string; content: string }) {
  const payload = {
    title: input.title.trim(),
    content: input.content.trim(),
    updatedAt: serverTimestamp(),
  }
  const ref = await addDoc(getUserCollection(userId, 'notes'), payload)
  return ref.id
}
