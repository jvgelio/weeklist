import { pgTable, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core'

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  done: boolean('done').default(false).notNull(),
  bucketKey: text('bucket_key').notNull(), // ISO date "2026-04-18", "__inbox", "__someday"
  slot: text('slot'),                      // "am" | "pm"
  priority: text('priority'),              // "high" | "med" | "low" | null
  recurring: text('recurring'),            // "daily" | "weekly" | "monthly" | null
  tags: text('tags').array().default([]).notNull(),
  note: text('note'),
  position: integer('position').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const subtasks = pgTable('subtasks', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  done: boolean('done').default(false).notNull(),
  position: integer('position').notNull(),
})
