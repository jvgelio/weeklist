# UX Motion Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add staggered entry animations to columns and tasks on initial load using Framer Motion.

**Architecture:** Use Framer Motion's variants to orchestrate staggered animations from the layout root down to individual tasks. Variants will propagate from `Views` -> `DayRow` -> `TaskRowComponent`.

**Tech Stack:** React 18, Framer Motion

---

### Task 1: Add Motion to TaskRowComponent

**Files:**
- Modify: `src/components/task-components.tsx`

- [ ] **Step 1: Import motion and define item variants**

```typescript
import { motion } from 'framer-motion'

const taskVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.2 }
  }
}
```

- [ ] **Step 2: Wrap TaskRowComponent with motion.div**

Update `TaskRowComponent` to use `motion.div` and apply the `variants`.

```typescript
// Replace the outer <div> with <motion.div>
// Add variants={taskVariants}
// The parent (DayRow) will control the 'animate' state via propagation
```

- [ ] **Step 3: Commit**

```bash
git add src/components/task-components.tsx
git commit -m "feat(ui): add motion variants to TaskRowComponent"
```

### Task 2: Add Motion to DayRow

**Files:**
- Modify: `src/components/day-row.tsx`

- [ ] **Step 1: Import motion and define column variants**

```typescript
import { motion } from 'framer-motion'

const columnVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.4,
      staggerChildren: 0.05 // Stagger tasks within the column
    }
  }
}
```

- [ ] **Step 2: Wrap DayRow with motion.div**

Update `DayRow` to use `motion.div` and apply the `variants`.

```typescript
// Replace the outer <div> with <motion.div>
// Add variants={columnVariants}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/day-row.tsx
git commit -m "feat(ui): add motion variants and staggering to DayRow"
```

### Task 3: Orchestrate Animation in WeekView

**Files:**
- Modify: `src/components/views.tsx`

- [ ] **Step 1: Import motion and define layout variants**

```typescript
import { motion } from 'framer-motion'

const layoutVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1 // Stagger columns
    }
  }
}
```

- [ ] **Step 2: Wrap WeekView container with motion.div**

Update `WeekView` to trigger the initial animation.

```typescript
// Wrap the columns container with <motion.div>
// initial="hidden"
// animate="visible"
// variants={layoutVariants}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/views.tsx
git commit -m "feat(ui): orchestrate staggered column animations in WeekView"
```

### Task 4: Verification

- [ ] **Step 1: Verify build**

Run: `npm run build`
Expected: Success

- [ ] **Step 2: Manual Check**

1. Run `npm run dev`.
2. Open the app.
3. Observe columns sliding in one by one, with tasks appearing inside them.
