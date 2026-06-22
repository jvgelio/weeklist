// @vitest-environment jsdom

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContextualTaskAdd } from './contextual-task-add'

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return { ...actual, useReducedMotion: () => true }
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function deferred() {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

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
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 5, 21, 12))
    const onCreate = vi.fn(async () => undefined)
    const user = userEvent.setup()
    render(<ContextualTaskAdd {...baseProps} open onCreate={onCreate} />)

    await user.type(
      screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }),
      'Revisar proposta tom de tarde p1 #work{enter}'
    )

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith(
        {
          title: 'Revisar proposta',
          bucketKey: '2026-06-22',
          slot: 'pm',
          priority: 'high',
          recurring: null,
          tags: ['work'],
        },
        { onOptimistic: expect.any(Function) }
      )
    })
  })

  it('envia o contexto herdado e metadados nulos sem tokens', async () => {
    const onCreate = vi.fn(async () => undefined)
    const user = userEvent.setup()
    render(<ContextualTaskAdd {...baseProps} open onCreate={onCreate} />)

    await user.type(
      screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }),
      'Revisar proposta{enter}'
    )

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(
      {
        title: 'Revisar proposta',
        bucketKey: baseProps.bucketKey,
        slot: baseProps.slot,
        priority: null,
        recurring: null,
        tags: [],
      },
      { onOptimistic: expect.any(Function) }
    ))
  })

  it('substitui o composer assim que a tarefa otimista entra e fecha apos sucesso', async () => {
    const pending = deferred()
    const onClose = vi.fn()
    const onCreate = vi.fn((_params, options) => {
      options.onOptimistic()
      return pending.promise
    })
    const user = userEvent.setup()
    render(<ContextualTaskAdd {...baseProps} open onClose={onClose} onCreate={onCreate} />)

    await user.type(screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }), 'Tarefa A{enter}')

    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: 'Titulo da nova tarefa' })).toBeNull()
      expect(screen.queryByRole('button', { name: baseProps.accessibleLabel })).toBeNull()
    })
    expect(onClose).not.toHaveBeenCalled()

    await act(async () => {
      pending.resolve()
      await pending.promise
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('restaura o composer com draft e erro quando a criacao otimista falha', async () => {
    const pending = deferred()
    const onCreate = vi.fn((_params, options) => {
      options.onOptimistic()
      return pending.promise
    })
    const user = userEvent.setup()
    render(<ContextualTaskAdd {...baseProps} open onCreate={onCreate} />)

    await user.type(screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }), 'Tarefa A{enter}')
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull())

    await act(async () => {
      pending.reject(new Error('failed'))
      await pending.promise.catch(() => undefined)
    })

    expect((await screen.findByRole('textbox', {
      name: 'Titulo da nova tarefa',
    }) as HTMLInputElement).value).toBe('Tarefa A')
    expect(screen.getByRole('alert').textContent).toContain('Nao foi possivel criar a tarefa')
  })

  it('guarda o erro no alvo original sem reabri-lo quando outro alvo esta ativo', async () => {
    const pending = deferred()
    const onClose = vi.fn()
    const onCreate = vi.fn((_params, options) => {
      options.onOptimistic()
      return pending.promise
    })
    const user = userEvent.setup()
    const { rerender } = render(
      <ContextualTaskAdd {...baseProps} open onClose={onClose} onCreate={onCreate} />
    )

    await user.type(screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }), 'Tarefa A{enter}')
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull())
    rerender(
      <ContextualTaskAdd {...baseProps} open={false} onClose={onClose} onCreate={onCreate} />
    )

    await act(async () => {
      pending.reject(new Error('failed'))
      await pending.promise.catch(() => undefined)
    })

    expect(screen.queryByRole('textbox')).toBeNull()
    expect(onClose).not.toHaveBeenCalled()

    rerender(<ContextualTaskAdd {...baseProps} open onClose={onClose} onCreate={onCreate} />)
    expect((screen.getByRole('textbox', {
      name: 'Titulo da nova tarefa',
    }) as HTMLInputElement).value).toBe('Tarefa A')
    expect(screen.getByRole('alert').textContent).toContain('Nao foi possivel criar a tarefa')
  })

  it('nao fecha outro alvo quando uma criacao pendente resolve', async () => {
    const pending = deferred()
    const onClose = vi.fn()
    const onCreate = vi.fn((_params, options) => {
      options.onOptimistic()
      return pending.promise
    })
    const user = userEvent.setup()
    const { rerender } = render(
      <ContextualTaskAdd {...baseProps} open onClose={onClose} onCreate={onCreate} />
    )

    await user.type(screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }), 'Tarefa A{enter}')
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))
    rerender(<ContextualTaskAdd {...baseProps} open={false} onClose={onClose} onCreate={onCreate} />)

    await act(async () => {
      pending.resolve()
      await pending.promise
    })

    expect(onClose).not.toHaveBeenCalled()

    rerender(<ContextualTaskAdd {...baseProps} open onClose={onClose} onCreate={onCreate} />)
    expect(
      (screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }) as HTMLInputElement).value
    ).toBe('')
  })

  it('atualiza a data base quando o composer abre em outro dia', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 5, 21, 23, 59))
    const user = userEvent.setup()
    const { rerender } = render(<ContextualTaskAdd {...baseProps} open={false} />)

    vi.setSystemTime(new Date(2026, 5, 22, 0, 1))
    rerender(<ContextualTaskAdd {...baseProps} open />)
    await user.type(screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }), 'Planejar tom')

    const dateLabel = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
    }).format(new Date('2026-06-23T12:00:00'))
    expect(screen.getByLabelText('Destino da tarefa').textContent).toBe(`${dateLabel} · manha`)
  })

  it('resolve datas relativas com o dia atual no momento do submit', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 5, 21, 23, 59))
    const onCreate = vi.fn(async () => undefined)
    const user = userEvent.setup()
    render(<ContextualTaskAdd {...baseProps} open onCreate={onCreate} />)

    await user.type(screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }), 'Planejar tom')
    vi.setSystemTime(new Date(2026, 5, 22, 0, 1))
    await user.type(screen.getByRole('textbox', { name: 'Titulo da nova tarefa' }), '{enter}')

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ bucketKey: '2026-06-23' }),
      { onOptimistic: expect.any(Function) }
    ))
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
