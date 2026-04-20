# Tags Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tags dynamic (stored in DB) and add a Tags management page in the sidebar where users can create, rename, recolor, and delete tags.

**Architecture:** New `tags` DB table (id = slug, name, color). Tags API routes (GET/POST/PATCH/DELETE). Frontend hooks via TanStack Query. TagsView component rendered when `view === 'tags'`. Tag display components (TagChip/TagDot/TagHash) and task-editor switch from the static `TAGS` constant to `useTags()`.

**Tech Stack:** Drizzle ORM + PostgreSQL, Hono, React 18, TanStack Query v5, TypeScript

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `server/db/schema.ts` | Modify | Add `tags` table |
| `server/db/seed.ts` | Create | One-time seed of 6 existing tags |
| `server/routes/tags.ts` | Create | CRUD + cascade delete API |
| `server/index.ts` | Modify | Mount `/api/tags` route |
| `src/lib/types.ts` | Modify | Add `Tag` type, extend `View` |
| `src/lib/constants.ts` | Modify | Add `PRESET_COLORS`, remove `TAGS` |
| `src/lib/api.ts` | Modify | Add tag fetch/create/update/delete functions |
| `src/hooks/use-tags.ts` | Create | `useTags`, `useCreateTag`, `useUpdateTag`, `useDeleteTag` |
| `src/components/sidebar.tsx` | Modify | Add Tags nav button |
| `src/components/views.tsx` | Modify | Add `TagsView` component |
| `src/components/app.tsx` | Modify | Render `TagsView` when `view === 'tags'` |
| `src/components/task-components.tsx` | Modify | TagChip/TagDot/TagHash use `useTags()` |
| `src/components/task-editor.tsx` | Modify | Tag picker uses `useTags()` |

---

## Task 1: DB Schema — Add `tags` Table

**Files:**
- Modify: `server/db/schema.ts`

- [ ] **Step 1: Add `tags` table to schema**

Open `server/db/schema.ts`. Add the `tags` table after the existing imports:

```typescript
import { pgTable, text, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core'

export const tags = pgTable('tags', {
  id:    text('id').primaryKey(),   // slug: 'work', 'my-tag'
  name:  text('name').notNull(),
  color: text('color').notNull(),   // 'oklch(0.82 0.13 90)'
})

export const tasks = pgTable('tasks', {
  // ... (unchanged — tasks.tags[] already stores tag slugs)
```

- [ ] **Step 2: Generate migration**

```bash
npm run db:generate
```

Expected: new `.sql` file created in `server/db/migrations/`.

- [ ] **Step 3: Apply migration**

```bash
npm run db:migrate
```

Expected: `tags` table created. No errors.

- [ ] **Step 4: Create seed script**

Create `server/db/seed.ts`:

```typescript
import { db } from './client.js'
import { tags } from './schema.js'

const SEED_TAGS = [
  { id: 'work',     name: 'work',     color: 'oklch(0.82 0.13 90)' },
  { id: 'personal', name: 'personal', color: 'oklch(0.82 0.13 150)' },
  { id: 'urgent',   name: 'urgent',   color: 'oklch(0.82 0.13 30)' },
  { id: 'focus',    name: 'focus',    color: 'oklch(0.82 0.13 260)' },
  { id: 'health',   name: 'health',   color: 'oklch(0.82 0.13 200)' },
  { id: 'errand',   name: 'errand',   color: 'oklch(0.82 0.13 340)' },
]

await db.insert(tags).values(SEED_TAGS).onConflictDoNothing()
console.log('Seeded', SEED_TAGS.length, 'tags')
process.exit(0)
```

- [ ] **Step 5: Run seed**

```bash
npx tsx server/db/seed.ts
```

Expected: `Seeded 6 tags`

- [ ] **Step 6: Commit**

```bash
git add server/db/schema.ts server/db/seed.ts server/db/migrations/
git commit -m "feat: add tags table and seed existing 6 tags"
```

---

## Task 2: Server Routes — Tags CRUD API

