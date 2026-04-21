import type { Task, Tag } from './types'

const BASE = '/api'

interface FetchTasksOptions {
  includeSubtasks?: boolean
}

type TaskResponse = Omit<Task, 'subtasks'> & { subtasks?: Task['subtasks'] }

function normalizeTask(task: TaskResponse): Task {
  return {
    ...task,
    subtasks: task.subtasks ?? [],
  }
}

export async function fetchTasksForWeek(
  from: string,
  to: string,
  signal?: AbortSignal,
  opts?: FetchTasksOptions,
): Promise<Task[]> {
  const params = new URLSearchParams({ from, to })
  if (opts?.includeSubtasks) params.set('includeSubtasks', 'true')

  const res = await fetch(`${BASE}/tasks?${params.toString()}`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`)
  const tasks = (await res.json()) as TaskResponse[]
  return tasks.map(normalizeTask)
}

export async function fetchTasksByBucket(
  bucket: string,
  signal?: AbortSignal,
  opts?: FetchTasksOptions,
): Promise<Task[]> {
  const params = new URLSearchParams({ bucket })
  if (opts?.includeSubtasks) params.set('includeSubtasks', 'true')

  const res = await fetch(`${BASE}/tasks?${params.toString()}`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`)
  const tasks = (await res.json()) as TaskResponse[]
  return tasks.map(normalizeTask)
}

export async function fetchTaskById(id: string, signal?: AbortSignal): Promise<Task> {
  const res = await fetch(`${BASE}/tasks/${id}`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch task: ${res.status}`)
  return normalizeTask((await res.json()) as TaskResponse)
}

export async function createTask(data: {
  title: string
  bucketKey: string
  slot?: string
  position: number
  priority?: string | null
  tags?: string[]
}): Promise<Task> {
  const res = await fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to create task: ${res.status}`)
  return normalizeTask((await res.json()) as TaskResponse)
}

export async function updateTask(
  id: string,
  data: Partial<Pick<Task, 'title' | 'done' | 'slot' | 'priority' | 'recurring' | 'tags' | 'note'>>
): Promise<Task> {
  const res = await fetch(`${BASE}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to update task: ${res.status}`)
  return normalizeTask((await res.json()) as TaskResponse)
}

export async function moveTask(
  id: string,
  data: { bucketKey: string; position: number; slot?: string | null }
): Promise<Task> {
  const res = await fetch(`${BASE}/tasks/${id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to move task: ${res.status}`)
  return normalizeTask((await res.json()) as TaskResponse)
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${BASE}/tasks/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete task: ${res.status}`)
}

export async function fetchTags(signal?: AbortSignal): Promise<Tag[]> {
  const res = await fetch(`${BASE}/tags`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch tags: ${res.status}`)
  return res.json()
}

export async function createTag(data: { name: string; color: string }): Promise<Tag> {
  const res = await fetch(`${BASE}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to create tag: ${res.status}`)
  return res.json()
}

export async function updateTag(
  id: string,
  data: { name?: string; color?: string }
): Promise<Tag> {
  const res = await fetch(`${BASE}/tags/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to update tag: ${res.status}`)
  return res.json()
}

export async function deleteTag(id: string): Promise<void> {
  const res = await fetch(`${BASE}/tags/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete tag: ${res.status}`)
}
