import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import * as api from '../lib/api'
import type { Task, TaskMap } from '../lib/types'
import { addDays, isoDate } from '../lib/constants'

export interface ClientMutationTrace {
  label: 'create' | 'toggle_done' | 'update' | 'delete' | 'move' | 'text'
  startedAt: number
}

type CreateTaskPayload = Parameters<typeof api.createTask>[0]

export interface CreateTaskInput extends CreateTaskPayload {
  clientTrace?: ClientMutationTrace
}

export interface UpdateTaskInput {
  id: string
  data: Parameters<typeof api.updateTask>[1]
  clientTrace?: ClientMutationTrace
}

export interface MoveTaskInput {
  id: string
  bucketKey: string
  position: number
  slot?: string | null
  clientTrace?: ClientMutationTrace
}

type TaskSnapshot = ReturnType<QueryClient['getQueriesData']>

const STALE_WEEK_KEY = ['tasks', 'week'] as const
const STALE_BUCKET_KEY = ['tasks', 'bucket'] as const

const latestTaskMutationToken = new Map<string, number>()
let mutationTokenSeq = 0

function beginTaskMutation(taskId: string): number {
  const token = ++mutationTokenSeq
  latestTaskMutationToken.set(taskId, token)
  return token
}

function isLatestTaskMutation(taskId: string, token: number): boolean {
  return latestTaskMutationToken.get(taskId) === token
}

function finishTaskMutation(taskId: string, token: number) {
  if (isLatestTaskMutation(taskId, token)) {
    latestTaskMutationToken.delete(taskId)
  }
}

function logClientLatency(trace: ClientMutationTrace | undefined, phase: 'optimistic' | 'success' | 'error') {
  if (!trace) return
  const elapsed = performance.now() - trace.startedAt
  console.info(`[perf][${trace.label}] ${phase}=${elapsed.toFixed(1)}ms`)
}

// Query key factories
export const taskKeys = {
  all: () => ['tasks'] as const,
  week: (weekStart: string, includeSubtasks = false) =>
    ['tasks', 'week', weekStart, includeSubtasks ? 'with-subtasks' : 'no-subtasks'] as const,
  bucket: (bucket: string, includeSubtasks = false) =>
    ['tasks', 'bucket', bucket, includeSubtasks ? 'with-subtasks' : 'no-subtasks'] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
  overdue: (before: string) => ['tasks', 'overdue', before] as const,
}

// Fetch tasks for a full week
export function useWeekTasks(weekStart: Date) {
  const from = isoDate(weekStart)
  const to = isoDate(addDays(weekStart, 6))
  return useQuery({
    queryKey: taskKeys.week(from, false),
    queryFn: async ({ signal }) => {
      const tasks = await api.fetchTasksForWeek(from, to, signal, { includeSubtasks: false })
      return groupByBucket(tasks)
    },
  })
}

// Fetch tasks for a special bucket (__inbox, __someday)
export function useBucketTasks(bucket: string) {
  return useQuery({
    queryKey: taskKeys.bucket(bucket, false),
    queryFn: ({ signal }) => api.fetchTasksByBucket(bucket, signal, { includeSubtasks: false }),
    select: (tasks) => [...tasks].sort((a, b) => a.position - b.position),
  })
}

// Fetch full task details with subtasks on demand
export function useTaskDetail(taskId: string | null) {
  return useQuery({
    queryKey: taskId ? taskKeys.detail(taskId) : taskKeys.detail('__none__'),
    queryFn: ({ signal }) => api.fetchTaskById(taskId!, signal),
    enabled: Boolean(taskId),
    staleTime: 30_000,
  })
}

export function useOverdueTasks(weekStart: Date) {
  const before = isoDate(weekStart)
  return useQuery({
    queryKey: taskKeys.overdue(before),
    queryFn: ({ signal }) => api.fetchOverdueTasks(before, signal),
    staleTime: 60_000,
  })
}

