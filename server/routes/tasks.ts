import { Hono } from 'hono'
import { sql, eq, and, gte, lte, gt, lt, inArray, or, isNotNull } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db } from '../db/client.js'
import { tasks, subtasks } from '../db/schema.js'
import { addDays, isoDate } from '../../src/lib/constants.js'

export const tasksRouter = new Hono()

// Helper: fetch a single task with its subtasks
async function getTaskWithSubtasks(id: string, userId: string) {
  const [task] = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
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
    .where(inArray(subtasks.taskId, taskList.map((task) => task.id)))
    .orderBy(subtasks.taskId, subtasks.position)

  const groupedSubtasks = new Map<string, typeof subs>()
  for (const sub of subs) {
    const current = groupedSubtasks.get(sub.taskId)
    if (current) {
      current.push(sub)
    } else {
      groupedSubtasks.set(sub.taskId, [sub])
    }
  }

  return taskList.map((task) => ({
    ...task,
    subtasks: groupedSubtasks.get(task.id) ?? [],
  }))
}

function projectRecurringTasks(
  templates: typeof tasks.$inferSelect[],
  from: string,
  to: string
): typeof tasks.$inferSelect[] {
  const projected: typeof tasks.$inferSelect[] = []
  const fromDate = new Date(from + 'T00:00:00')
  const toDate = new Date(to + 'T00:00:00')

  for (const task of templates) {
    if (!task.recurring) continue
    const taskDate = new Date(task.bucketKey + 'T00:00:00')
    if (taskDate > toDate) continue

    let current = taskDate
    if (task.recurring === 'daily') {
      if (current < fromDate) current = fromDate
    } else if (task.recurring === 'weekly') {
      while (current < fromDate) current = addDays(current, 7)
    } else if (task.recurring === 'monthly') {
      while (current < fromDate) {
        const next = new Date(current)
        next.setMonth(next.getMonth() + 1)
        current = next
      }
    }

    while (current <= toDate) {
      const currentIso = isoDate(current)
      if (currentIso !== task.bucketKey && currentIso >= from && currentIso <= to) {
        projected.push({
          ...task,
          id: `${task.id}:${currentIso}`,
          bucketKey: currentIso,
          done: false, // Projected tasks are initially not done
        })
      }

      if (task.recurring === 'daily') current = addDays(current, 1)
      else if (task.recurring === 'weekly') current = addDays(current, 7)
      else if (task.recurring === 'monthly') {
        const next = new Date(current)
        next.setMonth(next.getMonth() + 1)
        current = next
      } else break
    }
  }
  return projected
}

function calculateNextOccurrence(currentIso: string, recurring: string): string | null {
  const d = new Date(currentIso + 'T00:00:00')
  if (recurring === 'daily') {
    return isoDate(addDays(d, 1))
  }
  if (recurring === 'weekly') {
    return isoDate(addDays(d, 7))
  }
  if (recurring === 'monthly') {
    const next = new Date(d)
    next.setMonth(next.getMonth() + 1)
    return isoDate(next)
  }
  return null
}

// GET /api/tasks
tasksRouter.get('/', async (c) => {
  const user = c.get('user')
  const from = c.req.query('from')
  const to = c.req.query('to')
  const bucket = c.req.query('bucket')
  const includeSubtasks = c.req.query('includeSubtasks') === 'true'

  let taskList: typeof tasks.$inferSelect[]

  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  if (from !== undefined && !dateRe.test(from)) {
    return c.json({ error: 'from and to must be YYYY-MM-DD' }, 400)
  }
  if (to !== undefined && !dateRe.test(to)) {
    return c.json({ error: 'from and to must be YYYY-MM-DD' }, 400)
  }

  const overdueBefore = c.req.query('overdue_before')
  if (overdueBefore) {
    if (!dateRe.test(overdueBefore)) {
      return c.json({ error: 'overdue_before must be YYYY-MM-DD' }, 400)
    }
    taskList = await db.select().from(tasks)
      .where(and(
        eq(tasks.userId, user.id),
        lt(tasks.bucketKey, overdueBefore),
        eq(tasks.done, false),
        sql`${tasks.bucketKey} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'`,
      ))
      .orderBy(tasks.bucketKey, tasks.position)
    return c.json(taskList)
  }

  if (from && to) {
    const [datedTasks, recurringTemplates, weeklistTasks] = await Promise.all([
      db.select().from(tasks)
        .where(and(
          eq(tasks.userId, user.id),
          gte(tasks.bucketKey, from),
          lte(tasks.bucketKey, to),
        ))
        .orderBy(tasks.bucketKey, tasks.position),
      db.select().from(tasks)
        .where(and(
          eq(tasks.userId, user.id),
          isNotNull(tasks.recurring),
          lt(tasks.bucketKey, from),
        )),
      db.select().from(tasks)
        .where(and(
          eq(tasks.userId, user.id),
          eq(tasks.bucketKey, `weeklist-${from}`)
        ))
        .orderBy(tasks.position),
    ])

    const projected = projectRecurringTasks(recurringTemplates, from, to)
    // Filter out projected tasks that already have a real counterpart (matching by title)
    const filteredProjected = projected.filter(p => 
      !datedTasks.some(d => d.title === p.title && d.bucketKey === p.bucketKey)
    )
    taskList = [...datedTasks, ...filteredProjected, ...weeklistTasks]
  } else if (bucket) {
    taskList = await db.select().from(tasks)
      .where(and(
        eq(tasks.userId, user.id),
        eq(tasks.bucketKey, bucket)
      ))
      .orderBy(tasks.position)
  } else {
    return c.json({ error: 'Provide either ?from=&to= or ?bucket=' }, 400)
  }

  if (!includeSubtasks) {
    return c.json(taskList)
  }

  const result = await getTasksWithSubtasks(taskList)
  return c.json(result)
})

