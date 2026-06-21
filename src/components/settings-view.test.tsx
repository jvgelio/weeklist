// @vitest-environment jsdom

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsView } from './settings-view'

const logoutMutate = vi.fn()
const updateSlotsMutate = vi.fn()

vi.mock('../hooks/use-tasks', () => ({
  useLogout: () => ({ mutate: logoutMutate }),
  useUpdateSlotPrefs: () => ({ mutate: updateSlotsMutate }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SettingsView', () => {
  it('runs the logout mutation from the account button', async () => {
    const user = userEvent.setup()

    render(
      <SettingsView
        user={{ name: 'Joao', email: 'joao@example.com' }}
        dark={false}
        showWeekend={true}
        dimPastDays={true}
        slotPrefs={{ am: true, pm: true, eve: false }}
        onToggleDark={vi.fn()}
        onToggleWeekend={vi.fn()}
        onToggleDimPastDays={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Sair' }))

    expect(logoutMutate).toHaveBeenCalledTimes(1)
  })
})