// Create a task
export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clientTrace: _clientTrace, ...data }: CreateTaskInput) => api.createTask(data),
    onMutate: async (newTaskParams) => {
      const snapshot = qc.getQueriesData({ queryKey: taskKeys.all() })
      const cancelPromise = qc.cancelQueries({ queryKey: taskKeys.all() })

      const tempId = `temp-${Date.now()}`
      const nowIso = new Date().toISOString()
      const tempTask: Task = {
        id: tempId,
        title: newTaskParams.title,
        done: false,
        bucketKey: newTaskParams.bucketKey,
        slot: (newTaskParams.slot as 'am' | 'pm' | undefined) ?? null,
        priority: null,
        recurring: null,
        tags: [],
        note: null,
        position: newTaskParams.position ?? 0,
        createdAt: nowIso,
        updatedAt: nowIso,
        subtasks: [],
      }

      addTaskToCaches(qc, tempTask)
      logClientLatency(newTaskParams.clientTrace, 'optimistic')

      await cancelPromise
      return { snapshot, tempId, clientTrace: newTaskParams.clientTrace }
    },
    onSuccess: (createdTask, _vars, ctx) => {
      if (!ctx?.tempId) return
      replaceTaskInCaches(qc, ctx.tempId, createdTask)
      logClientLatency(ctx.clientTrace, 'success')
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) restoreSnapshot(qc, ctx.snapshot)
      logClientLatency(ctx?.clientTrace, 'error')
    },
  })
}

// Update task fields optimistically (title, done, slot, priority, recurring, tags, note)
export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: UpdateTaskInput) => api.updateTask(id, data),
    onMutate: async ({ id, data, clientTrace }) => {
      const snapshot = qc.getQueriesData({ queryKey: taskKeys.all() })
      const cancelPromise = qc.cancelQueries({ queryKey: taskKeys.all() })
      const token = beginTaskMutation(id)

      const optimisticUpdatedAt = new Date().toISOString()
      patchTaskInCaches(qc, id, (task) => ({
        ...task,
        ...data,
        updatedAt: optimisticUpdatedAt,
      }))

      logClientLatency(clientTrace, 'optimistic')
      await cancelPromise
      return { snapshot, id, token, clientTrace }
    },
    onSuccess: (serverTask, _vars, ctx) => {
      if (!ctx) return
      if (!isLatestTaskMutation(ctx.id, ctx.token)) return
      upsertTaskInCaches(qc, serverTask)
      finishTaskMutation(ctx.id, ctx.token)
      logClientLatency(ctx.clientTrace, 'success')
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return
      if (!isLatestTaskMutation(ctx.id, ctx.token)) return
      restoreSnapshot(qc, ctx.snapshot)
      finishTaskMutation(ctx.id, ctx.token)
      logClientLatency(ctx.clientTrace, 'error')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks', 'overdue'] })
    },
  })
}

// Delete a task optimistically
export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onMutate: async (id) => {
      const snapshot = qc.getQueriesData({ queryKey: taskKeys.all() })
      const cancelPromise = qc.cancelQueries({ queryKey: taskKeys.all() })
      const token = beginTaskMutation(id)
      removeTaskFromCaches(qc, id)

      const overdueQueries = qc.getQueriesData<Task[]>({ queryKey: ['tasks', 'overdue'] })
      for (const [key, data] of overdueQueries) {
        if (!data) continue
        const filtered = data.filter(t => t.id !== id)
        if (filtered.length !== data.length) qc.setQueryData(key, filtered)
      }

      await cancelPromise
      return { snapshot, id, token }
    },
    onSuccess: (_result, _id, ctx) => {
      if (!ctx) return
      if (!isLatestTaskMutation(ctx.id, ctx.token)) return
      finishTaskMutation(ctx.id, ctx.token)
    },
    onError: (_err, _id, ctx) => {
      if (!ctx) return
      if (!isLatestTaskMutation(ctx.id, ctx.token)) return
      restoreSnapshot(qc, ctx.snapshot)
      finishTaskMutation(ctx.id, ctx.token)
    },
  })
}

