import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { users, tasks } from '../db/schema.js'
import { getAuthUser } from './auth.js'
import { migrateSlot } from '../../src/lib/slot-utils.js'
import type { SlotPrefs } from '../../src/lib/slot-utils.js'

export const settingsRouter = new Hono()

settingsRouter.patch('/slots', async (c) => {
  const user = await getAuthUser(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json<{ am: boolean; pm: boolean; eve: boolean }>()
  const newPrefs: SlotPrefs = {
    am: Boolean(body.am),
    pm: Boolean(body.pm),
    eve: Boolean(body.eve),
  }

  const updatedUser = await db.transaction(async (tx) => {
    const [updated] = await tx.update(users)
      .set({ slotAm: newPrefs.am, slotPm: newPrefs.pm, slotEve: newPrefs.eve })
      .where(eq(users.id, user.id))
      .returning()

    const allUserTasks = await tx.select({ id: tasks.id, slot: tasks.slot, bucketKey: tasks.bucketKey })
      .from(tasks)
      .where(eq(tasks.userId, user.id))

    const dateTasks = allUserTasks.filter(t => !t.bucketKey.startsWith('__'))

    for (const task of dateTasks) {
      const newSlot = migrateSlot(task.slot, newPrefs)
      if (newSlot !== task.slot) {
        await tx.update(tasks)
          .set({ slot: newSlot })
          .where(eq(tasks.id, task.id))
      }
    }

    return updated
  })

  return c.json({ user: updatedUser })
})

settingsRouter.patch('/display', async (c) => {
  const user = await getAuthUser(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json<{ darkMode?: boolean; showWeekend?: boolean; dimPastDays?: boolean }>()
  const updates: Record<string, boolean> = {}
  if (body.darkMode !== undefined) updates.darkMode = Boolean(body.darkMode)
  if (body.showWeekend !== undefined) updates.showWeekend = Boolean(body.showWeekend)
  if (body.dimPastDays !== undefined) updates.dimPastDays = Boolean(body.dimPastDays)

  const [updatedUser] = await db.update(users)
    .set(updates)
    .where(eq(users.id, user.id))
    .returning()

  return c.json({ user: updatedUser })
})
