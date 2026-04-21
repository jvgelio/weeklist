import { pgTable, text, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  googleId: text('google_id').unique().notNull(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
})

export const tags = pgTable('tags', {
  id: text('id').primaryKey(),   // slug: 'work', 'my-tag'
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull(),   // 'oklch(0.82 0.13 90)'
})

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  done: boolean('done').default(false).notNull(),
  bucketKey: text('bucket_key').notNull(), // ISO date "2026-04-18", "__inbox", "__someday"
  slot: text('slot'), // "am" | "pm"
  priority: text('priority'), // "high" | "med" | "low" | null
  recurring: text('recurring'), // "daily" | "weekly" | "monthly" | null
  tags: text('tags').array().default([]).notNull(),
  note: text('note'),
  position: integer('position').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(), // must be set manually on UPDATE
}, (table) => ({
  bucketPositionIdx: index('tasks_bucket_key_position_idx').on(table.bucketKey, table.position),
  bucketOnlyIdx: index('tasks_bucket_key_idx').on(table.bucketKey),
  userIdx: index('tasks_user_id_idx').on(table.userId),
}))

export const subtasks = pgTable('subtasks', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  done: boolean('done').default(false).notNull(),
  position: integer('position').notNull(),
}, (table) => ({
  taskPositionIdx: index('subtasks_task_id_position_idx').on(table.taskId, table.position),
}))