// Move task between buckets/reorder with optimistic update
export function useMoveTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, bucketKey, position, slot }: MoveTaskInput) =>
      api.moveTask(id, { bucketKey, position, slot }),
    onMutate: async ({ id, bucketKey, position, slot, clientTrace }) => {
      const snapshot = qc.getQueriesData({ queryKey: taskKeys.all() })
      const cancelPromise = qc.cancelQueries({ queryKey: taskKeys.all() })
      const token = beginTaskMutation(id)

      const task = findTaskInCaches(qc, id)
      if (task) {
        applyOptimisticMoveToCaches(qc, task, bucketKey, position, slot)
      }

      // Remove otimisticamente da cache overdue (se a tarefa estava lá)
      const overdueQueries = qc.getQueriesData<Task[]>({ queryKey: ['tasks', 'overdue'] })
      for (const [key, data] of overdueQueries) {
        if (!data) continue
        const filtered = data.filter(t => t.id !== id)
        if (filtered.length !== data.length) qc.setQueryData(key, filtered)
      }

      logClientLatency(clientTrace, 'optimistic')
      await cancelPromise
      return { snapshot, id, token, clientTrace }
    },
    onSuccess: (serverTask, _vars, ctx) => {
      if (!ctx) return
      if (!isLatestTaskMutation(ctx.id, ctx.token)) return
      upsertTaskInCaches(qc, serverTask)
      qc.invalidateQueries({ queryKey: ['tasks', 'overdue'] })
      finishTaskMutation(ctx.id, ctx.token)
      logClientLatency(ctx.clientTrace, 'success')
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return
      if (!isLatestTaskMutation(ctx.id, ctx.token)) return
      restoreSnapshot(qc, ctx.snapshot)
      finishTaskMutation(ctx.id, ctx.token)
      logClientLatency(ctx.clientTrace, 'error')
    },
  })
}

function restoreSnapshot(qc: QueryClient, snapshot: TaskSnapshot) {
  for (const [key, data] of snapshot) {
    qc.setQueryData(key, data)
  }
}

function sortByPosition(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.position - b.position)
}

function reindex(tasks: Task[]): Task[] {
  return tasks.map((task, index) => (
    task.position === index
      ? task
      : { ...task, position: index }
  ))
}

function insertTaskAtPosition(tasks: Task[], task: Task, position: number): Task[] {
  const sortedWithoutTask = sortByPosition(tasks).filter((entry) => entry.id !== task.id)
  const clamped = Math.max(0, Math.min(position, sortedWithoutTask.length))
  const inserted = [
    ...sortedWithoutTask.slice(0, clamped),
    { ...task, position: clamped },
    ...sortedWithoutTask.slice(clamped),
  ]
  return reindex(inserted)
}

function findTaskInCaches(qc: QueryClient, taskId: string): Task | null {
  const weekQueries = qc.getQueriesData<TaskMap>({ queryKey: STALE_WEEK_KEY })
  for (const [, data] of weekQueries) {
    if (!data) continue
    for (const list of Object.values(data)) {
      const found = list.find((task) => task.id === taskId)
      if (found) return found
    }
  }

  const bucketQueries = qc.getQueriesData<Task[]>({ queryKey: STALE_BUCKET_KEY })
  for (const [, data] of bucketQueries) {
    if (!data) continue
    const found = data.find((task) => task.id === taskId)
    if (found) return found
  }

  const detail = qc.getQueryData<Task>(taskKeys.detail(taskId))
  return detail ?? null
}

function addTaskToCaches(qc: QueryClient, task: Task) {
  const weekQueries = qc.getQueriesData<TaskMap>({ queryKey: STALE_WEEK_KEY })
  for (const [key, data] of weekQueries) {
    if (!data) continue
    const weekStart = typeof key[2] === 'string' ? key[2] : null
    if (!weekStart || !bucketBelongsToWeek(weekStart, task.bucketKey)) continue

    const nextMap: TaskMap = { ...data }
    const current = nextMap[task.bucketKey] ?? []
    nextMap[task.bucketKey] = sortByPosition([...current, task])
    qc.setQueryData(key, nextMap)
  }

  const bucketQueries = qc.getQueriesData<Task[]>({ queryKey: STALE_BUCKET_KEY })
  for (const [key, data] of bucketQueries) {
    if (!data) continue
    if (key[2] !== task.bucketKey) continue
    qc.setQueryData(key, sortByPosition([...data, task]))
  }
}

