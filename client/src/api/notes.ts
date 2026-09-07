import { api } from './client'
import type { Note, NoteListResponse } from '../types'

export interface NoteInput {
  title: string
  content?: string | null
  done?: boolean
  pinned?: boolean
  tags?: string[]
}

export interface NoteFilters {
  page?: number
  done?: boolean
  tag?: string
  q?: string
}

export function fetchNotes(filters: NoteFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page !== undefined) params.set('page', String(filters.page))
  if (filters.done !== undefined) params.set('done', String(filters.done))
  if (filters.tag !== undefined) params.set('tag', filters.tag)
  if (filters.q !== undefined) params.set('q', filters.q)
  const qs = params.toString()
  return api<NoteListResponse>(`/notes${qs ? `?${qs}` : ''}`)
}

export function createNote(input: NoteInput) {
  return api<{ note: Note }>('/notes', { method: 'POST', body: input })
}

export function updateNote(id: number, input: Partial<NoteInput>) {
  return api<{ note: Note }>(`/notes/${id}`, { method: 'PATCH', body: input })
}

export function deleteNote(id: number) {
  return api<null>(`/notes/${id}`, { method: 'DELETE' })
}
