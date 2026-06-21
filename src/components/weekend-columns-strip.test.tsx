// @vitest-environment jsdom

import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDroppable } from '@dnd-kit/core'
import { WeekendColumnsStrip } from './day-row'

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    useDroppable: vi.fn(() => ({
      active: null,
      activeNodeRect: null,
      isOver: false,
      node: { current: null },
      over: null,
      rect: { current: null },
      setNodeRef: vi.fn(),
    })),
  }
})

afterEach(() => {
  cleanup()
  vi.mocked(useDroppable).mockClear()
})

describe('WeekendColumnsStrip droppables', () => {
  it('disables collapsed weekend zones and re-enables them after expansion', async () => {
    const user = userEvent.setup()
    render(
      <WeekendColumnsStrip
        days={[new Date(2026, 5, 27), new Date(2026, 5, 28)]}
        weekStart={new Date(2026, 5, 22)}
        tasks={{}}
        onOpenTask={vi.fn()}
        onAddTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteTask={vi.fn()}
        slotPrefs={{ am: true, pm: true, eve: false }}
        dimPastDays={false}
        activeCreateTarget={null}
        onActiveCreateTargetChange={vi.fn()}
        onCreateContextTask={vi.fn(async () => undefined)}
        isDraggingTask={false}
      />,
    )

    expect(useDroppable).toHaveBeenCalledTimes(6)
    for (const [config] of vi.mocked(useDroppable).mock.calls) {
      expect(config.disabled).toBe(true)
    }

    vi.mocked(useDroppable).mockClear()
    await user.click(screen.getByRole('button', { name: /Fim de semana/ }))

    expect(useDroppable).toHaveBeenCalledTimes(6)
    for (const [config] of vi.mocked(useDroppable).mock.calls) {
      expect(config.disabled).toBe(false)
    }
  })
})