function removeTaskFromCaches(qc: QueryClient, taskId: string) {
  const weekQueries = qc.getQueriesData<TaskMap>({ queryKey: STALE_WEEK_KEY })
  for (const [key, data] of weekQueries) {
    if (!data) continue
    let changed = false
    const nextMap: TaskMap = {}

    for (const [bucketKey, list] of Object.entries(data)) {
      const filtered = list.filter((task) => task.id !== taskId)
      if (filtered.length !== list.length) changed = true
      if (filtered.length > 0) {
        nextMap[bucketKey] = reindex(sortByPosition(filtered))
      }
    }

    if (changed) {
      qc.setQueryData(key, nextMap)
    }
  }

  const bucketQueries = qc.getQueriesData<Task[]>({ queryKey: STALE_BUCKET_KEY })
  for (const [key, data] of bucketQueries) {
    if (!data) continue
    const filtered = data.filter((task) => task.id !== taskId)
    if (filtered.length !== data.length) {
      qc.setQueryData(key, reindex(sortByPosition(filtered)))
    }
  }

  qc.removeQueries({ queryKey: taskKeys.detail(taskId), exact: true })
}

function patchTaskInCaches(qc: QueryClient, taskId: string, patcher: (task: Task) => Task) {
  const weekQueries = qc.getQueriesData<TaskMap>({ queryKey: STALE_WEEK_KEY })
  for (const [key, data] of weekQueries) {
    if (!data) continue
    let changed = false
    const nextMap: TaskMap = {}

    for (const [bucketKey, list] of Object.entries(data)) {
      let bucketChanged = false
      const nextList = list.map((task) => {
        if (task.id !== taskId) return task
        bucketChanged = true
        return patcher(task)
      })
      if (bucketChanged) {
        changed = true
        nextMap[bucketKey] = sortByPosition(nextList)
      } else {
        nextMap[bucketKey] = list
      }
    }

    if (changed) {
      qc.setQueryData(key, nextMap)
    }
  }

  const bucketQueries = qc.getQueriesData<Task[]>({ queryKey: STALE_BUCKET_KEY })
  for (const [key, data] of bucketQueries) {
    if (!data) continue
    let changed = false
    const nextList = data.map((task) => {
      if (task.id !== taskId) return task
      changed = true
      return patcher(task)
    })
    if (changed) {
      qc.setQueryData(key, sortByPosition(nextList))
    }
  }

  const detail = qc.getQueryData<Task>(taskKeys.detail(taskId))
  if (detail) {
    qc.setQueryData(taskKeys.detail(taskId), patcher(detail))
  }
}

function replaceTaskInCaches(qc: QueryClient, sourceTaskId: string, targetTask: Task) {
  removeTaskFromCaches(qc, sourceTaskId)
  upsertTaskInCaches(qc, targetTask)
}