// GET /api/tasks/occupancy
tasksRouter.get('/occupancy', async (c) => {
  const user = c.get('user')
  const from = c.req.query('from')
  const to = c.req.query('to')

  if (!from || !to) {
    return c.json({ error: 'from and to are required' }, 400)
  }

  const results = await db.select({
    bucketKey: tasks.bucketKey,
    count: sql<number>`count(*)`,
  })
    .from(tasks)
    .where(and(
      eq(tasks.userId, user.id),
      gte(tasks.bucketKey, from),
      lte(tasks.bucketKey, to),
    ))
    .groupBy(tasks.bucketKey)

  const occupancyMap: Record<string, number> = {}
  for (const row of results) {
    occupancyMap[row.bucketKey] = Number(row.count)
  }

  return c.json(occupancyMap)
})

// GET /api/tasks/:id
tasksRouter.get('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const task = await getTaskWithSubtasks(id, user.id)
  if (!task) {
    return c.json({ error: 'Task not found' }, 404)
  }
  return c.json(task)
})

// POST /api/tasks
tasksRouter.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{
    title: string
    bucketKey: string
    slot?: string
    position: number
    priority?: string | null
    recurring?: string | null
    tags?: string[]
  }>()

  if (!body.title || !body.bucketKey || body.position === undefined) {
    return c.json({ error: 'title, bucketKey, and position are required' }, 400)
  }
  if (body.title.length > 255) {
    return c.json({ error: 'title exceeds 255 characters' }, 400)
  }

  const id = randomUUID()
  const now = new Date()

  await db.insert(tasks).values({
    id,
    userId: user.id,
    title: body.title,
    bucketKey: body.bucketKey,
    slot: body.slot ?? null,
    position: body.position,
    priority: body.priority ?? null,
    recurring: body.recurring ?? null,
    tags: body.tags ?? [],
    createdAt: now,
    updatedAt: now,
  })

  const task = await getTaskWithSubtasks(id, user.id)
  return c.json(task, 201)
})

