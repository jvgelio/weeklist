# Design Spec: Sidebar Occupancy Persistence

Fix sidebar day indicators (dots/squares) to persist regardless of the currently selected week in the main view.

## Problem
Currently, the sidebar's `MiniWeekStrip` components only show task indicators (darker colors) for the week that is active in the main view. This happens because the `Sidebar` receives the same `taskMap` used by the main view, which is filtered by the active `weekStart`.

## Proposed Solution
Introduce a global "occupancy map" that covers the entire range of weeks displayed in the sidebar (-1 to +8 weeks from today), independent of the active week selection.

### 1. Backend: Occupancy Endpoint
Add a new endpoint `GET /api/tasks/occupancy?from=YYYY-MM-DD&to=YYYY-MM-DD`.
- **Query**: Group tasks by `bucketKey` (date) and count occurrences within the range.
- **Optimization**: Return a simple JSON map `{ [date]: count }` instead of full task objects.
- **Scope**: Ignore special buckets like `__inbox` for this specific view (handled separately).

### 2. Frontend: Occupancy Hook
Add `useOccupancy(from, to)` in `src/hooks/use-tasks.ts`.
- **Query Key**: `['tasks', 'occupancy', from, to]`.
- **Invalidation**: Invalidate this query whenever a task is created, deleted, or moved to a different bucket.

### 3. App Integration
- In `src/components/app.tsx`, calculate the fixed sidebar range (10 weeks).
- Fetch occupancy for this range using `useOccupancy`.
- Pass the global occupancy map to the `Sidebar` component.
- Ensure the `Sidebar` uses this global map for all rendered weeks.

## Success Criteria
- Sidebar day squares show task indicators for ALL 10 weeks displayed.
- Switching weeks in the main view does NOT clear indicators in the sidebar.
- Creating/moving/deleting tasks updates the sidebar indicators in real-time.
- Minimal performance impact (lightweight JSON payload).

## File Changes
- `server/routes/tasks.ts`: Add `/occupancy` route.
- `src/lib/api.ts`: Add `fetchOccupancy(from, to)`.
- `src/hooks/use-tasks.ts`: Add `useOccupancy` hook and update mutation invalidations.
- `src/components/app.tsx`: Fetch occupancy and pass to Sidebar.
- `src/components/sidebar.tsx`: Ensure it renders using the provided map correctly.
