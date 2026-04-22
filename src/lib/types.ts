export interface Subtask {
  id: string
  taskId: string
  title: string
  done: boolean
  position: number
}

export interface Task {
  id: string
  title: string
  done: boolean
  bucketKey: string
  slot: 'am' | 'pm' | 'eve' | null
  priority: 'high' | 'med' | 'low' | null
  recurring: 'daily' | 'weekly' | 'monthly' | null
  tags: string[]
  note: string | null
  position: number
  createdAt: string
  updatedAt: string
  subtasks: Subtask[]
}

export interface Tag {
  id: string
  name: string
  color: string
  task_count: number
}

export type View = 'week' | 'inbox' | 'tags' | 'settings'
export type Variant = 'quiet' | 'columns'
export type Slot = 'am' | 'pm' | 'eve'
export type Priority = 'high' | 'med' | 'low'
export type Recurring = 'daily' | 'weekly' | 'monthly'

// Tasks grouped by bucket key
export type TaskMap = Record<string, Task[]>

export type { SlotPrefs } from './slot-utils'
