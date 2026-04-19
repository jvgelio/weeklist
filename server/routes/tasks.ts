import { Hono } from 'hono'
import { sql, eq, and, or, gte, lte, gt, lt, inArray } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db } from '../db/client.js'
import { tasks, subtasks } from '../db/schema.js'

export const tasksRouter = new Hono()

// Helper: fetch a single task with its subtasks
async function getTaskWithSubtasks(id: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id))
  if (!task) return null
  const subs = await db.select().from(subtasks)
    .where(eq(subtasks.taskId, id))
    .orderBy(subtasks.position)
  return { ...task, subtasks: subs }
}

// Helper: fetch multiple tasks with subtasks (2 queries, not N+1)
async function getTasksWithSubtasks(taskList: typeof tasks.$inferSelect[]) {
  if (taskList.length === 0) return []
  const subs = await db.select().from(subtasks)
    .where(inArray(subtasks.taskId, taskList.map(t => t.id)))
    .orderBy(subtasks.position)
  return taskList.map(task => ({
    ...task,
    subtasks: subs.filter(s => s.taskId === task.id),
  }))
}

// GET /api/tasks
tasksRouter.get('/', async (c) => {
  const from = c.req.query('from')
  const to = c.req.query('to')
  const bucket = c.req.query('bucket')

  let taskList: typeof tasks.$inferSelect[]

  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  if (from !== undefined && !dateRe.test(from)) {
    return c.json({ error: 'from and to must be YYYY-MM-DD' }, 400)
  }
  if (to !== undefined && !dateRe.test(to)) {
    return c.json({ error: 'from and to must be YYYY-MM-DD' }, 400)
  }

  if (from && to) {
    taskList = await db.select().from(tasks)
      .where(or(
        and(gte(tasks.bucketKey, from), lte(tasks.bucketKey, to)),
        eq(tasks.bucketKey, `weeklist-${from}`)
      ))
      .orderBy(tasks.position)
  } else if (bucket) {
    taskList = await db.select().from(tasks)
      .where(eq(tasks.bucketKey, bucket))
      .orderBy(tasks.position)
  } else {
    return c.json({ error: 'Provide either ?from=&to= or ?bucket=' }, 400)
  }

  const result = await getTasksWithSubtasks(taskList)
  return c.json(result)
})

// POST /api/tasks
tasksRouter.post('/', async (c) => {
  const body = await c.req.json<{
    title: string
    bucketKey: string
    slot?: string
    position: number
  }>()

  if (!body.title || !body.bucketKey || body.position === undefined) {
    return c.json({ error: 'title, bucketKey, and position are required' }, 400)
  }

  const id = randomUUID()
  const now = new Date()

  await db.insert(tasks).values({
    id,
    title: body.title,
    bucketKey: body.bucketKey,
    slot: body.slot ?? null,
    position: body.position,
    createdAt: now,
    updatedAt: now,
  })

  const task = await getTaskWithSubtasks(id)
  return c.json(task, 201)
})

// PATCH /api/tasks/:id
tasksRouter.patch('/:id', async (c) => {
  const id = c.req.param('id')

  const existing = await getTaskWithSubtasks(id)
  if (!existing) {
    return c.json({ error: 'Task not found' }, 404)
  }

  const body = await c.req.json<{
    title?: string
    done?: boolean
    slot?: string | null
    priority?: string | null
    recurring?: string | null
    tags?: string[]
    note?: string | null
  }>()

  const allowed: Partial<typeof tasks.$inferInsert> = {}
  if (body.title !== undefined) allowed.title = body.title
  if (body.done !== undefined) allowed.done = body.done
  if (body.slot !== undefined) allowed.slot = body.slot
  if (body.priority !== undefined) allowed.priority = body.priority
  if (body.recurring !== undefined) allowed.recurring = body.recurring
  if (body.tags !== undefined) allowed.tags = body.tags
  if (body.note !== undefined) allowed.note = body.note
  await db.update(tasks).set({ ...allowed, updatedAt: new Date() }).where(eq(tasks.id, id))

  const updated = await getTaskWithSubtasks(id)
  return c.json(updated)
})

// PATCH /api/tasks/:id/move
tasksRouter.patch('/:id/move', async (c) => {
  const id = c.req.param('id')

  const existing = await getTaskWithSubtasks(id)
  if (!existing) {
    return c.json({ error: 'Task not found' }, 404)
  }

  const body = await c.req.json<{ bucketKey: string; position: number }>()

  if (!body.bucketKey || body.position === undefined) {
    return c.json({ error: 'bucketKey and position are required' }, 400)
  }

  const { bucketKey: newBucketKey, position: newPosition } = body

  await db.transaction(async (tx) => {
    // Verify the task still exists inside the transaction
    const [taskInTx] = await tx.select().from(tasks).where(eq(tasks.id, id))
    if (!taskInTx) throw new Error('Task not found')

    const oldBucketKey = taskInTx.bucketKey
    const oldPosition = taskInTx.position

    if (oldBucketKey === newBucketKey) {
      if (newPosition < oldPosition) {
        // moving up: shift tasks in [newPos, oldPos-1] down by 1
        await tx.update(tasks)
          .set({ position: sql`${tasks.position} + 1` })
          .where(and(
            eq(tasks.bucketKey, oldBucketKey),
            gte(tasks.position, newPosition),
            lt(tasks.position, oldPosition),
          ))
      } else if (newPosition > oldPosition) {
        // moving down: shift tasks in [oldPos+1, newPos] up by 1
        await tx.update(tasks)
          .set({ position: sql`${tasks.position} - 1` })
          .where(and(
            eq(tasks.bucketKey, oldBucketKey),
            gt(tasks.position, oldPosition),
            lte(tasks.position, newPosition),
          ))
      }
      // same position: no-op
    } else {
      // cross-bucket: decrement old bucket after old position
      await tx.update(tasks)
        .set({ position: sql`${tasks.position} - 1` })
        .where(and(eq(tasks.bucketKey, oldBucketKey), gt(tasks.position, oldPosition)))
      // increment new bucket at and after new position (exclude moved task)
      await tx.update(tasks)
        .set({ position: sql`${tasks.position} + 1` })
        .where(and(
          eq(tasks.bucketKey, newBucketKey),
          gte(tasks.position, newPosition),
          sql`${tasks.id} != ${id}`,
        ))
    }

    // Update the task itself
    await tx.update(tasks)
      .set({ bucketKey: newBucketKey, position: newPosition, updatedAt: new Date() })
      .where(eq(tasks.id, id))
  })

  const updated = await getTaskWithSubtasks(id)
  return c.json(updated)
})

// DELETE /api/tasks/:id
tasksRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')

  const [existing] = await db.select().from(tasks).where(eq(tasks.id, id))
  if (!existing) {
    return c.json({ error: 'Task not found' }, 404)
  }

  await db.delete(tasks).where(eq(tasks.id, id))

  return c.body(null, 204)
})
