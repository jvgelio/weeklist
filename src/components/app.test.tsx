// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import * as api from '../lib/api'
import type { Task } from '../lib/types'
import { resolveContextualTaskPosition } from './app'

afterEach(() => {
  vi.restoreAllMocks()
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
