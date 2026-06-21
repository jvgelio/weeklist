import { describe, expect, it } from 'vitest'
import { parseNL } from '../nl-parse'

describe('parseNL', () => {
  const today = new Date(2026, 5, 21)
  const weekStart = new Date(2026, 5, 15)

  it('returns an explicit null recurrence for empty input', () => {
    expect(parseNL('   ', today, weekStart)).toEqual({
      cleanTitle: '',
      tokens: [],
      date: null,
      slot: null,
      priority: null,
      recurring: null,
      tags: [],
    })
  })
})