// PATCH /api/tasks/:id
tasksRouter.patch('/:id', async (c) => {
  const user = c.get('user')
  let id = c.req.param('id')
  const body = await c.req.json<{
    title?: string
    done?: boolean
    slot?: string | null
    priority?: string | null
    recurring?: string | null
    tags?: string[]
    note?: string | null
  }>()

  let existing = await getTaskWithSubtasks(id, user.id)
  
  // Handle virtual IDs (templateId:date)
  if (!existing && id.includes(':')) {
    const [templateId, date] = id.split(':')
    const template = await getTaskWithSubtasks(templateId, user.id)
    if (template) {
      // Materialize virtual task as a real one-off task
      const newId = randomUUID()
      const now = new Date()
      await db.insert(tasks).values({
        id: newId,
        userId: user.id,
        title: body.title ?? template.title,
        done: body.done ?? false,
        bucketKey: date,
        slot: body.slot !== undefined ? body.slot : template.slot,
        position: template.position,
        priority: body.priority !== undefined ? body.priority : template.priority,
        recurring: null, // One-off instance
        tags: body.tags ?? template.tags,
        note: body.note !== undefined ? body.note : template.note,
        createdAt: now,
        updatedAt: now,
      })
      
      const created = await getTaskWithSubtasks(newId, user.id)
      return c.json(created)
    }
  }

  if (!existing) {
    return c.json({ error: 'Task not found' }, 404)
  }

  // If it's a real recurring task and it's being marked DONE, 
  // we might want to move it forward instead of just marking it done.
  // But to keep history, we'll follow the "materialize" pattern:
  // 1. Create a done clone for today.
  // 2. Move template to next occurrence.
  if (existing.recurring && body.done === true && !existing.done) {
    const nextDate = calculateNextOccurrence(existing.bucketKey, existing.recurring)
    if (nextDate) {
      // 1. Create completed clone
      const cloneId = randomUUID()
      const now = new Date()
      await db.insert(tasks).values({
        ...existing,
        id: cloneId,
        recurring: null,
        done: true,
        updatedAt: now,
      })
      // 2. Move template forward
      await db.update(tasks).set({
        bucketKey: nextDate,
        done: false,
        updatedAt: now,
      }).where(eq(tasks.id, existing.id))

      const updatedTemplate = await getTaskWithSubtasks(existing.id, user.id)
      return c.json(updatedTemplate)
    }
  }

  const allowed: Partial<typeof tasks.$inferInsert> = {}
  if (body.title !== undefined) {
    if (body.title.length > 255) return c.json({ error: 'title exceeds 255 characters' }, 400)
    allowed.title = body.title
  }
  if (body.done !== undefined) allowed.done = body.done
  if (body.slot !== undefined) allowed.slot = body.slot
  if (body.priority !== undefined) allowed.priority = body.priority
  if (body.recurring !== undefined) allowed.recurring = body.recurring
  if (body.tags !== undefined) allowed.tags = body.tags
  if (body.note !== undefined) allowed.note = body.note
  
  await db.update(tasks).set({ ...allowed, updatedAt: new Date() }).where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))

  const updated = await getTaskWithSubtasks(id, user.id)
  return c.json(updated)
})

// PATCH /api/tasks/:id/move
tasksRouter.patch('/:id/move', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const existing = await getTaskWithSubtasks(id, user.id)
  if (!existing) {
    return c.json({ error: 'Task not found' }, 404)
  }

  const body = await c.req.json<{ bucketKey: string; position: number; slot?: string | null }>()

  if (!body.bucketKey || body.position === undefined) {
    return c.json({ error: 'bucketKey and position are required' }, 400)
  }

  const { bucketKey: newBucketKey, position: newPosition, slot: newSlot } = body

  await db.transaction(async (tx) => {
    // Verify the task still exists inside the transaction
    const [taskInTx] = await tx.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    if (!taskInTx) throw new Error('Task not found')

    const oldBucketKey = taskInTx.bucketKey
    const oldPosition = taskInTx.position

    if (oldBucketKey === newBucketKey) {
      if (newPosition < oldPosition) {
        // moving up: shift tasks in [newPos, oldPos-1] down by 1
        await tx.update(tasks)
          .set({ position: sql`${tasks.position} + 1` })
          .where(and(
            eq(tasks.userId, user.id),
            eq(tasks.bucketKey, oldBucketKey),
            gte(tasks.position, newPosition),
            lt(tasks.position, oldPosition),
          ))
      } else if (newPosition > oldPosition) {
        // moving down: shift tasks in [oldPos+1, newPos] up by 1
        await tx.update(tasks)
          .set({ position: sql`${tasks.position} - 1` })
          .where(and(
            eq(tasks.userId, user.id),
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
        .where(and(
          eq(tasks.userId, user.id),
          eq(tasks.bucketKey, oldBucketKey), 
          gt(tasks.position, oldPosition)
        ))
      // increment new bucket at and after new position (exclude moved task)
      await tx.update(tasks)
        .set({ position: sql`${tasks.position} + 1` })
        .where(and(
          eq(tasks.userId, user.id),
          eq(tasks.bucketKey, newBucketKey),
          gte(tasks.position, newPosition),
          sql`${tasks.id} != ${id}`,
        ))
    }

    // Update the task itself
    await tx.update(tasks)
      .set({
        bucketKey: newBucketKey,
        position: newPosition,
        slot: newSlot !== undefined ? newSlot : taskInTx.slot,
        updatedAt: new Date()
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
  })

  const updated = await getTaskWithSubtasks(id, user.id)
  return c.json(updated)
})

// DELETE /api/tasks/:id
tasksRouter.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const [existing] = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
  if (!existing) {
    return c.json({ error: 'Task not found' }, 404)
  }

  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))

  return c.body(null, 204)
})
