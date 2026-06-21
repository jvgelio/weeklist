# Contextual Task Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace repeated inline add rows in the weekly columns with large contextual creation zones while preserving the global QuickAdd route.

**Architecture:** Add a focused `ContextualTaskAdd` component that owns input, natural-language parsing, async error recovery, and motion. `WeekView` owns the single active target across weekday and weekend columns; `App` owns persistence through `useCreateTask().mutateAsync` and continues to own global QuickAdd visibility.

**Tech Stack:** React 18, TypeScript, Framer Motion, dnd-kit, TanStack Query v5, Vitest 4, Testing Library.

---

## Scope and success

Implement [the approved UX spec](../../specs/2026-06-21-contextual-task-creation-design.md) only for `DayColumn`, including weekend columns. Keep `DayRow`, Inbox, Weeklist, and the mobile `quiet` variant unchanged. The visible global action must work in every weekly variant, including mobile.

The work is complete when:

- columns contain no permanently visible `Adicionar tarefa` row;
- every enabled slot exposes one large, accessible contextual zone;
- explicit natural-language date or slot overrides inherited context;
- one composer is open at a time without discarding another target's draft;
- active drag suppresses creation affordances without disabling droppable parents;
- async errors keep the draft and allow retry;
- `Nova tarefa` and `Alt+Q` open the existing `QuickAdd`;
- tests, typecheck, build, and visual checks pass.

## File map

- Create `src/components/contextual-task-add.tsx`: contextual idle, hover/focus, editing, submitting, error, and motion states.
- Create `src/components/contextual-task-add.test.tsx`: component behavior and payload contract.
- Create `src/components/day-row.test.tsx`: column integration, slot coverage, active-target coordination, and drag suppression.
- Create `src/components/views.test.tsx`: global weekly action and active-target coordination at view level.
- Modify `src/lib/types.ts`: shared `ContextualTaskCreateParams` contract.
- Modify `src/components/day-row.tsx`: replace only `DayColumn` add rows and pass the contract through weekend columns.
- Modify `src/components/views.tsx`: own the active contextual target and expose the global action.
- Modify `src/components/app.tsx`: create contextual tasks asynchronously and wire the global action and drag state.
- Modify `src/hooks/use-tasks.ts`: make optimistic task metadata match the submitted contextual payload.
- Create `src/hooks/use-tasks.test.tsx`: verify optimistic metadata and rollback behavior.
- Modify this plan at completion, then move it to `docs/plans/completed/`.

### Task 1: Build the contextual composer contract and behavior

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/components/contextual-task-add.tsx`
- Create: `src/components/contextual-task-add.test.tsx`

- [ ] **Step 1: Add the shared creation payload type**

Append this contract to `src/lib/types.ts`:

```ts
export interface ContextualTaskCreateParams {
  title: string
  bucketKey: string
  slot: Slot
  priority: Priority | null
  recurring: Recurring | null
  tags: string[]
}
```

- [ ] **Step 2: Write failing tests for contextual behavior**

Create `src/components/contextual-task-add.test.tsx` with an inherited bucket deliberately different from the parsed date, plus a fixed `weekStart` and `slot="am"`. Cover these exact cases:

```tsx
// @vitest-environment jsdom

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, isoDate } from '../lib/constants'
import { ContextualTaskAdd } from './contextual-task-add'

afterEach(cleanup)

const weekStart = new Date(2026, 5, 22)

function renderAdd(overrides: Partial<React.ComponentProps<typeof ContextualTaskAdd>> = {}) {
  const onCreate = vi.fn().mockResolvedValue(undefined)
  const onOpen = vi.fn()
  const onClose = vi.fn()
  render(
    <ContextualTaskAdd
      bucketKey="2099-01-01"
      slot="am"
      weekStart={weekStart}
      accessibleLabel="Adicionar tarefa na segunda-feira de manha"
      open={false}
      disabled={false}
      onOpen={onOpen}
      onClose={onClose}
      onCreate={onCreate}
      {...overrides}
    />,
  )
  return { onCreate, onOpen, onClose }
}

