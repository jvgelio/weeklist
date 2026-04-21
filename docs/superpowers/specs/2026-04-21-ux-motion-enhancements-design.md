# Spec: UX Motion Enhancements

Add motion to the columns and tasks on initial load to improve perceived performance and visual appeal.

## Goal
- Improve the initial load experience with staggered entry animations.
- Use **Framer Motion** for declarative orchestration.

## Architecture

### Component Hierarchy & Animation Flow
1.  **Layout Root (`src/components/views.tsx`):**
    - The main container for the day columns.
    - Animation: Acts as the orchestration parent (`staggerChildren`).
    - Logic: Use `motion.div` with a container variant.

2.  **Day Columns (`src/components/day-row.tsx`):**
    - Individual columns (Mon, Tue, etc.).
    - Animation: Slide up (y: 10 -> 0) and fade in (opacity: 0 -> 1).
    - Logic: Each column becomes a `motion.div`.

3.  **Tasks (`src/components/task-components.tsx`):**
    - Individual task rows inside each column.
    - Animation: Fade in (opacity: 0 -> 1) with a slight delay after the parent column appears.
    - Logic: `TaskRowComponent` will use `motion.div`.

### Design Decisions
- **Framer Motion Variants:** Use shared variant names (`hidden`, `visible`) across components to allow automatic propagation and staggering.
- **Timing:** 
  - Column stagger: 0.1s.
  - Task stagger: 0.05s (internal to the column).
  - Duration: 0.3s - 0.5s for smooth, snappy feel.
- **Reduced Motion:** Ensure `framer-motion`'s `useReducedMotion` is respected (or simply avoid heavy animations).

## Data Flow
- No changes to data flow. Animations are purely decorative and based on the initial render of the component tree.

## Testing
- **Visual Verification:** Manually verify that columns load in sequence and tasks appear smoothly within them.
- **Performance:** Ensure animations don't stutter on mobile devices.
- **Unit Tests:** No specific unit tests for CSS/Motion, but ensure existing functionality (drag and drop, task editing) is not broken by the `motion.div` wrappers.

## Implementation Details
1.  Install `framer-motion`.
2.  Update `DayRow` to use `motion.div`.
3.  Update `TaskRowComponent` to use `motion.div`.
4.  Update `WeekView` (or relevant container in `views.tsx`) to orchestrate.
