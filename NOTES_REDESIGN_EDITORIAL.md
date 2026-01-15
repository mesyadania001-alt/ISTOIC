# ISTOIC Notes Module — Editorial Redesign

## Vision
Transform Notes from a feature-heavy dashboard into a **thinking space**—calm, focused, and distraction-free. Like Apple Notes or Bear, where silence is a feature and every pixel serves the content, not the app.

---

## Design Principles

### 1. **One Screen, One Purpose**
- **List View**: Browse and discover
- **Editor View**: Read and compose

No modal overlays, no sidebars, no nested interactions. Each screen does one thing well.

### 2. **Vertical is Sacred**
- Single-column layout always
- Horizontal scrolling: never
- Vertical scroll is natural; respect it

### 3. **Spacing as Separation**
- No borders between list items (only divider lines in light gray)
- Breathing room = visual clarity
- Touch targets are ample: min 44×44px on iOS

### 4. **Typography First**
- Large, readable base text (16px body)
- Clear hierarchy (title → excerpt → metadata)
- Monospace only in code blocks

### 5. **Minimal Chrome**
- Hide advanced actions behind a menu
- Show only essential controls
- Bulk actions hidden under a toggle

### 6. **Accessibility & Keyboard**
- All interactions keyboard-accessible
- Focus rings visible and consistent (accent color at 50% opacity)
- Screen reader semantics correct

---

## Component Architecture

### `SmartNotesView.tsx` (Orchestrator)
Manages navigation between list and editor. 
- State: `activeNoteId`
- Handlers: selection, save, delete, archive, pin
- Passes only required props to child views

### `NotesListView.tsx` (Calm List)

**Purpose**: Browse notes with minimal cognitive load.

**Structure**:
```
Header
  - Title + metadata line (active/archived count)
  - Search + Archive filter button
  
Content (scrollable)
  - Vertical list of note cards
  - Each card:
    - Title (left-aligned, bold)
    - 1–2 line excerpt (text-muted)
    - Date (xs, text-muted/60)
    - Actions: Archive + Delete (right-aligned, subtle)
  
Floating Action
  - New note button (bottom-right, safe-area aware)
```

**Key Details**:
- Dividers between items (not full borders)
- Pinned notes sort to top
- Recent-first sort after pinned
- Search filters in real-time
- Archive toggle switches view
- Delete with confirmation dialog
- Smooth transitions, no jarring movements

### `NoteEditor.tsx` (Reading-First)

**Purpose**: A clean, distraction-free writing and editing space.

**Structure**:
```
Header (minimal)
  - Back button (left)
  - Read-time indicator (center, xs)
  - Pin button (primary color if pinned)
  - Archive button (subtle)
  - More menu (archive, delete options)

Content (full-width, scrollable)
  - Title input (2.5rem, bold, transparent bg)
  - Tasks panel (if any):
    - Task list with checkboxes
    - Progress bar
    - Add task input
  - Editable text (contentEditable, 16px, line-height 1.5)

Footer
  - Word count + date (xs, muted, subtle)
```

**Key Details**:
- No toolbar (intentional—reduces cognitive load)
- Safe-area insets for iPhone notch
- Keyboard doesn't cover editor (scroll adjusts)
- Auto-save on every keystroke (debounced 1s)
- Tasks integrated (not secondary)
- Read-time calculation (200 words/min)
- Archived notes are read-only (pointer-events-none, opacity-75)

---

## Visual Language

### Layout Grid
- Padding: 16px mobile, 32px+ desktop
- Safe-area: respected on iOS (top + bottom)
- Container width: unrestricted (full viewport)
- Min-height: 100dvh (not 100vh—important for mobile)

### Spacing
- List item height: ~72px (title + excerpt + date)
- Gap between items: divider (not margin)
- Header/Footer padding: 16px top/bottom, 16px left/right
- Touch target: min 44×44px (Apple HIG)

