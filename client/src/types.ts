// 与后端 API 响应结构一一对应的类型定义：
// 后端改了字段，这里的类型会在编译期提醒我们前端哪里没跟上

export interface User {
  id: number
  email: string
  name: string | null
}

export interface Tag {
  id: number
  name: string
}

export interface Note {
  id: number
  title: string
  content: string | null
  done: boolean
  pinned: boolean
  tags: Tag[]
  createdAt: string
  updatedAt: string
}

export interface NoteListResponse {
  data: Note[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}
