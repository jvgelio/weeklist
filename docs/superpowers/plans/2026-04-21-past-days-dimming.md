# Past Days Dimming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Subtly dim past days in the week view (0.8 opacity + sunken background) to improve focus on current and future tasks.

**Architecture:** Add a date utility to identify past days and update UI components to apply conditional styling based on this state.

**Tech Stack:** React, TypeScript, Framer Motion, Inline CSS.

---

### Task 1: Date Utility Enhancement

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Add `isPastDay` utility**

```typescript
// Adicionar ao final do arquivo ou junto com sameDay
export function isPastDay(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return target.getTime() < today.getTime()
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/constants.ts
git commit -m "chore: add isPastDay utility"
```

---

### Task 2: Update DayRow (List View)

**Files:**
- Modify: `src/components/day-row.tsx`

- [ ] **Step 1: Import `isPastDay`**

```typescript
import { DAY_NAMES_PT, DAY_NAMES_LONG_PT, MONTH_PT, sameDay, isPastDay } from '../lib/constants'
```

- [ ] **Step 2: Apply conditional styling to `DayRowComponent`**

```tsx
// Dentro de DayRowComponent, calcular isPast
const isPast = useMemo(() => isPastDay(date), [date])

// No return do motion.section:
      style={{
        padding: '14px 16px',
        borderRadius: 14,
        background: isToday ? 'var(--bg-raised)' : (isPast ? 'var(--bg-sunken)' : 'transparent'),
        boxShadow: isToday ? 'var(--ring)' : 'none',
        opacity: isPast ? 0.8 : 1,
        transition: 'background 120ms ease, border 120ms ease, opacity 120ms ease',
      }}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/day-row.tsx
git commit -m "feat: dim past days in DayRow"
```

---

### Task 3: Update DayColumn (Column View)

**Files:**
- Modify: `src/components/day-row.tsx`

- [ ] **Step 1: Apply conditional styling to `DayColumnComponent`**

```tsx
// Dentro de DayColumnComponent, calcular isPast
const isPast = useMemo(() => isPastDay(date), [date])

// No return do motion.section:
      style={{
        flex: compact ? '0 0 240px' : '1 1 0',
        minWidth: compact ? 240 : 200,
        display: 'flex', flexDirection: 'column',
        background: isPast ? 'var(--bg-sunken)' : 'transparent',
        borderRadius: isPast ? 12 : 0, // Pequeno arredondamento se tiver fundo
        boxShadow: 'none',
        borderRight: '1px dashed var(--line)',
        padding: isPast ? '0 16px 0 8px' : '0 16px 0 0', // Ajuste de padding se tiver fundo
        marginRight: 16,
        transition: 'border 120ms ease, background 120ms ease, opacity 120ms ease',
        overflow: 'hidden',
        opacity: isPast ? 0.8 : (isWeekend && !isToday ? 0.88 : 1),
      }}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/day-row.tsx
git commit -m "feat: dim past days in DayColumn"
```

---

### Task 4: Verification

- [ ] **Step 1: Manual verification**
- Navigate to a week with past days.
- Verify that days before today have `var(--bg-sunken)` and `0.8` opacity.
- Verify that Today is highlighted and fully opaque.
- Verify that future days are fully opaque.
- Switch between "Columns" and "List" views to ensure both work.
