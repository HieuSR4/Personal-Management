import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { deleteTask, subscribeToTasks, updateTask } from '../services/dataService'
import { saveTask } from '../services/saveService'
import type { Task } from '../types'
import { useAuth } from '../contexts/AuthContext'

const defaultTask = {
  title: '',
  dueDate: '',
}

export function TasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [formState, setFormState] = useState(defaultTask)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    return subscribeToTasks(user.uid, setTasks)
  }, [user])
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !formState.title.trim()) {
      setError('Ban can nhap tieu de cong viec.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await saveTask(user.uid, {
        title: formState.title.trim(),
        dueDate: formState.dueDate || undefined,
        completed: false,
      })
      setFormState(defaultTask)
    } catch (err) {
      console.error(err)
      setError('Khong the luu cong viec. Vui long thu lai.')
    } finally {
      setSaving(false)
    }
  }

  const toggleTask = async (task: Task) => {
    if (!user) return
    try {
      await updateTask(user.uid, task.id, { completed: !task.completed })
    } catch (err) {
      console.error(err)
      setError('Khong the cap nhat cong viec.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    try {
      await deleteTask(user.uid, id)
    } catch (err) {
      console.error(err)
      setError('Khong the xoa cong viec.')
    }
  }
  return (
    <section className="page tasks-page">
      <div className="page-header">
        <div>
          <h2>Danh sach viec can lam</h2>
          <p>Tao va quan ly cac cong viec hang ngay cua ban.</p>
        </div>
      </div>

      <form className="card form" onSubmit={handleSubmit}>
        <h3>Them cong viec</h3>
        {error && <p className="form-error">{error}</p>}
        <label>
          Tieu de
          <input
            type="text"
            value={formState.title}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Vi du: Thanh toan tien dien"
            required
          />
        </label>
        <label>
          Han hoan thanh
          <input
            type="date"
            value={formState.dueDate}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, dueDate: event.target.value }))
            }
          />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? 'Dang luu...' : 'Them cong viec'}
        </button>
      </form>
      <div className="card list">
        <h3>Cong viec</h3>
        {tasks.length === 0 ? (
          <p>Ban chua co cong viec nao. Hay tao viec moi de bat dau.</p>
        ) : (
          <ul>
            {tasks.map((task) => (
              <li key={task.id} className={task.completed ? 'item completed' : 'item'}>
                <div>
                  <label>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task)}
                    />
                    <div className="task-info">
                      <strong>{task.title}</strong>
                      {task.dueDate && (
                        <time dateTime={task.dueDate}>
                          Han: {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                        </time>
                      )}
                    </div>
                  </label>
                </div>
                <div className="item-actions">
                  <button type="button" onClick={() => handleDelete(task.id)}>
                    Xoa
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

