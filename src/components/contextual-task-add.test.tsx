// @vitest-environment jsdom

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, isoDate } from '../lib/constants'
import { ContextualTaskAdd } from './contextual-task-add'

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return { ...actual, useReducedMotion: () => true }
})

afterEach(cleanup)

const baseProps = {
  bucketKey: '2099-01-01',
  slot: 'am' as const,
  weekStart: new Date(2026, 5, 22),
  accessibleLabel: 'Adicionar tarefa na manha',
  disabled: false,
  onOpen: vi.fn(),
  onClose: vi.fn(),
  onCreate: vi.fn(async () => undefined),
}

describe('ContextualTaskAdd', () => {
  it('abre pelo botao contextual sem texto visivel em repouso', async () => {
    const onOpen = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(<ContextualTaskAdd {...baseProps} open={false} onOpen={onOpen} />)

    const button = screen.getByRole('button', { name: baseProps.accessibleLabel })
    expect(button.textContent).toBe('')

    await user.hover(button)
    expect(button.textContent).toBe('Clique para criar')
    await waitFor(
      () => expect(button.style.backgroundColor).toBe('rgba(184, 100, 60, 0.08)'),
      { timeout: 80, interval: 5 }
    )

    await user.click(button)

    expect(onOpen).toHaveBeenCalledTimes(1)

    rerender(<ContextualTaskAdd {...baseProps} open onOpen={onOpen} />)
    rerender(<ContextualTaskAdd {...baseProps} open={false} onOpen={onOpen} />)
    expect((await screen.findByRole('button', { name: baseProps.accessibleLabel })).textContent).toBe('')
  })

  it('herda o contexto e permite que tokens explicitos o substituam', async () => {
    const onCreate = vi.fn(async () => undefined)
    const user = userEvent.setup()
    render(<ContextualTaskAdd {...baseProps} open onCreate={onCreate} />)

    await user.type(
      screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }),
      'Revisar proposta tom de tarde p1 #work{enter}'
    )

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        title: 'Revisar proposta',
        bucketKey: isoDate(addDays(new Date(), 1)),
        slot: 'pm',
        priority: 'high',
        recurring: null,
        tags: ['work'],
      })
    })
  })

  it('mostra o destino herdado com data curta e slot em minusculas', () => {
    render(<ContextualTaskAdd {...baseProps} open />)
    const date = new Date(`${baseProps.bucketKey}T12:00:00`)
    const dateLabel = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
    }).format(date)

    expect(screen.getByLabelText('Destino da tarefa').textContent).toBe(`${dateLabel} · manha`)
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }))
  })

  it('preserva o texto e mostra erro quando a criacao falha', async () => {
    const onCreate = vi.fn(async () => { throw new Error('failed') })
    const user = userEvent.setup()
    render(<ContextualTaskAdd {...baseProps} open onCreate={onCreate} />)
    const input = screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }) as HTMLInputElement

    await user.type(input, 'Revisar proposta{enter}')

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Nao foi possivel criar a tarefa. Tente novamente.'
    )
    expect(input.value).toBe('Revisar proposta')
  })

  it('fecha no blur apenas quando o campo esta vazio', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(<ContextualTaskAdd {...baseProps} open onClose={onClose} />)
    const input = screen.getByRole('textbox', { name: 'Titulo da nova tarefa' })

    fireEvent.blur(input)
    expect(onClose).toHaveBeenCalledTimes(1)

    onClose.mockClear()
    rerender(<ContextualTaskAdd {...baseProps} open onClose={onClose} />)
    await user.type(screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }), 'Rascunho')
    fireEvent.blur(screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('limpa e fecha com Escape', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(<ContextualTaskAdd {...baseProps} open onClose={onClose} />)
    const input = screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }) as HTMLInputElement

    await user.type(input, 'Rascunho{escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
    rerender(<ContextualTaskAdd {...baseProps} open onClose={onClose} />)
    expect((screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }) as HTMLInputElement).value).toBe('')
  })
})
