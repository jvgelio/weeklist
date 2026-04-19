import type { Task } from './types'

const BASE = '/api'

export async function fetchTasksForWeek(from: string, to: string): Promise<Task[]> {
  const res = await fetch(`${BASE}/tasks?from=${from}&to=${to}`)
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`)
  return res.json()
}

export async function fetchTasksByBucket(bucket: string): Promise<Task[]> {
  const res = await fetch(`${BASE}/tasks?bucket=${encodeURIComponent(bucket)}`)
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`)
  return res.json()
}

export async function createTask(data: {
  title: string
  bucketKey: string
  slot?: string
  position: number
}): Promise<Task> {
  const res = await fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to create task: ${res.status}`)
  return res.json()
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
  return res.json()
}

export async function moveTask(
  id: string,
  data: { bucketKey: string; position: number }
): Promise<Task> {
  const res = await fetch(`${BASE}/tasks/${id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to move task: ${res.status}`)
  return res.json()
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${BASE}/tasks/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete task: ${res.status}`)
}
