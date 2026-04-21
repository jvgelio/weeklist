# Spec: UX Enhancements - Past Days Dimming

Dim past days in the week view to provide better focus on the current day and upcoming tasks.

## Goal
Improve visual hierarchy by subtly "pushing back" days that have already passed. This helps the user naturally focus on Today and the rest of the week.

## Design
- **Trigger:** A day is considered "past" if its date is before today's date (ignoring time).
- **Visuals for Past Days:**
    - **Background:** `var(--bg-sunken)`
    - **Opacity:** `0.8`
- **Scope:** Applies to both `DayRow` (list view) and `DayColumn` (column view) within the main week view.

## Technical Details
- Create a helper utility or use existing `isBefore` logic to compare dates by day.
- Update `DayRowComponent` and `DayColumnComponent` in `src/components/day-row.tsx`.
- Pass a `isPast` boolean or calculate it inside the components based on the `date` prop.
- Ensure the "Today" highlight takes precedence or is not affected by the past day styling (though a day cannot be both today and in the past).

## Success Criteria
- Days before today appear with a subtle sunken background and 0.8 opacity.
- Today and future days remain fully opaque with their standard backgrounds.
- Navigation between weeks correctly updates the dimming state.
