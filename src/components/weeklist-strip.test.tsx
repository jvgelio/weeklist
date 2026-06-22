// @vitest-environment jsdom

import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDroppable } from '@dnd-kit/core'
import { WeeklistStrip } from './day-row'

const setNodeRef = vi.hoisted(() => vi.fn())
const droppableState = vi.hoisted(() => ({ isOver: false }))

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    useDroppable: vi.fn(() => ({
      active: null,
      activeNodeRect: null,
      isOver: droppableState.isOver,
      node: { current: null },
      over: null,
      rect: { current: null },
      setNodeRef,
    })),
  }
})

afterEach(() => {
  cleanup()
  setNodeRef.mockClear()
  droppableState.isOver = false
  vi.mocked(useDroppable).mockClear()
})

function renderWeeklistStrip() {
  return render(
    <WeeklistStrip
      bucketKey="weeklist-2026-06-22"
      tasks={[]}
      onOpenTask={vi.fn()}
      onAddTask={vi.fn()}
      onUpdateTask={vi.fn()}
      onDeleteTask={vi.fn()}
    />,
  )
}

describe('WeeklistStrip', () => {
  it('keeps its visible collapsed surface registered as the weeklist drop target', () => {
    renderWeeklistStrip()

    expect(useDroppable).toHaveBeenCalledWith({
      id: 'weeklist-2026-06-22',
      data: { type: 'zone', bucketKey: 'weeklist-2026-06-22', slot: null },
    })
    const mountedTarget = setNodeRef.mock.calls.find(([node]) => node instanceof HTMLElement)?.[0]
    expect(mountedTarget).toBeInstanceOf(HTMLElement)
    expect(mountedTarget.contains(screen.getByText('Weeklist'))).toBe(true)
  })

  it('exposes a labelled disclosure relationship with a separated task count', async () => {
    const user = userEvent.setup()
    renderWeeklistStrip()

    const disclosure = screen.getByRole('button', { name: 'Weeklist, 0 tarefas' })
    const contentId = disclosure.getAttribute('aria-controls')

    expect(disclosure.getAttribute('aria-expanded')).toBe('false')
    expect(contentId).toBeTruthy()
    expect(document.getElementById(contentId!)).toBeNull()

    await user.click(disclosure)

    expect(disclosure.getAttribute('aria-expanded')).toBe('true')
    expect(disclosure.getAttribute('aria-controls')).toBe(contentId)
    expect(document.getElementById(contentId!)).not.toBeNull()
  })

  it('shows drop feedback on the visible surface while collapsed', () => {
    droppableState.isOver = true
    renderWeeklistStrip()

    const mountedTarget = setNodeRef.mock.calls.find(([node]) => node instanceof HTMLElement)?.[0]
    expect(mountedTarget.style.background).toBe('var(--accent-soft)')
  })
})
