// @vitest-environment jsdom

import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '../lib/api'
import type { Task } from '../lib/types'
import App, { resolveContextualTaskPosition } from './app'

vi.mock('../hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

vi.mock('../hooks/use-tags', () => ({
  useTags: () => ({ data: [] }),
  useCreateTag: () => ({ mutate: vi.fn() }),
  useUpdateTag: () => ({ mutate: vi.fn() }),
  useDeleteTag: () => ({ mutate: vi.fn() }),
}))

vi.mock('../hooks/use-tasks', () => ({
  useAuth: () => ({
    data: {
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        avatarUrl: '',
        slotAm: true,
        slotPm: true,
        slotEve: false,
        darkMode: false,
        showWeekend: true,
        dimPastDays: false,
      },
    },
    isLoading: false,
  }),
  useWeekTasks: () => ({ data: {} }),
  useBucketTasks: () => ({ data: [] }),
  useTaskDetail: () => ({ data: undefined }),
  useOverdueTasks: () => ({ data: [] }),
  useTaskOccupancy: () => ({ data: {} }),
  useCreateTask: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useUpdateTask: () => ({ mutate: vi.fn() }),
  useDeleteTask: () => ({ mutate: vi.fn() }),
  useMoveTask: () => ({ mutate: vi.fn() }),
  useUpdateDisplayPrefs: () => ({ mutate: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('resolveContextualTaskPosition', () => {
  it('appends after tasks fetched for an unloaded bucket', async () => {
    const fetchTasks = vi.spyOn(api, 'fetchTasksByBucket').mockResolvedValue([
      { id: 'first' } as Task,
      { id: 'second' } as Task,
    ])
    await expect(resolveContextualTaskPosition({}, '2026-07-14')).resolves.toBe(2)
    expect(fetchTasks).toHaveBeenCalledWith('2026-07-14')
  })
})

describe('App global task creation', () => {
  it('opens QuickAdd with Alt+Q', () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'q', altKey: true })

    expect(screen.getByPlaceholderText('Nome da tarefa')).toBeTruthy()
  })

  it('opens QuickAdd from the visible Nova tarefa action', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Nova tarefa' }))

    expect(screen.getByPlaceholderText('Nome da tarefa')).toBeTruthy()
  })
})
