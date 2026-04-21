// @vitest-environment jsdom

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickAdd } from './quick-add'
import { isoDate, startOfWeek, addDays } from '../lib/constants'

vi.mock('../hooks/use-tags', () => ({
  useTags: () => ({
    data: [
      { id: 'work', name: 'work', color: '#7c3aed' },
      { id: 'focus', name: 'focus', color: '#0f766e' },
    ],
  }),
}))

afterEach(() => {
  cleanup()
})

function renderQuickAdd() {
  const onClose = vi.fn()
  const onCreate = vi.fn()

  render(
    <QuickAdd
      weekStart={startOfWeek(new Date(), 1)}
      weekTasks={{}}
      inboxTasks={[]}
      onClose={onClose}
      onCreate={onCreate}
    />
  )

  return {
    onClose,
    onCreate,
    titleInput: screen.getByPlaceholderText('Nome da tarefa'),
    detailsInput: screen.getByPlaceholderText('Descricao'),
  }
}

describe('QuickAdd', () => {
  it('envia com Enter quando ha titulo limpo valido', async () => {
    const { titleInput, detailsInput, onCreate } = renderQuickAdd()
    const user = userEvent.setup()
    const tomorrow = isoDate(addDays(new Date(), 1))

    await user.type(titleInput, 'Planejar viagem')
    await user.type(detailsInput, 'tom p1 #work')

    await waitFor(() => {
      expect(screen.getByTestId('quick-add-tags-trigger').textContent).toContain('#work')
    })

    fireEvent.keyDown(detailsInput, { key: 'Enter' })

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        title: 'Planejar viagem',
        bucketKey: tomorrow,
        priority: 'high',
        tags: ['work'],
      })
    })
  })

  it('insere quebra de linha com Shift+Enter sem enviar', async () => {
    const { titleInput, detailsInput, onCreate } = renderQuickAdd()
    const user = userEvent.setup()

    await user.type(titleInput, 'Planejar viagem')
    await user.type(detailsInput, 'Primeira linha{shift>}{enter}{/shift}segunda linha')

    expect((detailsInput as HTMLTextAreaElement).value).toContain('\n')
    expect((detailsInput as HTMLTextAreaElement).value).toContain('segunda linha')
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('fecha com Esc', () => {
    const { onClose } = renderQuickAdd()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('mantem os highlights de data, prioridade e tag', async () => {
    const { detailsInput } = renderQuickAdd()
    const user = userEvent.setup()

    await user.type(detailsInput, 'tom p1 #work')

    await waitFor(() => {
      expect(document.querySelectorAll('mark').length).toBeGreaterThanOrEqual(3)
    })
  })

  it('tambem destaca tokens quando a linguagem natural e digitada no titulo', async () => {
    const { titleInput } = renderQuickAdd()
    const user = userEvent.setup()

    await user.type(titleInput, 'Planejar viagem tom p1 #work')

    await waitFor(() => {
      expect(document.querySelectorAll('mark').length).toBeGreaterThanOrEqual(3)
    })
  })

  it('sincroniza chips automaticos com o parser', async () => {
    const { detailsInput } = renderQuickAdd()
    const user = userEvent.setup()

    await user.type(detailsInput, 'tom p1 #work')

    await waitFor(() => {
      expect(screen.getByTestId('quick-add-date-trigger').textContent).toContain('Amanha')
      expect(screen.getByTestId('quick-add-priority-trigger').textContent).toContain('Alta')
      expect(screen.getByTestId('quick-add-tags-trigger').textContent).toContain('#work')
    })
  })

  it('preserva override manual de data mesmo com o parser ainda detectando outro valor', async () => {
    const { detailsInput } = renderQuickAdd()
    const user = userEvent.setup()

    await user.type(detailsInput, 'tom')

    await waitFor(() => {
      expect(screen.getByTestId('quick-add-date-trigger').textContent).toContain('Amanha')
    })

    await user.click(screen.getByTestId('quick-add-date-trigger'))
    await user.click(screen.getByRole('button', { name: /Hoje/ }))
    await user.type(detailsInput, ' agora')

    await waitFor(() => {
      expect(screen.getByTestId('quick-add-date-trigger').textContent).toContain('Hoje')
      expect(screen.getByTestId('quick-add-date-trigger').textContent).not.toContain('Amanha')
    })
  })
})
