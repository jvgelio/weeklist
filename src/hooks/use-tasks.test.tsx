// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '../lib/api'
import type { Task, TaskMap } from '../lib/types'
import { taskKeys, useCreateTask } from './use-tasks'

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>()
  return { ...actual, createTask: vi.fn() }
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function existingTask(): Task {
  return {
    id: 'existing-task',
    title: 'Existing task',
    done: false,
    bucketKey: '2026-06-23',
    slot: 'am',
    priority: null,
    recurring: null,
    tags: [],
    note: null,
    position: 0,
    createdAt: '2026-06-20T10:00:00.000Z',
    updatedAt: '2026-06-20T10:00:00.000Z',
    subtasks: [],
  }
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const weekKey = taskKeys.week('2026-06-22')
  queryClient.setQueryData<TaskMap>(weekKey, {
    '2026-06-23': [existingTask()],
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { queryClient, weekKey, wrapper }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useCreateTask', () => {
  it('preserves submitted metadata in the optimistic week cache', async () => {
    const request = deferred<Task>()
    vi.mocked(api.createTask).mockReturnValueOnce(request.promise)
    const { queryClient, weekKey, wrapper } = setup()
    const { result } = renderHook(() => useCreateTask(), { wrapper })

    const mutation = result.current.mutateAsync({
      title: 'Preparing meeting',
      bucketKey: '2026-06-23',
      slot: 'pm',
      position: 1,
      priority: 'high',
      recurring: 'weekly',
      tags: ['work'],
    })

    await waitFor(() => {
      const optimistic = queryClient
        .getQueryData<TaskMap>(weekKey)?.['2026-06-23']
        .find((task) => task.id.startsWith('temp-'))

      expect(optimistic).toMatchObject({
        title: 'Preparing meeting',
        bucketKey: '2026-06-23',
        slot: 'pm',
        priority: 'high',
        recurring: 'weekly',
        tags: ['work'],
      })
    })

    request.resolve({
      ...existingTask(),
      id: 'created-task',
      title: 'Preparing meeting',
      slot: 'pm',
      priority: 'high',
      recurring: 'weekly',
      tags: ['work'],
      position: 1,
    })
    await mutation
  })

  it('restores the exact week cache when creation fails', async () => {
    const request = deferred<Task>()
    vi.mocked(api.createTask).mockReturnValueOnce(request.promise)
    const { queryClient, weekKey, wrapper } = setup()
    const beforeMutation = queryClient.getQueryData<TaskMap>(weekKey)
    const { result } = renderHook(() => useCreateTask(), { wrapper })

    const mutation = result.current.mutateAsync({
      title: 'Preparing meeting',
      bucketKey: '2026-06-23',
      slot: 'pm',
      position: 1,
      priority: 'high',
      recurring: 'weekly',
      tags: ['work'],
    })

    await waitFor(() => {
      expect(queryClient.getQueryData<TaskMap>(weekKey)?.['2026-06-23']).toHaveLength(2)
    })

    const failure = new Error('Create failed')
    await act(async () => {
      request.reject(failure)
      await expect(mutation).rejects.toBe(failure)
    })

    expect(queryClient.getQueryData<TaskMap>(weekKey)).toEqual(beforeMutation)
  })
})
