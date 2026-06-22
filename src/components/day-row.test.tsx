// @vitest-environment jsdom

import React, { useState } from 'react'
import { DndContext } from '@dnd-kit/core'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContextualTaskCreateHandler, Task } from '../lib/types'
import { DayColumn } from './day-row'

afterEach(() => {
  cleanup()
})

const monday = new Date(2026, 5, 22)

const task: Task = {
  id: 'task-1',
  title: 'Revisar planejamento',
  done: false,
  bucketKey: '2026-06-22',
  slot: 'am',
  priority: null,
  recurring: null,
  tags: [],
  note: null,
  position: 0,
  createdAt: '2026-06-22T12:00:00.000Z',
  updatedAt: '2026-06-22T12:00:00.000Z',
  subtasks: [],
}

interface HarnessProps {
  tasks?: Task[]
  isDraggingTask?: boolean
  onOpenTask?: (task: Task) => void
  onActiveCreateTargetChange?: (target: string | null) => void
  onCreateContextTask?: ContextualTaskCreateHandler
}

function Harness({
  tasks = [],
  isDraggingTask = false,
  onOpenTask = vi.fn(),
  onActiveCreateTargetChange,
  onCreateContextTask = vi.fn(async () => undefined),
}: HarnessProps) {
  const [activeCreateTarget, setActiveCreateTarget] = useState<string | null>(null)

  function handleActiveCreateTargetChange(target: string | null) {
    setActiveCreateTarget(target)
    onActiveCreateTargetChange?.(target)
  }

  return (
    <DndContext>
      <DayColumn
        date={monday}
        weekStart={monday}
        tasks={tasks}
        isToday={false}
        onOpenTask={onOpenTask}
        onAddTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onDeleteTask={vi.fn()}
        slotPrefs={{ am: true, pm: true, eve: false }}
        dimPastDays={false}
        activeCreateTarget={activeCreateTarget}
        onActiveCreateTargetChange={handleActiveCreateTargetChange}
        onCreateContextTask={onCreateContextTask}
        isDraggingTask={isDraggingTask}
      />
    </DndContext>
  )
}

describe('DayColumn contextual task creation', () => {
  it('offers one controlled composer across enabled slots', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.queryByText('Adicionar tarefa')).toBeNull()
    const zoneButtons = screen.getAllByRole('button', { name: /Adicionar tarefa na/ })
    expect(zoneButtons).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: /Adicionar tarefa na segunda de manh/i }))
    expect(screen.getAllByLabelText('Titulo da nova tarefa')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: /Adicionar tarefa na segunda de tarde/i }))
    await waitFor(() => {
      expect(screen.getAllByLabelText('Titulo da nova tarefa')).toHaveLength(1)
    })
  })

  it('disables creation zones while preserving droppable slot surfaces during drag', () => {
    render(<Harness isDraggingTask />)

    for (const button of screen.getAllByRole('button', { name: /Adicionar tarefa na/ })) {
      expect(button).toHaveProperty('disabled', true)
    }
    expect(screen.getByTestId('day-slot-2026-06-22-am')).not.toBeNull()
    expect(screen.getByTestId('day-slot-2026-06-22-pm')).not.toBeNull()
  })

  it('opens a task without activating a creation zone', async () => {
    const onOpenTask = vi.fn()
    const onActiveCreateTargetChange = vi.fn()
    render(
      <Harness
        tasks={[task]}
        onOpenTask={onOpenTask}
        onActiveCreateTargetChange={onActiveCreateTargetChange}
      />,
    )

    fireEvent.click(screen.getByText('Revisar planejamento'))

    expect(onOpenTask).toHaveBeenCalledWith(task)
    expect(onActiveCreateTargetChange).not.toHaveBeenCalled()
  })
})
