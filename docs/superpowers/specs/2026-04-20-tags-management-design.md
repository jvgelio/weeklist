# Tags Management — Design Spec

## Context

Tags are currently hardcoded in `src/lib/constants.ts` (6 static entries: work, personal, urgent, focus, health, errand). Users cannot create, rename, or delete tags from the UI. This spec adds a Tags management page accessible from the sidebar, making tags fully dynamic and stored in the database.

---

## Decisions

| Question | Decision |
|---|---|
| Tag scope | Full CRUD — create, rename, recolor, delete |
| Tag color selection | Preset palette of 9 oklch colors |
| On delete | Warn with task count, confirm → cascade remove from tasks |
| Tags page behavior | Pure management — no task filtering |

---

## Architecture

### Database

New table in `server/db/schema.ts`:

```typescript
export const tags = pgTable('tags', {
  id:    text('id').primaryKey(),    // slug: 'work', 'personal'
  name:  text('name').notNull(),
  color: text('color').notNull(),    // 'oklch(0.82 0.13 90)'
})
```

- `tasks.tags[]` already stores tag slugs → **no task data migration needed**
- First migration seeds the 6 existing tags from constants

### API — `server/routes/tags.ts` (new file)

| Verb | Path | Description |
|---|---|---|
| GET | `/api/tags` | List all tags with task count per tag |
| POST | `/api/tags` | Create tag (`{ name, color }`) — server generates id |
| PATCH | `/api/tags/:id` | Update name and/or color |
| DELETE | `/api/tags/:id` | Delete + `array_remove` from all tasks |

**ID generation:** `id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')`. If slug conflicts with existing tag, append 2-char random suffix (e.g. `work-3f`). ID never changes after creation — rename only updates `name`.

Task count included in GET response via JOIN:
```sql
SELECT t.id, t.name, t.color, COUNT(tasks.id) as task_count
FROM tags t LEFT JOIN tasks ON t.id = ANY(tasks.tags)
GROUP BY t.id
```

Cascade delete:
```sql
UPDATE tasks SET tags = array_remove(tags, $1) WHERE $1 = ANY(tags)
```

### Frontend Hooks — `src/hooks/use-tags.ts` (new file)

- `useTags()` → `useQuery(['tags'])` → `Tag[]` with task_count
- `useCreateTag()` → optimistic insert
- `useUpdateTag()` → optimistic update
- `useDeleteTag()` → onSettled invalidates `['tags']` + `['tasks']`

### Type Changes — `src/lib/types.ts`

```typescript
export type Tag = { id: string; name: string; color: string; taskCount: number }
export type View = 'week' | 'inbox' | 'tags'   // add 'tags'
```

### Constants — `src/lib/constants.ts`

Replace `TAGS` object with:
```typescript
export const PRESET_COLORS: string[] = [
  'oklch(0.82 0.13 90)',   // lime
  'oklch(0.82 0.13 150)',  // green
  'oklch(0.82 0.13 30)',   // orange
  'oklch(0.82 0.13 260)',  // purple
  'oklch(0.82 0.13 200)',  // cyan
  'oklch(0.82 0.13 340)',  // pink
  'oklch(0.82 0.13 0)',    // crimson
  'oklch(0.82 0.13 310)',  // magenta
  'oklch(0.82 0.13 180)',  // teal
]

export const SEED_TAGS = [
  { id: 'work',     name: 'work',     color: PRESET_COLORS[0] },
  { id: 'personal', name: 'personal', color: PRESET_COLORS[1] },
  { id: 'urgent',   name: 'urgent',   color: PRESET_COLORS[2] },
  { id: 'focus',    name: 'focus',    color: PRESET_COLORS[3] },
  { id: 'health',   name: 'health',   color: PRESET_COLORS[4] },
  { id: 'errand',   name: 'errand',   color: PRESET_COLORS[5] },
]
```

### NL Parse — `src/lib/nl-parse.ts`

`parseNL(text, tags)` receives a `Tag[]` instead of reading from static `TAGS`. `InlineAdd` passes `useTags()` result.

---

## UI Components

### Sidebar — `src/components/sidebar.tsx`

Add `ViewButton` for `'tags'` after Inbox, using `Hash` icon from lucide-react.

### TagsView — `src/components/views.tsx`

New component rendered when `view === 'tags'`:

**Layout:**
- Header: "Tags" title + task total + "+ Nova tag" pill button
- List of tag rows (one per tag):
  - Color dot, `#name`, task count, Editar/Deletar buttons
  - Edit mode: inline color palette dots + name input + Salvar/Cancelar
  - Delete mode: inline warning bar with count + Confirmar/Cancelar
- New tag form: always-visible dashed row at bottom with name input + color palette + Criar button

**States per row:** `idle | editing | confirm-delete`

### Task Editor — `src/components/task-editor.tsx`

Replace `Object.entries(TAGS)` with `useTags()` result.

### TagChip / TagDot / TagHash — `src/components/task-components.tsx`

These currently read `TAGS[key].color`. Replace with `useTags()` inside each component (TanStack Query deduplicates — same cache, zero extra fetch).

### App — `src/components/app.tsx`

Add `view === 'tags'` branch to render `<TagsView />`.

---

## Migration Steps

```bash
# 1. Edit server/db/schema.ts (add tags table)
npm run db:generate   # generates SQL
npm run db:migrate    # applies + seeds 6 existing tags
```

Seed SQL included in migration:
```sql
INSERT INTO tags (id, name, color) VALUES
  ('work',     'work',     'oklch(0.82 0.13 90)'),
  ('personal', 'personal', 'oklch(0.82 0.13 150)'),
  ('urgent',   'urgent',   'oklch(0.82 0.13 30)'),
  ('focus',    'focus',    'oklch(0.82 0.13 260)'),
  ('health',   'health',   'oklch(0.82 0.13 200)'),
  ('errand',   'errand',   'oklch(0.82 0.13 340)')
ON CONFLICT DO NOTHING;
```

---

## Verification

1. `npm run dev` — app starts without errors
2. Sidebar shows `#` icon; clicking opens Tags page
3. All 6 existing tags appear with correct colors and task counts
4. Create tag: type name, pick color, click Criar → appears in list
5. Edit tag: click Editar, change name/color, Salvar → updates in list + task rows update color
6. Delete tag with tasks: warning shows correct count, Confirmar → tag gone from list + removed from affected tasks
7. Delete tag with 0 tasks: warning shows "0 tarefas", Confirmar works
8. InlineAdd `#` parsing still works with dynamic tags
9. Task editor tag picker shows current DB tags