describe('ContextualTaskAdd', () => {
  it('uses the whole idle zone without permanent visible copy', async () => {
    const { onOpen } = renderAdd()
    const zone = screen.getByRole('button', { name: 'Adicionar tarefa na segunda-feira de manha' })
    expect(zone.textContent).toBe('')
    await userEvent.setup().click(zone)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('inherits context and lets explicit natural language override it', async () => {
    const { onCreate } = renderAdd({ open: true })
    const input = screen.getByLabelText('Titulo da nova tarefa')
    const tomorrow = isoDate(addDays(new Date(), 1))
    await userEvent.setup().type(input, 'Revisar proposta tom de tarde p1 #work{enter}')
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({
      title: 'Revisar proposta',
      bucketKey: tomorrow,
      slot: 'pm',
      priority: 'high',
      recurring: null,
      tags: ['work'],
    }))
  })

  it('keeps the draft and exposes a recoverable error', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('network'))
    renderAdd({ open: true, onCreate })
    const input = screen.getByLabelText('Titulo da nova tarefa')
    await userEvent.setup().type(input, 'Preparar reuniao{enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('Nao foi possivel criar a tarefa. Tente novamente.')
    expect((input as HTMLInputElement).value).toBe('Preparar reuniao')
  })

  it('closes on empty blur but keeps a non-empty draft open', async () => {
    const empty = renderAdd({ open: true })
    fireEvent.blur(screen.getByLabelText('Titulo da nova tarefa'))
    expect(empty.onClose).toHaveBeenCalledTimes(1)

    cleanup()
    const filled = renderAdd({ open: true })
    const input = screen.getByLabelText('Titulo da nova tarefa')
    await userEvent.setup().type(input, 'Rascunho')
    fireEvent.blur(input)
    expect(filled.onClose).not.toHaveBeenCalled()
  })

  it('clears and closes with Escape', async () => {
    const { onClose } = renderAdd({ open: true })
    const input = screen.getByLabelText('Titulo da nova tarefa')
    await userEvent.setup().type(input, 'Descartar{escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

If `@testing-library/jest-dom` is not configured, replace `toHaveTextContent` with `expect(element.textContent).toContain(...)`; do not add a new dependency for one matcher.

- [ ] **Step 3: Run the component test and verify the red state**

Run:

```bash
npm test -- src/components/contextual-task-add.test.tsx
```

Expected: FAIL because `./contextual-task-add` does not exist.

- [ ] **Step 4: Implement `ContextualTaskAdd` minimally**

Create `src/components/contextual-task-add.tsx`. Use `AnimatePresence`, `motion`, and `useReducedMotion`; reuse `HighlightedInput` and `parseNL`. The component must implement this public API and resolution logic:

```tsx
interface ContextualTaskAddProps {
  bucketKey: string
  slot: Slot
  weekStart: Date
  accessibleLabel: string
  open: boolean
  disabled: boolean
  onOpen: () => void
  onClose: () => void
  onCreate: (params: ContextualTaskCreateParams) => Promise<void>
}

const SLOT_LABEL: Record<Slot, string> = {
  am: 'manha',
  pm: 'tarde',
  eve: 'noite',
}

function formatDestination(bucketKey: string, slot: Slot): string {
  const date = new Date(`${bucketKey}T00:00:00`)
  const label = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
  }).format(date)
  return `${label} · ${SLOT_LABEL[slot]}`
}
```

Inside the component, keep `value`, `submitting`, and `error` local. Do not clear `value` when `open` changes to `false`; this preserves a draft if another target becomes active. Clear it only after success or Escape.

```tsx
const today = useMemo(() => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}, [])
const parsed = useMemo(() => parseNL(value, today, weekStart), [today, value, weekStart])
const resolvedBucketKey = parsed.date ?? bucketKey
const resolvedSlot = parsed.slot ?? slot
const cleanTitle = parsed.cleanTitle || value.trim()

async function submit() {
  if (!cleanTitle || submitting) return
  setSubmitting(true)
  setError(null)
  try {
    await onCreate({
      title: cleanTitle,
      bucketKey: resolvedBucketKey,
      slot: resolvedSlot,
      priority: parsed.priority,
      recurring: parsed.recurring,
      tags: parsed.tags,
    })
    setValue('')
    onClose()
  } catch {
    setError('Nao foi possivel criar a tarefa. Tente novamente.')
  } finally {
    setSubmitting(false)
  }
}
```

Render the idle state as a `motion.button` with an `aria-label`, no visible text at rest, `minHeight: 44`, `flex: 1`, and `disabled={disabled}`. Reveal a child hint only under `whileHover="discover"` or `whileFocus="discover"`. Render the open state inside `AnimatePresence` with:

- `HighlightedInput` labeled `Titulo da nova tarefa`;
- autofocus through its `inputRef`;
- `Enter` calling `submit()`;
- `Escape` clearing the draft and calling `onClose()`;
- blur calling `onClose()` only when `value.trim()` is empty;
- a visible destination chip from `formatDestination(resolvedBucketKey, resolvedSlot)`;
- `role="alert"` for errors;
- `aria-busy={submitting}` and a disabled input during submission;
- opacity-only transitions when `useReducedMotion()` is true;
- duration between `0.14` and `0.22` seconds with `[0.25, 1, 0.5, 1]` easing.

Do not animate `height`, `minHeight`, padding, or other CSS layout properties. Use opacity plus `transform: translateY(...)` and let the open subtree take its final layout immediately.

- [ ] **Step 5: Run the focused test and typecheck**

Run:

```bash
npm test -- src/components/contextual-task-add.test.tsx
npm run typecheck
```

Expected: all contextual component tests PASS; client and config typechecks PASS.

- [ ] **Step 6: Commit the isolated component**

```bash
git add src/lib/types.ts src/components/contextual-task-add.tsx src/components/contextual-task-add.test.tsx
git commit -m "feat: add contextual task composer"
```

### Task 2: Integrate one controlled composer across all columns

**Files:**
- Modify: `src/components/day-row.tsx:204-403`
- Modify: `src/components/day-row.tsx:466-512`
- Modify: `src/components/views.tsx:295-482`
- Create: `src/components/day-row.test.tsx`

- [ ] **Step 1: Write a failing DayColumn integration test**

Create `src/components/day-row.test.tsx`. Render `DayColumn` inside `DndContext` with `slotPrefs={{ am: true, pm: true, eve: false }}` and a stateful harness for `activeCreateTarget`. Assert:

```tsx
expect(screen.queryByText('Adicionar tarefa')).toBeNull()
expect(screen.getAllByRole('button', { name: /Adicionar tarefa na/ })).toHaveLength(2)

await user.click(screen.getByRole('button', {
  name: 'Adicionar tarefa na segunda-feira de manha',
}))
expect(screen.getByLabelText('Titulo da nova tarefa')).toBeTruthy()

await user.click(screen.getByRole('button', {
  name: 'Adicionar tarefa na segunda-feira de tarde',
}))
expect(screen.getAllByLabelText('Titulo da nova tarefa')).toHaveLength(1)
```

Add a second case with `isDraggingTask={true}` and assert both zone buttons have `disabled === true` while the slot containers remain in the DOM with their existing dnd-kit refs.

Add a task fixture to a third case, click its visible title, and assert `onOpenTask` fires while `onActiveCreateTargetChange` does not. This is the regression test that prevents the large zone from intercepting task interaction.

- [ ] **Step 2: Run the DayColumn test and verify the red state**

Run:

```bash
npm test -- src/components/day-row.test.tsx
```

Expected: FAIL because `DayColumn` does not accept controlled contextual creation props and still renders `InlineAdd`.

- [ ] **Step 3: Extend `DayColumn` without changing row variants**

Add these props to `DayColumnProps`:

```ts
weekStart: Date
activeCreateTarget: string | null
onActiveCreateTargetChange: (target: string | null) => void
onCreateContextTask: (params: ContextualTaskCreateParams) => Promise<void>
isDraggingTask: boolean
```

Import `ContextualTaskAdd`, `ContextualTaskCreateParams`, and `Slot`. Add a small render helper inside `DayColumnComponent`:

```tsx
function renderContextualAdd(slot: Slot) {
  const target = `${key}:${slot}`
  return (
    <ContextualTaskAdd
      bucketKey={key}
      slot={slot}
      weekStart={weekStart}
      accessibleLabel={`Adicionar tarefa na ${DAY_NAMES_LONG_PT[dayIdx].toLowerCase()} de ${SLOT_LABEL[slot]}`}
      open={activeCreateTarget === target}
      disabled={isDraggingTask}
      onOpen={() => onActiveCreateTargetChange(target)}
      onClose={() => onActiveCreateTargetChange(null)}
      onCreate={onCreateContextTask}
    />
  )
}
```

Define `SLOT_LABEL` at module scope. Replace only the three `InlineAdd` instances inside `DayColumn` with `renderContextualAdd('am', dayShort)`, `renderContextualAdd('pm', dayShort)`, and `renderContextualAdd('eve', dayShort)`.

Keep each contextual component after its `SortableContext` task list and give the slot container a flex column layout so the idle button grows into free space. Call the helper as `renderContextualAdd('am')`, `renderContextualAdd('pm')`, or `renderContextualAdd('eve')`. Do not place an absolute overlay over tasks.

- [ ] **Step 4: Lift active-target state into `WeekView`**

Add to `WeekViewProps`:

```ts
onCreateContextTask: (params: ContextualTaskCreateParams) => Promise<void>
onOpenQuickAdd: () => void
isDraggingTask: boolean
```

Add state inside `WeekView`:

```ts
const [activeCreateTarget, setActiveCreateTarget] = useState<string | null>(null)
```

Pass `weekStart`, `activeCreateTarget`, `setActiveCreateTarget`, `onCreateContextTask`, and `isDraggingTask` into every weekday `DayColumn`. Extend `WeekendColumnsStripProps` with the same fields and pass them into weekend `DayColumn` instances. Do not add these props to `WeekendStrip`, `WeekendDayCell`, `DayRow`, `WeeklistStrip`, or `WeeklistPanel`.

When `isDraggingTask` becomes true, close only the visible composer without clearing its local draft:

```ts
useEffect(() => {
  if (isDraggingTask) setActiveCreateTarget(null)
}, [isDraggingTask])
```

- [ ] **Step 5: Run integration tests**

Run:

```bash
npm test -- src/components/day-row.test.tsx src/components/contextual-task-add.test.tsx
npm run typecheck
```

Expected: both files PASS and typecheck PASS. Existing `InlineAdd` tests must remain unchanged because other surfaces still use it.

- [ ] **Step 6: Commit column integration**

```bash
git add src/components/day-row.tsx src/components/day-row.test.tsx src/components/views.tsx
git commit -m "feat: add contextual zones to week columns"
```

### Task 3: Wire async persistence and accurate optimistic metadata

**Files:**
- Modify: `src/components/app.tsx:282-329`
- Modify: `src/components/app.tsx:417-429`
- Modify: `src/components/app.tsx:623-643`
- Modify: `src/hooks/use-tasks.ts:204-247`
- Create: `src/hooks/use-tasks.test.tsx`

- [ ] **Step 1: Write a failing optimistic mutation test**

Create `src/hooks/use-tasks.test.tsx` with jsdom, `QueryClient`, `QueryClientProvider`, and `renderHook`. Mock `api.createTask` with a deferred promise. Seed the week query cache, call `mutateAsync` with priority, recurrence, and tags, then assert the temporary task immediately contains:

```ts
expect(optimistic).toMatchObject({
  title: 'Preparar reuniao',
  bucketKey: '2026-06-23',
  slot: 'pm',
  priority: 'high',
  recurring: 'weekly',
  tags: ['work'],
})
```

Reject a second deferred mutation and assert the exact pre-mutation cache snapshot is restored. Use `taskKeys.week('2026-06-22')` from the existing key factory rather than inventing a query key.

- [ ] **Step 2: Run the hook test and verify the red state**

Run:

```bash
npm test -- src/hooks/use-tasks.test.tsx
```

Expected: FAIL because optimistic tasks currently force `priority`, `recurring`, and `tags` to empty values.

- [ ] **Step 3: Preserve submitted metadata in the optimistic task**

Change only these fields in `useCreateTask().onMutate`:

```ts
slot: (newTaskParams.slot as Task['slot']) ?? null,
priority: (newTaskParams.priority as Task['priority']) ?? null,
recurring: newTaskParams.recurring ?? null,
tags: newTaskParams.tags ?? [],
```

Keep snapshot, cancellation, replacement, rollback, and invalidation behavior unchanged.

- [ ] **Step 4: Add the async contextual handler in `App`**

Add:

```ts
const handleContextualAdd = useCallback(async (params: ContextualTaskCreateParams) => {
  const tasksInBucket = weekTasks[params.bucketKey] ?? []
  await createTask.mutateAsync({
    ...params,
    position: tasksInBucket.length,
    clientTrace: makeClientTrace('create'),
  })
}, [createTask, weekTasks])
```

Import `ContextualTaskCreateParams` from `src/lib/types.ts`. Do not replace `handleAddTask`; row variants and Weeklist still use it.

Pass these new props to `WeekView`:

```tsx
onCreateContextTask={handleContextualAdd}
onOpenQuickAdd={() => setShowQuickAdd(true)}
isDraggingTask={draggingTask !== null}
```

Keep the existing `Alt+Q` effect unchanged.

- [ ] **Step 5: Run mutation and component tests**

Run:

```bash
npm test -- src/hooks/use-tasks.test.tsx src/components/contextual-task-add.test.tsx src/components/day-row.test.tsx
npm run typecheck
```

Expected: all focused tests PASS and typecheck PASS.

- [ ] **Step 6: Commit persistence wiring**

```bash
git add src/components/app.tsx src/hooks/use-tasks.ts src/hooks/use-tasks.test.tsx
git commit -m "feat: persist contextual task metadata"
```

### Task 4: Add and verify the visible global creation route

**Files:**
- Modify: `src/components/views.tsx:378-446`
- Create: `src/components/views.test.tsx`

- [ ] **Step 1: Write a failing header action test**

Create `src/components/views.test.tsx`. Render `WeekView` inside `DndContext` with empty tasks, `variant="columns"`, and mocked callbacks. Assert:

```tsx
const button = screen.getByRole('button', { name: 'Nova tarefa' })
await user.click(button)
expect(onOpenQuickAdd).toHaveBeenCalledTimes(1)
```

Rerender with `isMobile` and `variant="quiet"`; assert the same accessible action still exists once and has a `minHeight` or wrapper that produces a 44 px touch target.

- [ ] **Step 2: Run the view test and verify the red state**

Run:

```bash
npm test -- src/components/views.test.tsx
```

Expected: FAIL because the weekly header does not render `Nova tarefa`.

- [ ] **Step 3: Add the global action to the weekly header**

In `renderHeader`, add a button before the week navigation controls:

```tsx
<button
  type="button"
  className="pill-btn"
  onClick={onOpenQuickAdd}
  aria-label="Nova tarefa"
  title="Nova tarefa (Alt+Q)"
  style={{
    minWidth: 44,
    minHeight: 44,
    padding: isMobile ? '0 12px' : '0 14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexShrink: 0,
  }}
>
  <IconPlus size={15} />
  {!isMobile && <span>Nova tarefa</span>}
</button>
```

Export or move `IconPlus` only if needed; prefer the existing icon vocabulary and do not add another icon dependency. On mobile, keep `aria-label="Nova tarefa"` even when visible copy is hidden. Place the action inside the existing header flow, not as a fixed element, so it cannot cover `MobileTabBar`.

- [ ] **Step 4: Run view and QuickAdd regressions**

Run:

```bash
npm test -- src/components/views.test.tsx src/components/quick-add.test.tsx
npm run typecheck
```

Expected: both test files PASS; `QuickAdd` behavior and `Alt+Q` wiring remain intact.

- [ ] **Step 5: Commit the global route**

```bash
git add src/components/views.tsx src/components/views.test.tsx
git commit -m "feat: expose global task creation"
```

### Task 5: Verify interaction quality and close documentation

**Files:**
- Modify: `docs/plans/active/2026-06-21-contextual-task-creation.md`
- Move to: `docs/plans/completed/2026-06-21-contextual-task-creation.md`
- Review only: `docs/specs/2026-06-21-contextual-task-creation-design.md`

- [ ] **Step 1: Run all automated gates**

Run:

```bash
npm run verify
```

Expected: client/config typecheck, all Vitest tests, and production build PASS.

No server code is changed, so `npm run typecheck:server` is not required for this task.

- [ ] **Step 2: Verify desktop columns in the browser**

Run `npm run dev`, open the authenticated weekly view, select columns, and check at widths 1280 and 1024:

1. No repeated visible add rows at rest.
2. Hover and keyboard focus reveal the contextual hint without covering tasks.
3. Clicking free space opens the correct day and slot.
4. `tom de tarde p1 #work` updates the destination and metadata before submit.
5. Enter creates; Escape cancels; empty blur closes; non-empty blur keeps the draft.
6. Opening another slot leaves only one visible composer; reopening the first restores its draft.
7. A rejected network request preserves the draft and shows the retry message.
8. Dragging a task hides/disables creation affordances while drop feedback still works.
9. The created optimistic row appears in the same slot without a column-wide animation.

- [ ] **Step 3: Verify accessibility, themes, motion, and responsive behavior**

Check:

1. Tab order goes left to right by day and top to bottom by enabled slot.
2. Focus ring is visible in light and dark themes.
3. Zone and global action have at least 44 by 44 px targets.
4. At the mobile breakpoint, the existing `quiet` inline pattern is unchanged.
5. The mobile global action opens QuickAdd and does not cover `MobileTabBar`.
6. With `prefers-reduced-motion: reduce`, opening and closing use no translation.
7. No horizontal overflow is introduced at supported column widths.
8. Browser console has no new errors or warnings.

- [ ] **Step 4: Review the final diff**

Run:

```bash
git diff --check
git status --short
git diff HEAD~4 -- src docs
```

Expected: no whitespace errors, no secrets, no unrelated files, and only the scoped UI, tests, spec, and plan changes.

- [ ] **Step 5: Record actual results and complete the plan**

Update this file with:

- exact commands run and PASS/FAIL results;
- viewport and theme combinations checked;
- any deviation from the approved spec and its reason;
- residual risks, or `Nenhum risco residual conhecido` when none remain.

Move the plan:

```bash
git mv docs/plans/active/2026-06-21-contextual-task-creation.md docs/plans/completed/2026-06-21-contextual-task-creation.md
git add docs/plans/completed/2026-06-21-contextual-task-creation.md
git commit -m "docs: complete contextual creation plan"
```
