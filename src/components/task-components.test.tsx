// @vitest-environment jsdom

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InlineAdd } from './task-components'

afterEach(() => {
  cleanup()
})

describe('InlineAdd', () => {
  it('passes parsed recurrence to the create callback', async () => {
    const onAdd = vi.fn()
    const user = userEvent.setup()

    render(<InlineAdd onAdd={onAdd} />)

    await user.click(screen.getByRole('button', { name: 'Adicionar tarefa...' }))
    await user.type(screen.getByPlaceholderText('O que precisa ser feito?'), 'Revisar agenda todo dia{enter}')

    expect(onAdd).toHaveBeenCalledWith('Revisar agenda', {
      priority: null,
      tags: [],
      slot: null,
      date: null,
      recurring: 'daily',
    })
  })
})
