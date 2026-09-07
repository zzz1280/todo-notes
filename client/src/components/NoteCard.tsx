import type { Note } from '../types'
import { formatTime } from '../lib/format'

interface Props {
  note: Note
  onToggleDone: (note: Note) => void
  onTogglePinned: (note: Note) => void
  onEdit: (note: Note) => void
  onDelete: (note: Note) => void
  onTagClick: (tag: string) => void
}

export function NoteCard({
  note,
  onToggleDone,
  onTogglePinned,
  onEdit,
  onDelete,
  onTagClick,
}: Props) {
  return (
    <div
      className={`group rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md ${
        note.done ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* 完成勾选：圆形按钮，完成时实心带对勾 */}
        <button
          onClick={() => onToggleDone(note)}
          title={note.done ? '标记为未完成' : '标记为已完成'}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
            note.done
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-300 hover:border-emerald-500'
          }`}
        >
          {note.done && <span className="text-xs leading-none">✓</span>}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {note.pinned && (
              <span title="已置顶" className="text-sm">
                📌
              </span>
            )}
            <h3
              className={`truncate font-medium text-slate-800 ${
                note.done ? 'text-slate-400 line-through' : ''
              }`}
            >
              {note.title}
            </h3>
          </div>

          {note.content && (
            <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-slate-500">
              {note.content}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {note.tags.map((t) => (
              <button
                key={t.id}
                onClick={() => onTagClick(t.name)}
                title="点击按此标签筛选"
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 transition hover:bg-indigo-100 hover:text-indigo-700"
              >
                # {t.name}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-400">{formatTime(note.updatedAt)}</span>
          </div>
        </div>

        {/* 操作按钮：桌面端悬停浮现，触屏始终可见 */}
        <div className="flex shrink-0 gap-1 transition md:opacity-0 md:group-hover:opacity-100">
          <button
            onClick={() => onTogglePinned(note)}
            title={note.pinned ? '取消置顶' : '置顶'}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-amber-500"
          >
            {note.pinned ? '📌' : '📍'}
          </button>
          <button
            onClick={() => onEdit(note)}
            title="编辑"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(note)}
            title="删除"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-500"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}
