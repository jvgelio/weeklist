// @vitest-environment jsdom

import React from 'react'
import { DndContext } from '@dnd-kit/core'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { WeekView } from './views'

const scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')
const scrollIntoViewMock = vi.fn()

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: scrollIntoViewMock,
  })
})

afterEach(() => {
  cleanup()
  scrollIntoViewMock.mockClear()
})

afterAll(() => {
  if (scrollIntoViewDescriptor) {
    Object.defineProperty(Element.prototype, 'scrollIntoView', scrollIntoViewDescriptor)
  } else {
    delete (Element.prototype as { scrollIntoView?: Element['scrollIntoView'] }).scrollIntoView
  }
})

const weekStart = new Date(2026, 5, 15)

interface WeekViewHarnessProps {
  isDraggingTask?: boolean
  isMobile?: boolean
  onOpenQuickAdd?: () => void
  variant?: 'columns' | 'quiet'
  weekStart?: Date
}

function WeekViewHarness({
  isDraggingTask = false,
  isMobile = false,
  onOpenQuickAdd = vi.fn(),
  variant = 'columns',
  weekStart: harnessWeekStart = weekStart,
}: WeekViewHarnessProps) {
  return (
    <DndContext>
      <WeekView
        weekStart={harnessWeekStart}
        tasks={{}}
        variant={variant}
        showWeekend
        dimPastDays={false}
        dark={false}
        accent="#b8643c"
        onOpenTask={vi.fn()}
        onAddTask={vi.fn()}
        slotPrefs={{ am: true, pm: true, eve: false }}
        onUpdateTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onMoveTask={vi.fn()}
        onPrevWeek={vi.fn()}
        onNextWeek={vi.fn()}
        onToday={vi.fn()}
        onChangeVariant={vi.fn()}
        onToggleWeekend={vi.fn()}
        onToggleDark={vi.fn()}
        overdueTasks={[]}
        onPullOneOverdue={vi.fn()}
        onPullAllOverdue={vi.fn()}
        onOpenQuickAdd={onOpenQuickAdd}
        onCreateContextTask={vi.fn(async () => undefined)}
        isDraggingTask={isDraggingTask}
        isMobile={isMobile}
      />
    </DndContext>
  )
}

describe('WeekView contextual task creation', () => {
  it('coordinates weekday and weekend composers while preserving a weekend draft across collapse', async () => {
    const user = userEvent.setup()
    render(<WeekViewHarness />)

    await user.click(screen.getByRole('button', { name: /Adicionar tarefa na segunda de manh/i }))
    expect(screen.getAllByRole('textbox', { name: 'Titulo da nova tarefa' })).toHaveLength(1)

    const weekendDisclosure = screen.getByRole('button', { name: /Fim de semana/ })
    expect(weekendDisclosure.getAttribute('aria-expanded')).toBe('false')
    const weekendContentId = weekendDisclosure.getAttribute('aria-controls')
    expect(weekendContentId).toBeTruthy()

    await user.click(weekendDisclosure)
    expect(weekendDisclosure.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById(weekendContentId!)).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /Adicionar tarefa na sábado de manh/i }))
    await waitFor(() => {
      expect(screen.getAllByRole('textbox', { name: 'Titulo da nova tarefa' })).toHaveLength(1)
    })

    const weekendInput = screen.getByRole('textbox', { name: 'Titulo da nova tarefa' })
    await user.type(weekendInput, 'Rascunho do fim de semana')
    await user.click(weekendDisclosure)

    expect(weekendDisclosure.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('textbox', { name: 'Titulo da nova tarefa' })).toBeNull()

    await user.click(weekendDisclosure)
    expect(screen.getByRole('textbox', { name: 'Titulo da nova tarefa' })).toHaveProperty(
      'value',
      'Rascunho do fim de semana',
    )
  })

  it('closes a composer when dragging starts and restores its draft when reopened', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<WeekViewHarness />)

    await user.click(screen.getByRole('button', { name: /Adicionar tarefa na segunda de manh/i }))
    await user.type(screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }), 'Rascunho preservado')

    rerender(<WeekViewHarness isDraggingTask />)
    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: 'Titulo da nova tarefa' })).toBeNull()
    })

    rerender(<WeekViewHarness />)
    await user.click(screen.getByRole('button', { name: /Adicionar tarefa na segunda de manh/i }))
    expect(screen.getByRole('textbox', { name: 'Titulo da nova tarefa' })).toHaveProperty(
      'value',
      'Rascunho preservado',
    )
  })
})

describe('WeekView global task creation', () => {
  it('exposes one global action that opens quick add', async () => {
    const user = userEvent.setup()
    const onOpenQuickAdd = vi.fn()

    render(<WeekViewHarness onOpenQuickAdd={onOpenQuickAdd} />)

    const actions = screen.getAllByRole('button', { name: 'Nova tarefa' })
    expect(actions).toHaveLength(1)
    expect(actions[0]).toHaveProperty('type', 'button')
    expect(actions[0]).toHaveProperty('title', 'Nova tarefa (Alt+Q)')
    expect(actions[0].classList.contains('pill-btn')).toBe(true)
    expect(actions[0].textContent).toContain('Nova tarefa')
    await user.click(actions[0])
    expect(onOpenQuickAdd).toHaveBeenCalledTimes(1)
  })

  it('keeps one accessible 44px action in the mobile quiet variant', async () => {
    const user = userEvent.setup()
    const onOpenQuickAdd = vi.fn()

    render(<WeekViewHarness isMobile variant="quiet" onOpenQuickAdd={onOpenQuickAdd} />)

    const actions = screen.getAllByRole('button', { name: 'Nova tarefa' })
    expect(actions).toHaveLength(1)
    expect(actions[0].style.minWidth).toBe('44px')
    expect(actions[0].style.minHeight).toBe('44px')
    await user.click(actions[0])
    expect(onOpenQuickAdd).toHaveBeenCalledTimes(1)
  })

  it('separates and constrains a cross-month mobile header at 320px', () => {
    render(
      <div style={{ width: 320, overflow: 'hidden' }}>
        <WeekViewHarness
          isMobile
          variant="quiet"
          weekStart={new Date(2026, 5, 29)}
        />
      </div>,
    )

    const header = screen.getByRole('banner')
    const heading = screen.getByRole('heading', { level: 1 })
    const titleContainer = heading.parentElement?.parentElement
    const controls = screen.getByRole('button', { name: 'Nova tarefa' }).parentElement

    expect(heading.textContent).toMatch(/jun.*jul/i)
    expect(header.style.flexDirection).toBe('column')
    expect(header.style.alignItems).toBe('stretch')
    expect(titleContainer?.style.minWidth).toBe('0px')
    expect(heading.style.overflow).toBe('hidden')
    expect(heading.style.textOverflow).toBe('ellipsis')
    expect(controls?.style.width).toBe('100%')
    expect(controls?.style.maxWidth).toBe('100%')
  })
})

describe('WeekView mobile quiet layout', () => {
  it('keeps the week content full-width and renders the weeklist as a bottom strip', () => {
    render(<WeekViewHarness isMobile variant="quiet" />)

    const header = screen.getByRole('banner')
    const content = header.parentElement?.parentElement
    const layout = content?.parentElement

    expect(screen.getByRole('button', { name: 'Weeklist0' })).not.toBeNull()
    expect(screen.queryByText('Nenhuma tarefa pendente na weeklist.')).toBeNull()
    expect(layout?.style.flexDirection).toBe('column')
    expect(content?.style.width).toBe('100%')
    expect(content?.style.minWidth).toBe('0px')
  })
})