function upsertTaskInCaches(qc: QueryClient, task: Task) {
  const weekQueries = qc.getQueriesData<TaskMap>({ queryKey: STALE_WEEK_KEY })
  for (const [key, data] of weekQueries) {
    if (!data) continue
    const weekStart = typeof key[2] === 'string' ? key[2] : null
    if (!weekStart) continue

    const shouldAppear = bucketBelongsToWeek(weekStart, task.bucketKey)
    let changed = false
    const nextMap: TaskMap = {}

    for (const [bucketKey, list] of Object.entries(data)) {
      const filtered = list.filter((entry) => entry.id !== task.id)
      if (filtered.length !== list.length) changed = true
      if (filtered.length > 0) {
        nextMap[bucketKey] = sortByPosition(filtered)
      }
    }

    if (shouldAppear) {
      const current = nextMap[task.bucketKey] ?? []
      nextMap[task.bucketKey] = sortByPosition([...current, task])
      changed = true
    }

    if (changed) {
      qc.setQueryData(key, nextMap)
    }
  }

  const bucketQueries = qc.getQueriesData<Task[]>({ queryKey: STALE_BUCKET_KEY })
  for (const [key, data] of bucketQueries) {
    if (!data) continue
    const queryBucket = typeof key[2] === 'string' ? key[2] : null
    if (!queryBucket) continue

    const filtered = data.filter((entry) => entry.id !== task.id)
    if (queryBucket === task.bucketKey) {
      qc.setQueryData(key, sortByPosition([...filtered, task]))
      continue
    }

    if (filtered.length !== data.length) {
      qc.setQueryData(key, sortByPosition(filtered))
    }
  }

  qc.setQueryData(taskKeys.detail(task.id), task)
}

function applyOptimisticMoveToCaches(
  qc: QueryClient,
  originalTask: Task,
  targetBucketKey: string,
  targetPosition: number,
  targetSlot?: string | null,
) {
  const movedTask: Task = {
    ...originalTask,
    bucketKey: targetBucketKey,
    position: targetPosition,
    slot: targetSlot !== undefined ? (targetSlot as 'am' | 'pm' | null) : originalTask.slot,
    updatedAt: new Date().toISOString(),
  }

  const weekQueries = qc.getQueriesData<TaskMap>({ queryKey: STALE_WEEK_KEY })
  for (const [key, data] of weekQueries) {
    if (!data) continue
    const weekStart = typeof key[2] === 'string' ? key[2] : null
    if (!weekStart) continue

    const shouldContainTarget = bucketBelongsToWeek(weekStart, targetBucketKey)
    let changed = false
    const nextMap: TaskMap = {}

    for (const [bucketKey, list] of Object.entries(data)) {
      const filtered = list.filter((entry) => entry.id !== originalTask.id)
      if (filtered.length !== list.length) changed = true
      if (filtered.length > 0) {
        nextMap[bucketKey] = reindex(sortByPosition(filtered))
      }
    }

    if (shouldContainTarget) {
      const currentTarget = nextMap[targetBucketKey] ?? []
      nextMap[targetBucketKey] = insertTaskAtPosition(currentTarget, movedTask, targetPosition)
      changed = true
    }

    if (changed) {
      qc.setQueryData(key, nextMap)
    }
  }

  const bucketQueries = qc.getQueriesData<Task[]>({ queryKey: STALE_BUCKET_KEY })
  for (const [key, data] of bucketQueries) {
    if (!data) continue
    const queryBucket = typeof key[2] === 'string' ? key[2] : null
    if (!queryBucket) continue

    if (queryBucket === targetBucketKey) {
      qc.setQueryData(key, insertTaskAtPosition(data, movedTask, targetPosition))
      continue
    }

    const filtered = data.filter((entry) => entry.id !== originalTask.id)
    if (filtered.length !== data.length) {
      qc.setQueryData(key, reindex(sortByPosition(filtered)))
    }
  }

  qc.setQueryData(taskKeys.detail(originalTask.id), movedTask)
}

// Group tasks array into { [bucketKey]: Task[] } sorted by position
function groupByBucket(tasks: Task[]): TaskMap {
  const map: TaskMap = {}
  for (const task of tasks) {
    if (!map[task.bucketKey]) map[task.bucketKey] = []
    map[task.bucketKey].push(task)
  }
  for (const key of Object.keys(map)) {
    map[key] = sortByPosition(map[key])
  }
  return map
}

function bucketBelongsToWeek(weekStart: string, bucketKey: string): boolean {
  if (bucketKey === `weeklist-${weekStart}`) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bucketKey)) return false

  const end = isoDate(addDays(new Date(`${weekStart}T00:00:00`), 6))
  return bucketKey >= weekStart && bucketKey <= end
}