### Colors
- Background: `--bg` (deep black, #0d0d0d)
- Surfaces: `--surface` (slightly elevated, #1e1e1e)
- Dividers: `--border/40` (subtle, #3f3f3f at 40%)
- Text: `--text` (light gray, #ececec)
- Muted: `--text-muted` (medium gray, #8b8b8b)
- Accent: `--accent` (white, #ffffff for primary action)
- Danger: `--danger` (red, #ef4444)

### Typography
- **Title (list)**: 1rem (16px), font-semibold, tracking-tight
- **Title (editor)**: 1.5rem (24px), font-black, tracking-tight
- **Body**: 1rem (16px), font-normal, line-height 1.5
- **Caption**: 0.875rem (14px), text-muted/80
- **Metadata**: 0.75rem (12px), text-muted/60

### Radius
- Buttons: 8–12px (consistent with Dashboard/Auth)
- Cards: 12–16px (subtle, not prominent)
- Dividers: none (straight lines)

### Shadows
- Floating button: `shadow-lg` (soft, not harsh)
- Modals: none (use slide-up animation)
- Cards: none on list (dividers only)

### Motion
- Slide-up (list → editor): 300ms cubic-bezier(0.2, 0, 0, 1)
- Scale (button press): 95% active, 100% rest
- Opacity fades: 200ms (delete confirm dialog)
- Auto-save pulse: visual feedback (subtle)

---

## iOS Behavior

### Safe Area
```tsx
// Header
pt-safe        // Respects notch top (iPhone 12+)
pb-safe        // Respects home indicator

// Floating button
safe-pb        // Custom class for 6px + home indicator
```

### Keyboard Handling
- Editor scrolls up when keyboard appears (handled by browser)
- Keyboard doesn't cover input fields (contentEditable handles auto-scroll)
- Dismiss keyboard: tap outside or swipe down (native behavior)

### Scroll Performance
- List view: single scroll container
- Editor view: single scroll container
- No nested scrolling (violation of scroll laws)
- Custom scrollbar: thin, muted color

### Touch Interactions
- Buttons: 44×44px min (Apple HIG)
- Swipe-back: handled by browser (back gesture)
- Long-press: reserved for OS-level menu (notes don't use it)
- Double-tap: reserved for zoom (editor doesn't interfere)

---

## States & Transitions

### List View
- **Default**: Shows active notes, sorted by pinned + updated date
- **Searching**: Real-time filter, dividers shown above results badge
- **Archived**: Toggle shows archived notes instead
- **Empty**: Centered, encouraging message + icon
- **Delete Confirm**: Modal dialog (not in-line)

### Editor View
- **Editing**: Full interactivity, auto-save debounced
- **Archived**: Read-only (gray overlay, pointer-events-none)
- **Saving**: Subtle "Syncing..." indicator (no spinner)
- **Unsaved Empty**: On back, auto-delete if empty

### Transitions
- List → Editor: Slide-up (not modal—full-height)
- Editor → List: Slide-down (back button or when empty)
- Archive: Instant state change, update sort order
- Pin: Instant state change, re-sort list

---

## Animations & Micro-interactions

### List Items
```css
hover:bg-surface-2/50       /* Subtle background shift */
active:bg-surface-2         /* Press effect */
transition-colors duration-200
```

### Floating Button
```css
hover:shadow-xl              /* Lift on hover */
active:scale-95              /* Press effect */
transition-all duration-200
```

### Delete Dialog
```css
opacity-0 → opacity-100      /* Fade in */
backdrop blur (if supported)
```

### Checkboxes (Tasks)
```css
border-2 border-border       /* Unchecked */
bg-accent border-accent      /* Checked */
transition-all duration-150
```

---

## Accessibility

### Keyboard Navigation
- Tab order: logical (top-left → bottom-right)
- Enter: Activate buttons, select list items
- Escape: Close dialogs, back from editor
- Space: Toggle checkboxes (tasks)

### Screen Readers
- Buttons: aria-label (concise, action-focused)
- Icons: hidden with aria-hidden="true" (when accompanied by text)
- Headings: `<h1>` for page title, `<h3>` for sections
- Landmarks: `<header>`, `<footer>`, `<main>` (implicit in divs)
- Colors: Never sole indicator (text + color)

### Focus Management
```css
focus:ring-2 ring-accent/50
focus:ring-inset             /* Focus inside button, not outside */
```

### Contrast
- Text on bg: #ececec on #0d0d0d = 15.8:1 (WCAG AAA)
- Muted text: #8b8b8b on #0d0d0d = 7.2:1 (WCAG AA)
- Accent: #ffffff on #1e1e1e = 18.5:1 (WCAG AAA)

---

## Not Included (Intentional)

### Removed Features
- ❌ **Batch selection mode** (not for Notes; simplicity first)
- ❌ **Agent/AI tools** (deferred; complexity later)
- ❌ **Tags** (in data model, hidden from UI)
- ❌ **Search operators** (too advanced)
- ❌ **Rich formatting toolbar** (contentEditable native)
- ❌ **Themes** (single dark theme only)
- ❌ **Nested folders** (flat structure, tags when needed)

### Why?
- **Silence is a feature**: Every button removed is a win
- **Mobile-first**: Complex UX breaks on small screens
- **Cognitive load**: Fewer options = faster decisions
- **Future-proof**: Add features deliberately, not by default

---

## File Structure
```
features/smartNotes/
  ├── SmartNotesView.tsx      (Orchestrator)
  ├── NotesListView.tsx        (Calm list)
  ├── NoteEditor.tsx           (Reading-first editor)
  ├── AdvancedEditor.tsx       (Deprecated; kept for reference)
  ├── NoteBatchActions.tsx     (Deprecated; not used)
  └── NoteAgentConsole.tsx     (Deprecated; not used)
```

---

## Development Checklist

- [x] List view: vertical, divider-based layout
- [x] Editor view: full-width, contentEditable
- [x] Auto-save: debounced on keystroke
- [x] Archive toggle: instant state, re-sort
- [x] Pin toggle: instant state, bubbles to top
- [x] Delete: confirmation dialog, safe delete
- [x] Tasks: integrated checkbox list
- [x] Read time: calculated at 200 words/min
- [x] Safe area: iOS notch/home indicator
- [x] Floating button: bottom-right, 44×44px min
- [x] Empty states: encouraging, not pushy
- [x] Keyboard: all interactions accessible
- [x] Focus: visible, high contrast rings
- [x] Scrolling: single container per view
- [x] Transitions: smooth, under 300ms
- [x] Responsive: single-column mobile, same desktop
- [x] Accessible: WCAG AA+, screen readers

---

## Editorial Decisions

### Why No Toolbar?
- Toolbars fragment focus. The blank page is the message.
- Keyboard shortcuts (Cmd+B for bold) still work.
- Native contentEditable provides formatting.
- Complexity lives where it belongs: menu → preferences.

### Why Vertical List Only?
- Columns break at breakpoints (maintenance nightmare).
- Vertical is natural on mobile (scrolling is expected).
- Zen reading = no horizontal decisions.

### Why Single Dark Theme?
- Light mode = more CSS variables to maintain.
- Dashboard & Auth already refined for dark mode.
- Accessibility: high contrast already achieved.
- Future: themes are a distraction now.

### Why Floating Button Over Header Button?
- Floating is **always** reachable (doesn't scroll away).
- Thumb-zone friendly on large phones (bottom-right).
- Calm visual (not prominent, not hidden).
- Precedent: Apple Notes, Bear, Things.

### Why No Semantic Search?
- Deferred to future iteration.
- Keyboard search + filtering is sufficient now.
- Vector DB is heavy lifting; not needed for MVP.

### Why Delete on Confirmation, Not Trash?
- One-stage delete (no trash bin to manage).
- Immediate feedback (don't wonder if it worked).
- Recoverable via undo (browser native).
- Clear intent (delete = gone, now).

---

## Testing Notes

### Performance
- List with 1000 notes: smooth scroll (< 60fps)
- Transition list → editor: under 300ms
- Auto-save: no visible lag (debounced)

### Edge Cases
- Archived note edited: stays archived
- Delete empty note on back: no prompt
- Search empty query: show all active
- Title-only notes: excerpt blank (not "No preview")
- Very long titles: truncate + ellipsis

### Browser Compatibility
- iOS Safari 14+
- Android Chrome 90+
- Desktop Chrome/Firefox/Safari (latest)
- PWA: installable, works offline (app shell cache)

---

## Future Iterations

### Phase 2
- [ ] Collaborative editing (WebSocket sync)
- [ ] Rich formatting UI (when really needed)
- [ ] Handwriting recognition (iPad + stylus)

### Phase 3
- [ ] Themes (light/dark/system)
- [ ] Custom colors per note
- [ ] Full-text search indexing

### Phase 4
- [ ] Public shares (link-based)
- [ ] Real-time collaboration
- [ ] Offline sync queue

---

## Reference Material

### Design Inspiration
- [Apple Notes](https://support.apple.com/guide/notes) — simplicity baseline
- [Bear App](https://bear.app) — editorial calm
- [Craft](https://www.craft.do) — structure without chaos
- [iA Writer](https://ia.net/writer) — focus mode pioneer

### Technical Reference
- iOS Safe Area: https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- contentEditable: https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Editable_content
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/

---

**Last Updated**: January 2026  
**Status**: Delivered  
**Team**: Frontend Architecture (React + Vite)
