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
  it('notifies optimistic insertion only after the temporary task is cached', async () => {
    const request = deferred<Task>()
    vi.mocked(api.createTask).mockReturnValueOnce(request.promise)
    const { queryClient, weekKey, wrapper } = setup()
    const { result } = renderHook(() => useCreateTask(), { wrapper })
    const onOptimistic = vi.fn(() => {
      expect(queryClient.getQueryData<TaskMap>(weekKey)?.['2026-06-23']).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: expect.stringMatching(/^temp-/), title: 'Optimistic task' }),
        ])
      )
    })

    const mutation = result.current.mutateAsync({
      title: 'Optimistic task',
      bucketKey: '2026-06-23',
      slot: 'am',
      position: 1,
      onOptimistic,
    })

    await waitFor(() => expect(onOptimistic).toHaveBeenCalledTimes(1))
    expect(api.createTask).toHaveBeenCalledWith(expect.not.objectContaining({ onOptimistic }))

    request.resolve({ ...existingTask(), id: 'created-task', title: 'Optimistic task', position: 1 })
    await mutation
  })

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

  it('keeps the optimistic task after cancelling an in-flight week query', async () => {
    const request = deferred<Task>()
    vi.mocked(api.createTask).mockReturnValueOnce(request.promise)
    const { queryClient, weekKey, wrapper } = setup()
    const inFlightQuery = queryClient.fetchQuery({
      queryKey: weekKey,
      queryFn: ({ signal }) => new Promise<TaskMap>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      }),
    })
    const lifecycle: string[] = []
    const cancelQueries = queryClient.cancelQueries.bind(queryClient)
    vi.spyOn(queryClient, 'cancelQueries').mockImplementation(async (filters, options) => {
      lifecycle.push('cancel-start')
      await cancelQueries(filters, options)
      lifecycle.push('cancel-end')
    })
    const getQueriesData = queryClient.getQueriesData.bind(queryClient)
    vi.spyOn(queryClient, 'getQueriesData').mockImplementation((filters) => {
      lifecycle.push('snapshot-or-cache-read')
      return getQueriesData(filters)
    })
    const { result } = renderHook(() => useCreateTask(), { wrapper })

    await waitFor(() => {
      expect(queryClient.getQueryState(weekKey)?.fetchStatus).toBe('fetching')
    })

    const mutation = result.current.mutateAsync({
      title: 'Survives cancellation',
      bucketKey: '2026-06-23',
      slot: 'pm',
      position: 1,
    })

    await waitFor(() => {
      expect(queryClient.getQueryData<TaskMap>(weekKey)?.['2026-06-23'])
        .toEqual(expect.arrayContaining([
          expect.objectContaining({ title: 'Survives cancellation' }),
        ]))
    })
    expect(lifecycle.slice(0, 3)).toEqual([
      'cancel-start',
      'cancel-end',
      'snapshot-or-cache-read',
    ])

    request.resolve({
      ...existingTask(),
      id: 'created-after-cancellation',
      title: 'Survives cancellation',
      slot: 'pm',
      position: 1,
    })
    await mutation
    await inFlightQuery
  })

  it('removes only the failed optimistic task when creations overlap', async () => {
    const firstRequest = deferred<Task>()
    const secondRequest = deferred<Task>()
    vi.mocked(api.createTask)
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise)
    const { queryClient, weekKey, wrapper } = setup()
    const { result } = renderHook(() => useCreateTask(), { wrapper })

    const firstMutation = result.current.mutateAsync({
      title: 'First pending task',
      bucketKey: '2026-06-23',
      slot: 'am',
      position: 1,
    })
    await waitFor(() => {
      expect(queryClient.getQueryData<TaskMap>(weekKey)?.['2026-06-23'])
        .toEqual(expect.arrayContaining([
          expect.objectContaining({ title: 'First pending task' }),
        ]))
    })

    const secondMutation = result.current.mutateAsync({
      title: 'Second successful task',
      bucketKey: '2026-06-23',
      slot: 'pm',
      position: 2,
    })
    await waitFor(() => {
      expect(queryClient.getQueryData<TaskMap>(weekKey)?.['2026-06-23']).toHaveLength(3)
    })

    secondRequest.resolve({
      ...existingTask(),
      id: 'second-created-task',
      title: 'Second successful task',
      slot: 'pm',
      position: 2,
    })
    await secondMutation

    const failure = new Error('First create failed')
    await act(async () => {
      firstRequest.reject(failure)
      await expect(firstMutation).rejects.toBe(failure)
    })

    const finalTasks = queryClient.getQueryData<TaskMap>(weekKey)?.['2026-06-23']
    expect(finalTasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'existing-task' }),
      expect.objectContaining({ id: 'second-created-task', title: 'Second successful task' }),
    ]))
    expect(finalTasks).toHaveLength(2)
    expect(finalTasks?.some((task) => task.title === 'First pending task')).toBe(false)
  })
})
