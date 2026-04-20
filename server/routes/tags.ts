import { Hono } from 'hono'
import { sql, eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { tags, tasks } from '../db/schema.js'

export const tagsRouter = new Hono()

function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50)
}

// GET /api/tags — list all tags with task count
tagsRouter.get('/', async (c) => {
  const rows = await db.execute(sql`
    SELECT t.id, t.name, t.color,
           COUNT(tasks.id)::int AS task_count
    FROM tags t
    LEFT JOIN tasks ON t.id = ANY(tasks.tags)
    GROUP BY t.id
    ORDER BY t.name
  `)
  return c.json(rows.rows)
})

// POST /api/tags — create tag
tagsRouter.post('/', async (c) => {
  const body = await c.req.json<{ name: string; color: string }>()
  if (!body.name?.trim() || !body.color) {
    return c.json({ error: 'name and color are required' }, 400)
  }

  let id = slugify(body.name)
  if (!id) return c.json({ error: 'name produces empty slug' }, 400)

  const [existing] = await db.select().from(tags).where(eq(tags.id, id))
  if (existing) {
    id = `${id}-${Math.random().toString(36).slice(2, 4)}`
  }

  await db.insert(tags).values({ id, name: body.name.trim(), color: body.color })
  const [created] = await db.select().from(tags).where(eq(tags.id, id))
  return c.json({ ...created, task_count: 0 }, 201)
})

// PATCH /api/tags/:id — update name and/or color
tagsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const [existing] = await db.select().from(tags).where(eq(tags.id, id))
  if (!existing) return c.json({ error: 'Tag not found' }, 404)

  const body = await c.req.json<{ name?: string; color?: string }>()
  const update: Partial<typeof tags.$inferInsert> = {}
  if (body.name !== undefined) update.name = body.name.trim()
  if (body.color !== undefined) update.color = body.color
  if (Object.keys(update).length === 0) return c.json({ error: 'Nothing to update' }, 400)

  await db.update(tags).set(update).where(eq(tags.id, id))
  const [updated] = await db.select().from(tags).where(eq(tags.id, id))

  const countRes = await db.execute(
    sql`SELECT COUNT(id)::int AS task_count FROM tasks WHERE ${id} = ANY(tags)`
  )
  return c.json({ ...updated, task_count: (countRes.rows[0] as any).task_count })
})

// DELETE /api/tags/:id — delete and cascade-remove from tasks
tagsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const [existing] = await db.select().from(tags).where(eq(tags.id, id))
  if (!existing) return c.json({ error: 'Tag not found' }, 404)

  await db.execute(
    sql`UPDATE tasks SET tags = array_remove(tags, ${id}) WHERE ${id} = ANY(tags)`
  )
  await db.delete(tags).where(eq(tags.id, id))

  return c.body(null, 204)
})