**Files:**
- Create: `server/routes/tags.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: Create `server/routes/tags.ts`**

```typescript
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

  // Conflict: append random suffix
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

  // Remove tag from all tasks first
  await db.execute(
    sql`UPDATE tasks SET tags = array_remove(tags, ${id}) WHERE ${id} = ANY(tags)`
  )
  await db.delete(tags).where(eq(tags.id, id))

  return c.body(null, 204)
})
```

- [ ] **Step 2: Mount route in `server/index.ts`**

Add after the existing `import { tasksRouter }` line:

```typescript
import { tagsRouter } from './routes/tags.js'
```

Add after `app.route('/api/tasks', tasksRouter)`:

```typescript
app.route('/api/tags', tagsRouter)
```

- [ ] **Step 3: Verify server starts**

```bash
npm run dev
```

Expected: server starts. Then test in another terminal:

```bash
curl http://localhost:3000/api/tags
```

Expected: JSON array with 6 tags and task_count fields.

- [ ] **Step 4: Commit**

```bash
git add server/routes/tags.ts server/index.ts
git commit -m "feat: add tags CRUD API with cascade delete"
```

---

## Task 3: Frontend Types, Constants, and API Client

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/constants.ts`
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Add `Tag` type and extend `View` in `src/lib/types.ts`**

Add after the existing imports/types at the top:

```typescript
export interface Tag {
  id: string
  name: string
  color: string
  task_count: number
}
```

Change the `View` type on line 25:

```typescript
export type View = 'week' | 'inbox' | 'tags'
```

- [ ] **Step 2: Update `src/lib/constants.ts`**

Replace the `TAGS` block (lines 1-9) with:

```typescript
export const PRESET_COLORS: string[] = [
  'oklch(0.82 0.13 90)',
  'oklch(0.82 0.13 150)',
  'oklch(0.82 0.13 30)',
  'oklch(0.82 0.13 260)',
  'oklch(0.82 0.13 200)',
  'oklch(0.82 0.13 340)',
  'oklch(0.82 0.13 0)',
  'oklch(0.82 0.13 310)',
  'oklch(0.82 0.13 180)',
]
```

Remove the old `TAGS` constant entirely — it will be replaced by `useTags()`.

- [ ] **Step 3: Add tag functions to `src/lib/api.ts`**

Add `Tag` to the import at the top:

```typescript
import type { Task, Tag } from './types'
```

Append at the end of the file:

```typescript
export async function fetchTags(signal?: AbortSignal): Promise<Tag[]> {
  const res = await fetch(`${BASE}/tags`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch tags: ${res.status}`)
  return res.json()
}

export async function createTag(data: { name: string; color: string }): Promise<Tag> {
  const res = await fetch(`${BASE}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to create tag: ${res.status}`)
  return res.json()
}

export async function updateTag(
  id: string,
  data: { name?: string; color?: string }
): Promise<Tag> {
  const res = await fetch(`${BASE}/tags/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to update tag: ${res.status}`)
  return res.json()
}

