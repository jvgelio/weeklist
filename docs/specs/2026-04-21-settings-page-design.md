# Design Spec: Settings Page and Layout Enhancements

Transform the settings modal into a dedicated full-page view with improved visual controls and layout structure.

## 1. Objective
Replace the `SettingsModal` with a first-class `SettingsView` accessible via the sidebar, providing a more spacious and visually rich experience for managing user preferences.

## 2. Architecture Changes

### View State
- Add `'settings'` to the `View` type in `src/lib/types.ts`.
- Update `App.tsx` navigation logic to handle the new view.

### Component Structure
- Create `src/components/settings-view.tsx`.
- Update `Sidebar.tsx` to treat the Settings button as a navigation link (active when `view === 'settings'`).

## 3. UI/UX Design

### Sections
1. **Appearance**: 
   - **Theme Selector**: Segmented control (Light/Dark) instead of a checkbox.
   - **Accent Colors**: (Optional/Future) Visual color picker.
2. **Schedule (Agenda)**:
   - **Weekend Toggle**: Styled switch with description.
   - **Dim Past Days Toggle**: Styled switch with description.
   - **Active Slots**: A visual "Day Planner" picker with icons (☀️ Morning, ⛅ Afternoon, 🌙 Evening).
3. **Account**:
   - User profile info (Name, Email, Avatar).
   - "Logout" button with distinct "Danger" styling.

### Visual Style
- **Cards**: Use cards (`var(--bg-raised)`) with subtle shadows and borders to group settings.
- **Typography**: Section headers using `var(--font-display)` (Instrument Serif) in italics.
- **Spacing**: Increased padding and clear hierarchy between labels and descriptions.

## 4. Implementation Details

### State Management
- Use existing `useUpdateDisplayPrefs` and `useUpdateSlotPrefs` hooks.
- Settings will be updated reactively or via a "Save" button (to be decided during implementation). Preference for immediate feedback where possible.

### Responsive Design
- On mobile, the settings page will occupy the full main area.
- Sidebar behavior remains consistent (collapsible on desktop, drawer on mobile).

## 5. Success Criteria
- User can navigate to Settings from the sidebar.
- Settings view is full-page and maintains sidebar visibility.
- All existing preferences (Theme, Weekend, Dim Past, Slots) are editable via new visual controls.
- Logout functionality is clearly visible and works.
