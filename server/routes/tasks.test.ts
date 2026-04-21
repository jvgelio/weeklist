import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { tasksRouter } from './tasks.js'
import { db } from '../db/client.js'
import { tasks } from '../db/schema.js'
import { eq } from 'drizzle-orm'

vi.mock('../db/client.js', () => ({
  db: {
    select: vi.fn(),
  },
}))

// Mock the db and tasks schema if necessary, or use a real test database if available.
// Given the environment, I'll try to use the real DB if configured, 
// but since I'm just adding an endpoint, I'll focus on the route definition first.

describe('tasksRouter', () => {
  const app = new Hono()
  
  // Mock user middleware
  app.use('*', async (c, next) => {
    c.set('user', { id: 'test-user-id' })
    await next()
  })
  
  app.route('/', tasksRouter)

  it('GET /occupancy should return 400 if from/to are missing', async () => {
    const res = await app.request('/occupancy')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('from and to are required')
  })

  it('GET /occupancy should return a record of counts per bucketKey', async () => {
    // Mock the db.select().from().where().groupBy() chain
    const mockSelect = vi.fn().mockReturnThis()
    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockGroupBy = vi.fn().mockResolvedValue([
      { bucketKey: '2026-04-18', count: 3 },
      { bucketKey: '2026-04-19', count: 1 }
    ])

    vi.mocked(db.select).mockReturnValue({
      from: mockFrom.mockReturnValue({
        where: mockWhere.mockReturnValue({
          groupBy: mockGroupBy
        })
      })
    } as any)

    const res = await app.request('/occupancy?from=2026-04-18&to=2026-04-19')
    expect(res.status).toBe(200)
    const body = await res.json()
    
    expect(body).toEqual({
      '2026-04-18': 3,
      '2026-04-19': 1
    })

    expect(db.select).toHaveBeenCalled()
    expect(mockGroupBy).toHaveBeenCalled()
  })
})
