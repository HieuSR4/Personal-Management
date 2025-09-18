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
          <h2>Tổng quan</h2>
          <p>Tóm tắt nhanh các hoạt động gần đây của bạn.</p>
        </div>
      </div>

      <div className="summary-grid">
        <div className="card">
          <h3>Tài chính</h3>
          <p>Số dư hiện tại</p>
          <strong className={balance >= 0 ? 'positive' : 'negative'}>
            {balance.toLocaleString('vi-VN')} VND
          </strong>
          <div className="mini-stats">
            <span>Thu: {summary.income.toLocaleString('vi-VN')} VND</span>
            <span>Chi: {summary.expense.toLocaleString('vi-VN')} VND</span>
          </div>
        </div>
        <div className="card">
          <h3>Các việc cần làm</h3>
          <p>Bạn còn {pendingTasks.length} việc chưa hoàn thành.</p>
          <ul>
            {upcomingTasks.length === 0 ? (
              <li>Không có việc sắp đến hạn.</li>
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
          <h3>Ghi chú gần đây</h3>
          <ul>
            {latestNotes.length === 0 ? (
              <li>Chưa có ghi chú nào.</li>
            ) : (
              latestNotes.map((note) => (
                <li key={note.id}>
                  <strong>{note.title}</strong>
                  <span> - cập nhật {new Date(note.updatedAt).toLocaleString('vi-VN')}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  )
}

