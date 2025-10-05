import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { deleteNote, subscribeToNotes, updateNote } from '../services/dataService'
import { saveNote } from '../services/saveService'
import type { Note } from '../types'
import { useAuth } from '../contexts/AuthContext'

const defaultNote = {
  title: '',
  content: '',
}

type NoteDraft = {
  title: string
  content: string
}

export function NotesPage() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [formState, setFormState] = useState(defaultNote)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<NoteDraft>(defaultNote)

  useEffect(() => {
    if (!user) return
    return subscribeToNotes(user.uid, setNotes)
  }, [user])
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user || !formState.title.trim()) {
      setError('Ban can nhap tieu de ghi chu.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await saveNote(user.uid, {
        title: formState.title.trim(),
        content: formState.content.trim(),
      })
      setFormState(defaultNote)
    } catch (err) {
      console.error(err)
      setError('Khong the luu ghi chu. Vui long thu lai.')
    } finally {
      setSaving(false)
    }
  }

  const startEditing = (note: Note) => {
    setEditing(note.id)
    setDraft({ title: note.title, content: note.content })
  }

  const cancelEditing = () => {
    setEditing(null)
    setDraft(defaultNote)
  }

  const saveEditing = async (note: Note) => {
    if (!user) return
    try {
      await updateNote(user.uid, note.id, {
        title: draft.title,
        content: draft.content,
      })
      cancelEditing()
    } catch (err) {
      console.error(err)
      setError('Khong the cap nhat ghi chu.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    try {
      await deleteNote(user.uid, id)
    } catch (err) {
      console.error(err)
      setError('Khong the xoa ghi chu.')
    }
  }
  return (
    <section className="page notes-page">
      <div className="page-header">
        <div>
          <h2>Ghi chú cá nhân</h2>
          <p>Lưu trữ những ghi chú quan trọng cho bạn.</p>
        </div>
      </div>

      <form className="card form" onSubmit={handleSubmit}>
        <h3>Tạo ghi chú</h3>
        {error && <p className="form-error">{error}</p>}
        <label>
          Tiêu đề
          <input
            type="text"
            value={formState.title}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Ví dụ: Ý tưởng dự án"
            required
          />
        </label>
        <label>
          Nội dung
          <textarea
            value={formState.content}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, content: event.target.value }))
            }
            rows={4}
            placeholder="Ghi chú của bạn..."
          />
        </label>
        <button type="submit" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Tạo ghi chú'}
        </button>
      </form>

      <div className="card list notes-list">
        <h3>Ghi chú của bạn</h3>
        {notes.length === 0 ? (
          <p>Bạn chưa tạo ghi chú nào.</p>
        ) : (
          <ul>
            {notes.map((note) => {
              const isEditing = editing === note.id
              return (
                <li key={note.id} className="note-item">
                  {isEditing ? (
                    <div className="note-edit">
                      <input
                        type="text"
                        value={draft.title}
                        onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                      />
                      <textarea
                        value={draft.content}
                        onChange={(event) =>
                          setDraft((prev) => ({ ...prev, content: event.target.value }))
                        }
                        rows={4}
                      />
                      <div className="note-actions">
                        <button type="button" onClick={() => saveEditing(note)}>
                          Lưu
                        </button>
                        <button type="button" onClick={cancelEditing}>
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="note-content">
                      <div className="note-header">
                        <strong>{note.title}</strong>
                        <time dateTime={note.updatedAt}>
                          Cập nhật: {new Date(note.updatedAt).toLocaleString('vi-VN')}
                        </time>
                      </div>
                      <p>{note.content || 'Chưa có nội dung'}</p>
                      <div className="note-actions">
                        <button type="button" onClick={() => startEditing(note)}>
                          Sửa
                        </button>
                        <button type="button" onClick={() => handleDelete(note.id)}>
                          Xóa
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

