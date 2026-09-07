import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { createNote, updateNote } from '../api/notes'
import type { Note } from '../types'

interface Props {
  note: Note | null // null = 新建，否则为编辑已有笔记
  onClose: () => void
  onSaved: () => void
}

export function NoteEditor({ note, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [tagsInput, setTagsInput] = useState(note?.tags.map((t) => t.name).join(', ') ?? '')
  const [done, setDone] = useState(note?.done ?? false)
  const [pinned, setPinned] = useState(note?.pinned ?? false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setSubmitting(true)
    try {
      // 中英文逗号都认，自动去掉空标签
      const tags = tagsInput
        .split(/[，,]/)
        .map((t) => t.trim())
        .filter(Boolean)

      const body = {
        title: title.trim(),
        content: content.trim() || null,
        done,
        pinned,
        tags,
      }

      if (note) {
        await updateNote(note.id, body)
      } else {
        await createNote(body)
      }
      onSaved()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        if (err.details) {
          const map: Record<string, string> = {}
          for (const d of err.details) map[d.field] = d.message
          setFieldErrors(map)
        }
      } else {
        setError('网络异常，请稍后重试')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

  return (
    // 点击遮罩关闭；弹窗本体阻止事件冒泡，避免点表单误关
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-slate-800">{note ? '编辑笔记' : '新建笔记'}</h2>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">标题 *</label>
            <input
              required
              maxLength={200}
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="要做什么？"
            />
            {fieldErrors.title && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.title}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">内容</label>
            <textarea
              rows={5}
              maxLength={10000}
              className={`${inputClass} resize-y`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="详细内容（可选）"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">标签</label>
            <input
              className={inputClass}
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="用逗号分隔，如：工作, 重要"
            />
          </div>

          <div className="flex gap-6 text-sm text-slate-700">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={done}
                onChange={(e) => setDone(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              标记为完成
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
              置顶
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? '保存中…' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
