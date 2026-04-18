import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../lib/api'
import type { Task, TaskMap } from '../lib/types'
import { addDays, isoDate } from '../lib/constants'

// Query key factories
export const taskKeys = {
  week: (weekStart: string) => ['tasks', 'week', weekStart] as const,
  bucket: (bucket: string) => ['tasks', 'bucket', bucket] as const,
}

// Fetch tasks for a full week (Mon–Sun or Mon–Sat)
export function useWeekTasks(weekStart: Date) {
  const from = isoDate(weekStart)
  const to = isoDate(addDays(weekStart, 6))
  return useQuery({
    queryKey: taskKeys.week(from),
    queryFn: () => api.fetchTasksForWeek(from, to),
    select: (tasks) => groupByBucket(tasks),
  })
}

// Fetch tasks for a special bucket (__inbox, __someday)
export function useBucketTasks(bucket: string) {
  return useQuery({
    queryKey: taskKeys.bucket(bucket),
    queryFn: () => api.fetchTasksByBucket(bucket),
    select: (tasks) => tasks.sort((a, b) => a.position - b.position),
  })
}

// Create a task
export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

// Update task fields (title, done, slot, priority, recurring, tags, note)
export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateTask>[1] }) =>
      api.updateTask(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

// Delete a task
export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

// Move a task between buckets or reorder — OPTIMISTIC UPDATE
export function useMoveTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, bucketKey, position }: { id: string; bucketKey: string; position: number }) =>
      api.moveTask(id, { bucketKey, position }),

    onMutate: async ({ id, bucketKey, position }) => {
      // Cancel in-flight queries to prevent overwriting optimistic update
      await qc.cancelQueries({ queryKey: ['tasks'] })

      // Snapshot all task query data for rollback
      const snapshot = qc.getQueriesData<Task[] | TaskMap>({ queryKey: ['tasks'] })

      // Apply optimistic update to all relevant cached queries
      qc.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) => {
        if (!old || !Array.isArray(old)) return old
        const task = old.find(t => t.id === id)
        if (!task) return old
        // Remove from old position, re-insert at new position in new bucket
        const without = old.filter(t => t.id !== id)
        const updated: Task = { ...task, bucketKey, position }
        return [...without, updated]
      })

      return { snapshot }
    },

    onError: (_err, _vars, ctx) => {
      // Rollback all cached queries to snapshot
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) {
          qc.setQueryData(key, data)
        }
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// Helper: group tasks array into { [bucketKey]: Task[] } sorted by position
function groupByBucket(tasks: Task[]): TaskMap {
  const map: TaskMap = {}
  for (const task of tasks) {
    if (!map[task.bucketKey]) map[task.bucketKey] = []
    map[task.bucketKey].push(task)
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => a.position - b.position)
  }
  return map
}