export async function deleteTag(id: string): Promise<void> {
  const res = await fetch(`${BASE}/tags/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete tag: ${res.status}`)
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts src/lib/api.ts
git commit -m "feat: add Tag type, PRESET_COLORS, and tag API client functions"
```

---

## Task 4: Frontend Hooks — `use-tags.ts`

**Files:**
- Create: `src/hooks/use-tags.ts`

- [ ] **Step 1: Create `src/hooks/use-tags.ts`**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../lib/api'
import type { Tag } from '../lib/types'

export const tagKeys = {
  all: () => ['tags'] as const,
}

export function useTags() {
  return useQuery({
    queryKey: tagKeys.all(),
    queryFn: ({ signal }) => api.fetchTags(signal),
    staleTime: 60_000,
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color: string }) => api.createTag(data),
    onSuccess: (newTag) => {
      qc.setQueryData<Tag[]>(tagKeys.all(), (old = []) => [...old, newTag])
    },
  })
}

export function useUpdateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; color?: string } }) =>
      api.updateTag(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: tagKeys.all() })
      const snapshot = qc.getQueryData<Tag[]>(tagKeys.all())
      qc.setQueryData<Tag[]>(tagKeys.all(), (old = []) =>
        old.map((t) => (t.id === id ? { ...t, ...data } : t))
      )
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(tagKeys.all(), ctx.snapshot)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tagKeys.all() }),
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteTag(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: tagKeys.all() })
      const snapshot = qc.getQueryData<Tag[]>(tagKeys.all())
      qc.setQueryData<Tag[]>(tagKeys.all(), (old = []) => old.filter((t) => t.id !== id))
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(tagKeys.all(), ctx.snapshot)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: tagKeys.all() })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to the new file.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-tags.ts
git commit -m "feat: add useTags, useCreateTag, useUpdateTag, useDeleteTag hooks"
```

---

## Task 5: `TagsView` Component

**Files:**
- Modify: `src/components/views.tsx`

- [ ] **Step 1: Update imports at the top of `src/components/views.tsx`**

Change the existing first line from:
```typescript
import React, { useMemo } from 'react'
```
To:
```typescript
import React, { useMemo, useState } from 'react'
```

Then in the existing constants import line, add `PRESET_COLORS`:
```typescript
import { MONTH_PT, DAY_NAMES_PT, isoDate, sameDay, addDays, PRESET_COLORS } from '../lib/constants'
```

Add after the existing type import line:
```typescript
import type { Tag } from '../lib/types'
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '../hooks/use-tags'
```

- [ ] **Step 2: Add `TagsView` component at the bottom of `src/components/views.tsx`**

```typescript
// ---- TagsView ----

interface TagRowIdleProps {
  tag: Tag
  onEdit: () => void
  onConfirmDelete: () => void
}

function TagRowIdle({ tag, onEdit, onConfirmDelete }: TagRowIdleProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 10,
      background: 'var(--bg-raised)',
      boxShadow: '0 0 0 1px var(--line)',
    }}>
      <span style={{
        width: 12, height: 12, borderRadius: 9999,
        background: tag.color, flexShrink: 0,
      }} />
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
        #{tag.name}
      </span>
      <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
        {tag.task_count} {tag.task_count === 1 ? 'tarefa' : 'tarefas'}
      </span>
      <button className="ghost-btn" onClick={onEdit}
        style={{ fontSize: 12, padding: '4px 10px', color: 'var(--ink-soft)' }}>
        Editar
      </button>
      <button className="ghost-btn" onClick={onConfirmDelete}
        style={{ fontSize: 12, padding: '4px 10px', color: '#c0392b' }}>
        Deletar
      </button>
    </div>
  )
}

interface TagRowEditingProps {
  tag: Tag
  onSave: (name: string, color: string) => void
  onCancel: () => void
}

function TagRowEditing({ tag, onSave, onCancel }: TagRowEditingProps) {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 10,
      background: 'var(--bg-raised)',
      boxShadow: '0 0 0 2px var(--accent)',
    }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
        <span style={{
          width: 12, height: 12, borderRadius: 9999,
          background: color, flexShrink: 0,
        }} />
        {PRESET_COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)} style={{
            width: 16, height: 16, borderRadius: 9999,
            background: c, border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
            boxShadow: c === color ? '0 0 0 2px var(--bg-raised), 0 0 0 3px ' + c : 'none',
          }} />
        ))}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(name, color)
          if (e.key === 'Escape') onCancel()
        }}
        style={{
          flex: 1, fontSize: 14, fontWeight: 500,
          border: 'none', background: 'none', outline: 'none',
          color: 'var(--ink)', minWidth: 0,
        }}
        autoFocus
      />
      <button className="pill-btn" onClick={() => onSave(name, color)}
        style={{ fontSize: 12, padding: '4px 12px' }}>
        Salvar
      </button>
      <button className="ghost-btn" onClick={onCancel}
        style={{ fontSize: 12, padding: '4px 10px', color: 'var(--ink-soft)' }}>
        Cancelar
      </button>
    </div>
  )
}

interface TagRowDeleteProps {
  tag: Tag
  onConfirm: () => void
  onCancel: () => void
}

function TagRowDelete({ tag, onConfirm, onCancel }: TagRowDeleteProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 10,
      background: '#fff5f5',
      boxShadow: '0 0 0 1px #fecaca',
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span style={{ flex: 1, fontSize: 13, color: '#c0392b' }}>
        Deletar <strong>#{tag.name}</strong>?
        {tag.task_count > 0 && (
          <> Será removida de <strong>{tag.task_count} {tag.task_count === 1 ? 'tarefa' : 'tarefas'}</strong>.</>
        )}
      </span>
      <button className="ghost-btn" onClick={onConfirm}
        style={{ fontSize: 12, padding: '4px 10px', background: '#c0392b', color: 'white', borderRadius: 6 }}>
        Confirmar
      </button>
      <button className="ghost-btn" onClick={onCancel}
        style={{ fontSize: 12, padding: '4px 10px', color: 'var(--ink-soft)' }}>
        Cancelar
      </button>
    </div>
  )
}

function NewTagRow() {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const createTag = useCreateTag()

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    createTag.mutate({ name: trimmed, color }, {
      onSuccess: () => { setName(''); setColor(PRESET_COLORS[0]) },
    })
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 10,
      background: 'var(--bg-sunken)',
      border: '1px dashed var(--line-strong)',
      marginTop: 4,
    }}>
      <span style={{
        width: 12, height: 12, borderRadius: 9999,
        background: color, flexShrink: 0,
      }} />
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {PRESET_COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)} style={{
            width: 16, height: 16, borderRadius: 9999,
            background: c, border: 'none', cursor: 'pointer', padding: 0,
            boxShadow: c === color ? '0 0 0 2px var(--bg-sunken), 0 0 0 3px ' + c : 'none',
          }} />
        ))}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        placeholder="nome da nova tag..."
        style={{
          flex: 1, fontSize: 14,
          border: 'none', background: 'none', outline: 'none',
          color: 'var(--ink)', minWidth: 0,
        }}
      />
      <button
        className="pill-btn"
        onClick={submit}
        disabled={!name.trim() || createTag.isPending}
        style={{ fontSize: 12, padding: '4px 12px', opacity: name.trim() ? 1 : 0.4 }}>
        Criar
      </button>
    </div>
  )
}

export function TagsView() {
  const { data: tags = [], isLoading } = useTags()
  const updateTag = useUpdateTag()
  const deleteTag = useDeleteTag()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const totalTasks = tags.reduce((sum, t) => sum + t.task_count, 0)

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ink-mute)', fontSize: 14 }}>
        Carregando...
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', margin: '0 0 2px' }}>
            Tags
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-mute)', margin: 0 }}>
            {tags.length} {tags.length === 1 ? 'tag' : 'tags'} · {totalTasks} {totalTasks === 1 ? 'tarefa' : 'tarefas'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {tags.map((tag) => {
          if (confirmDeleteId === tag.id) {
            return (
              <TagRowDelete
                key={tag.id}
                tag={tag}
                onConfirm={() => {
                  deleteTag.mutate(tag.id)
                  setConfirmDeleteId(null)
                }}
                onCancel={() => setConfirmDeleteId(null)}
              />
            )
          }
          if (editingId === tag.id) {
            return (
              <TagRowEditing
                key={tag.id}
                tag={tag}
                onSave={(name, color) => {
                  updateTag.mutate({ id: tag.id, data: { name, color } })
                  setEditingId(null)
                }}
                onCancel={() => setEditingId(null)}
              />
            )
          }
          return (
            <TagRowIdle
              key={tag.id}
              tag={tag}
              onEdit={() => { setConfirmDeleteId(null); setEditingId(tag.id) }}
              onConfirmDelete={() => { setEditingId(null); setConfirmDeleteId(tag.id) }}
            />
          )
        })}

        <NewTagRow />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/views.tsx
git commit -m "feat: add TagsView component with inline CRUD and delete confirmation"
```

---

## Task 6: Sidebar — Tags Navigation Button

**Files:**
- Modify: `src/components/sidebar.tsx`

- [ ] **Step 1: Add Hash icon near top of `src/components/sidebar.tsx`**

Find the existing icon components (look for `IconWeek`, `IconInbox`). Add after them:

```typescript
function IconHash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9"/>
      <line x1="4" y1="15" x2="20" y2="15"/>
      <line x1="10" y1="3" x2="8" y2="21"/>
      <line x1="16" y1="3" x2="14" y2="21"/>
    </svg>
  )
}
```

- [ ] **Step 2: Add Tags `ViewButton` in the navigation section**

Find the navigation section in the `Sidebar` component (around line 282-295). Add a `ViewButton` for tags after `DroppableInboxButton`:

```typescript
<ViewButton
  collapsed={collapsed} icon={<IconHash />} label="Tags"
  active={view === 'tags'} onClick={() => onViewChange('tags')} accent={accent}
/>
```

- [ ] **Step 3: Verify TypeScript — `onViewChange` accepts `'tags'`**

Since `View` now includes `'tags'` (from Task 3), the `onViewChange: (view: View) => void` prop type will accept `'tags'` automatically.

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "feat: add Tags nav button to sidebar"
```

---

## Task 7: Wire Up `TagsView` in `app.tsx`

**Files:**
- Modify: `src/components/app.tsx`

- [ ] **Step 1: Add `TagsView` to the import in `src/components/app.tsx`**

Find the existing import from `./views`:

```typescript
import { WeekView, ListView } from './views'
```

Change to:

```typescript
import { WeekView, ListView, TagsView } from './views'
```

- [ ] **Step 2: Add `TagsView` to the render output**

In the JSX return of `App`, find where `WeekView` and `ListView` are conditionally rendered. Add:

```typescript
{view === 'tags' && <TagsView />}
```

Place it alongside the other view conditionals (the exact location depends on the JSX structure — it should be inside the main content area, a sibling of `WeekView`/`ListView`).

- [ ] **Step 3: Check app compiles and runs**

```bash
npm run dev
```

Open http://localhost:5173, click the `#` Tags button in the sidebar. Expected: Tags page renders with 6 tags.

- [ ] **Step 4: Commit**

```bash
git add src/components/app.tsx
git commit -m "feat: render TagsView when view is tags"
```

---

## Task 8: Update Tag Display Components

**Files:**
- Modify: `src/components/task-components.tsx`

- [ ] **Step 1: Update imports in `src/components/task-components.tsx`**

The current constants import is: `import { TAGS, startOfWeek } from '../lib/constants'`

Change it to (remove TAGS, keep startOfWeek):
```typescript
import { startOfWeek } from '../lib/constants'
```

Then add after the existing hook imports:
```typescript
import { useTags } from '../hooks/use-tags'
```

- [ ] **Step 2: Update `TagChip`**

Replace:

```typescript
export function TagChip({ tag }: { tag: string }) {
  const t = TAGS[tag]
  if (!t) return null
  return (
    <span style={{...}}>
      <span style={{ width: 6, height: 6, borderRadius: 9999, background: t.color, flexShrink: 0 }}/>
      {t.label}
    </span>
  )
}
```

With:

```typescript
export function TagChip({ tag }: { tag: string }) {
  const { data: tags = [] } = useTags()
  const t = tags.find((t) => t.id === tag)
  if (!t) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px 2px 6px',
      borderRadius: 9999,
      background: 'var(--bg-sunken)',
      boxShadow: 'inset 0 0 0 1px var(--line)',
      color: 'var(--ink-soft)',
      fontSize: 11, fontWeight: 600,
      letterSpacing: '-0.01em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 9999, background: t.color, flexShrink: 0 }}/>
      {t.name}
    </span>
  )
}
```

- [ ] **Step 3: Update `TagDot`**

Replace:

```typescript
export function TagDot({ tag }: { tag: string }) {
  const t = TAGS[tag]
  if (!t) return null
  return (
    <span title={t.label} style={{...}} />
  )
}
```

With:

```typescript
export function TagDot({ tag }: { tag: string }) {
  const { data: tags = [] } = useTags()
  const t = tags.find((t) => t.id === tag)
  if (!t) return null
  return (
    <span
      title={t.name}
      style={{
        display: 'inline-block',
        width: 8, height: 8, borderRadius: 9999,
        background: t.color,
        boxShadow: '0 0 0 1.5px var(--bg)',
      }}
    />
  )
}
```

- [ ] **Step 4: Update `TagHash`**

Replace:

```typescript
export function TagHash({ tag }: { tag: string }) {
  const t = TAGS[tag]
  if (!t) return null
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: t.color, letterSpacing: '-0.01em' }}>
      #{t.label}
    </span>
  )
}
```

With:

```typescript
export function TagHash({ tag }: { tag: string }) {
  const { data: tags = [] } = useTags()
  const t = tags.find((t) => t.id === tag)
  if (!t) return null
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: t.color, letterSpacing: '-0.01em' }}>
      #{t.name}
    </span>
  )
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/task-components.tsx
git commit -m "feat: update TagChip/TagDot/TagHash to use dynamic tags from DB"
```

---

## Task 9: Update Task Editor

**Files:**
- Modify: `src/components/task-editor.tsx`

- [ ] **Step 1: Replace `TAGS` import with `useTags`**

Remove:

```typescript
import { TAGS } from '../lib/constants'
```

Add:

```typescript
import { useTags } from '../hooks/use-tags'
```

- [ ] **Step 2: Add `useTags()` call inside the editor component**

Find the `TaskEditor` component function. Add near the top of the function body:

```typescript
const { data: allTags = [] } = useTags()
```

- [ ] **Step 3: Replace the tag picker section**

Find (around line 271-290):

```typescript
<EditorSection label="Tags">
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    {Object.entries(TAGS).map(([key, tag]) => {
      const active = draft.tags.includes(key)
      return (
        <button key={key} onClick={() => toggleTag(key)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 9999,
          border: active ? '1.5px solid var(--ink)' : '1.5px solid var(--line-strong)',
          background: active ? 'var(--bg-sunken)' : 'transparent',
          color: 'var(--ink)', fontSize: 12, fontWeight: 500,
          letterSpacing: '-0.01em', cursor: 'pointer',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: tag.color, flexShrink: 0 }} />
          {tag.label}
        </button>
      )
    })}
  </div>
</EditorSection>
```

Replace with:

```typescript
<EditorSection label="Tags">
  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
    {allTags.map((tag) => {
      const active = draft.tags.includes(tag.id)
      return (
        <button key={tag.id} onClick={() => toggleTag(tag.id)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 9999,
          border: active ? '1.5px solid var(--ink)' : '1.5px solid var(--line-strong)',
          background: active ? 'var(--bg-sunken)' : 'transparent',
          color: 'var(--ink)', fontSize: 12, fontWeight: 500,
          letterSpacing: '-0.01em', cursor: 'pointer',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: tag.color, flexShrink: 0 }} />
          {tag.name}
        </button>
      )
    })}
  </div>
</EditorSection>
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/task-editor.tsx
git commit -m "feat: task editor tag picker uses dynamic tags from DB"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: build succeeds with no TypeScript or Vite errors.

- [ ] **Step 2: Dev server smoke test**

```bash
npm run dev
```

Open http://localhost:5173. Verify:

1. Sidebar shows `#` icon. Clicking opens Tags page.
2. 6 tags appear with correct colors and task counts.
3. Edit a tag: click Editar, change name/color, Salvar → updates in list, tag display in task rows updates color immediately.
4. Create tag: type name, pick color, Enter or Criar → appears in list.
5. Delete tag with tasks: warning shows count, Confirmar → removed from list and from task rows.
6. Delete tag with 0 tasks: warning shows "0 tarefas", Confirmar works.
7. Task editor (open any task) shows current DB tags as toggle pills.
8. InlineAdd `#tagname` parsing still works — try typing `#work` in any task input.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup — remove unused TAGS references"
```
