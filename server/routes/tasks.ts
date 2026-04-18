import { Hono } from 'hono'
import { eq, and, gte, lte, gt, inArray } from 'drizzle-orm'
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

  if (from && to) {
    taskList = await db.select().from(tasks)
      .where(and(gte(tasks.bucketKey, from), lte(tasks.bucketKey, to)))
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

  const id = crypto.randomUUID()
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

  await db.update(tasks)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(tasks.id, id))

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
  const { bucketKey: newBucketKey, position: newPosition } = body
  const oldBucketKey = existing.bucketKey
  const oldPosition = existing.position

  await db.transaction(async (tx) => {
    // Decrement positions in old bucket for tasks after the moved task
    const oldBucketTasks = await tx.select()
      .from(tasks)
      .where(and(eq(tasks.bucketKey, oldBucketKey), gt(tasks.position, oldPosition)))

    for (const t of oldBucketTasks) {
      await tx.update(tasks)
        .set({ position: t.position - 1 })
        .where(eq(tasks.id, t.id))
    }

    // Increment positions in new bucket for tasks at or after the new position
    const newBucketTasks = await tx.select()
      .from(tasks)
      .where(and(eq(tasks.bucketKey, newBucketKey), gte(tasks.position, newPosition)))

    for (const t of newBucketTasks) {
      if (t.id !== id) {
        await tx.update(tasks)
          .set({ position: t.position + 1 })
          .where(eq(tasks.id, t.id))
      }
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

  return new Response(null, { status: 204 })
})
