import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api/client'
import * as notesApi from '../api/notes'
import type { Note } from '../types'
import { NoteCard } from '../components/NoteCard'
import { NoteEditor } from '../components/NoteEditor'

type DoneFilter = 'all' | 'active' | 'done'

const FILTERS: { key: DoneFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '未完成' },
  { key: 'done', label: '已完成' },
]

export function NotesPage() {
  const { user, logout } = useAuth()

  const [notes, setNotes] = useState<Note[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [doneFilter, setDoneFilter] = useState<DoneFilter>('all')
  const [tag, setTag] = useState<string | null>(null)
  const [search, setSearch] = useState('') // 输入框的实时值
  const [query, setQuery] = useState('') // 防抖后真正用于请求的值
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 编辑器状态：null = 关闭；note 为 null 表示新建
  const [editing, setEditing] = useState<{ note: Note | null } | null>(null)

  // 请求序号：快速切换筛选时只认最后一次请求的结果，
  // 防止先发出的旧响应晚到、把新数据覆盖掉（竞态问题）
  const reqId = useRef(0)

  // 搜索防抖：停止输入 300ms 后才真正发起搜索，避免每敲一个字刷一次列表
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // silent = true 时不转加载态：用于增删改之后的静默刷新，列表不会闪一下
  const load = useCallback(
    async (silent = false) => {
      const id = ++reqId.current
      if (!silent) setLoading(true)
      setError(null)
      try {
        const res = await notesApi.fetchNotes({
          page,
          done: doneFilter === 'all' ? undefined : doneFilter === 'done',
          tag: tag ?? undefined,
          q: query || undefined,
        })
        if (id !== reqId.current) return // 已有更新的请求，丢弃这份过期响应
        setNotes(res.data)
        setTotal(res.total)
        setTotalPages(res.totalPages)
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          logout() // 连换发都失败了：登录态作废，回登录页
          return
        }
        if (id === reqId.current) setError(err instanceof Error ? err.message : '加载失败')
      } finally {
        if (id === reqId.current && !silent) setLoading(false)
      }
    },
    [page, doneFilter, tag, query, logout],
  )

  useEffect(() => {
    load()
  }, [load])

  function switchFilter(f: DoneFilter) {
    setDoneFilter(f)
    setPage(1)
  }

  function switchTag(t: string) {
    setTag(tag === t ? null : t) // 再点一次同一个标签 = 取消筛选
    setPage(1)
  }

  // 勾选完成：先立刻改界面（乐观更新，零延迟），请求完成后再静默刷新拿到权威数据
  async function handleToggleDone(note: Note) {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, done: !n.done } : n)))
    try {
      await notesApi.updateNote(note.id, { done: !note.done })
      await load(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
      await load(true) // 回滚到服务器的真实状态
    }
  }

  async function handleTogglePinned(note: Note) {
    try {
      await notesApi.updateNote(note.id, { pinned: !note.pinned })
      await load(true) // 置顶会改变排序，必须重取列表
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    }
  }

  async function handleDelete(note: Note) {
    if (!window.confirm(`确定删除「${note.title}」吗？此操作不可恢复。`)) return
    try {
      await notesApi.deleteNote(note.id)
      await load(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  const hasFilter = query !== '' || tag !== null || doneFilter !== 'all'

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 顶栏 */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <h1 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <span>📝</span>待办笔记
          </h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">{user?.name ?? user?.email}</span>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 transition hover:bg-slate-50"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        {/* 工具栏：搜索 + 状态筛选 + 标签筛选 */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题或内容…"
            className="min-w-48 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => switchFilter(f.key)}
                className={`rounded-md px-3 py-1.5 transition ${
                  doneFilter === f.key
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {tag && (
            <button
              onClick={() => switchTag(tag)}
              className="rounded-full bg-indigo-100 px-3 py-1.5 text-sm text-indigo-700 transition hover:bg-indigo-200"
            >
              # {tag} ✕
            </button>
          )}
        </div>

        {/* 统计 + 新建 */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">共 {total} 条</p>
          <button
            onClick={() => setEditing({ note: null })}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            + 新建笔记
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        {/* 列表 */}
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">加载中…</div>
        ) : notes.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            {hasFilter ? '没有符合条件的笔记' : '还没有笔记，点击右上角「新建笔记」开始吧'}
          </div>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id}>
                <NoteCard
                  note={note}
                  onToggleDone={handleToggleDone}
                  onTogglePinned={handleTogglePinned}
                  onEdit={(n) => setEditing({ note: n })}
                  onDelete={handleDelete}
                  onTagClick={switchTag}
                />
              </li>
            ))}
          </ul>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-sm">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一页
            </button>
            <span className="text-slate-500">
              第 {page} / {totalPages} 页
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        )}
      </main>

      {/* 新建 / 编辑弹窗 */}
      {editing && (
        <NoteEditor
          note={editing.note}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await load(true)
          }}
        />
      )}
    </div>
  )
}
