import { useEffect, useMemo, useState } from 'react'
import { subscribeToNotes, subscribeToTasks, subscribeToTransactions } from '../services/dataService'
import type { Note, Task, Transaction } from '../types'
import { useAuth } from '../contexts/AuthContext'

export function DashboardPage() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    if (!user) return
    const unsubTransactions = subscribeToTransactions(user.uid, setTransactions)
    const unsubTasks = subscribeToTasks(user.uid, setTasks)
    const unsubNotes = subscribeToNotes(user.uid, setNotes)

    return () => {
      unsubTransactions?.()
      unsubTasks?.()
      unsubNotes?.()
    }
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
  const pendingTasks = tasks.filter((task) => !task.completed)
  const upcomingTasks = pendingTasks
    .filter((task) => task.dueDate)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 3)

  const latestNotes = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3)
  return (
    <section className="page dashboard-page">
      <div className="page-header">
        <div>
          <h2>Tong quan</h2>
          <p>Tom tat nhanh cac hoat dong gan day cua ban.</p>
        </div>
      </div>

      <div className="summary-grid">
        <div className="card">
          <h3>Tai chinh</h3>
          <p>So du hien tai</p>
          <strong className={balance >= 0 ? 'positive' : 'negative'}>
            {balance.toLocaleString('vi-VN')} VND
          </strong>
          <div className="mini-stats">
            <span>Thu: {summary.income.toLocaleString('vi-VN')} VND</span>
            <span>Chi: {summary.expense.toLocaleString('vi-VN')} VND</span>
          </div>
        </div>
        <div className="card">
          <h3>Viec can lam</h3>
          <p>Ban con {pendingTasks.length} viec chua hoan thanh.</p>
          <ul>
            {upcomingTasks.length === 0 ? (
              <li>Khong co viec sap den han.</li>
            ) : (
              upcomingTasks.map((task) => (
                <li key={task.id}>
                  <strong>{task.title}</strong>
                  {task.dueDate && (
                    <span> - han {new Date(task.dueDate).toLocaleDateString('vi-VN')}</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="card">
          <h3>Ghi chu gan day</h3>
          <ul>
            {latestNotes.length === 0 ? (
              <li>Chua co ghi chu nao.</li>
            ) : (
              latestNotes.map((note) => (
                <li key={note.id}>
                  <strong>{note.title}</strong>
                  <span> - cap nhat {new Date(note.updatedAt).toLocaleString('vi-VN')}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  )
}

