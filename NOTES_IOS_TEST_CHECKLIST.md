# ISTOIC Notes Module — iOS Test Checklist

## Device Setup
- [ ] iPhone 15 Pro (test device)
- [ ] iPhone SE (small screen, no notch)
- [ ] iPad Air (landscape orientation)
- [ ] iOS Safari (browser)
- [ ] PWA installed (standalone mode)
- [ ] Capacitor iOS build (native wrapper)

---

## List View Tests

### Layout & Rendering
- [ ] Header visible with title + metadata line
- [ ] Search box appears below title
- [ ] Archive filter button is visible and responsive
- [ ] Notes list renders vertically (no multi-column)
- [ ] Dividers between items are subtle (#3f3f3f at 40%)
- [ ] Pinned notes appear at top
- [ ] Recently updated notes sort correctly
- [ ] Safe-area padding applied (notch clearance on iPhone 15 Pro)

### Scroll Performance
- [ ] Scrolling is smooth (60fps, no jank)
- [ ] No horizontal scroll appears
- [ ] Scroll momentum works (iOS native inertia)
- [ ] Floating button stays fixed while scrolling
- [ ] Header stays visible (not sticky—normal flow)

### List Items
- [ ] Title displayed (bold, 16px, left-aligned)
- [ ] Excerpt shows 1–2 lines (if available)
- [ ] Date shows as relative ("2d ago") or short format
- [ ] Pin indicator (📌) visible on pinned notes
- [ ] Archive + Delete buttons visible on right
- [ ] Items are touch-friendly (min 44×44px)
- [ ] Tap item → opens editor
- [ ] Long list (100+ notes) scrolls efficiently

### Empty State
- [ ] Shows centered icon + message when no notes
- [ ] Message changes based on context (archived vs empty)
- [ ] Encouraging tone (not pushy)
- [ ] Floating button still accessible

### Search
- [ ] Type in search box filters in real-time
- [ ] Case-insensitive matching
- [ ] Searches title, content, tags
- [ ] Clear search returns to full list
- [ ] Search badge shows count of results
- [ ] Empty search results → shows appropriate message

### Filter (Archive)
- [ ] Archive button toggles between active/archived
- [ ] Button changes color when active
- [ ] List updates immediately
- [ ] Active notes hidden when viewing archived
- [ ] Archived notes hidden when viewing active
- [ ] Badge shows archive status

### Delete Flow
- [ ] Tap delete icon on list item
- [ ] Confirmation dialog appears (modal overlay)
- [ ] Dialog shows note title
- [ ] Cancel closes dialog
- [ ] Confirm deletes note instantly
- [ ] List updates after delete
- [ ] Gesture: no swipe-to-delete (intentional)

### Floating Button (New Note)
- [ ] Button visible at bottom-right (fixed position)
- [ ] Safe-area respected (6px above home indicator)
- [ ] Button is 44×44px minimum (tap-friendly)
- [ ] Tap creates new empty note
- [ ] Button remains accessible during scroll
- [ ] Visual feedback on tap (scale down → up)
- [ ] No tooltip (clear intent: Plus icon = new)

### Accessibility
- [ ] Tab navigation works (keyboard)
- [ ] Focus rings visible (accent color, high contrast)
- [ ] Screen reader announces title + metadata
- [ ] Buttons labeled clearly (aria-label)
- [ ] Icons hidden from screen reader (aria-hidden)

---

## Editor View Tests

### Layout & Rendering
- [ ] Editor appears full-width
- [ ] Title input visible at top (large, bold)
- [ ] Content area below title
- [ ] Tasks panel appears (if tasks exist)
- [ ] Footer shows word count + date
- [ ] Safe-area respected (notch + home indicator)
- [ ] Back button visible (top-left)
- [ ] Pin + Archive buttons visible (top-right)
- [ ] More menu icon visible

### Title Input
- [ ] Click/tap to focus (no autofocus)
- [ ] Type new title → saves on blur
- [ ] Placeholder text shows "Untitled note"
- [ ] Title truncates gracefully (no overflow)
- [ ] Title updates list view after save
- [ ] Emoji support (if needed)

### Content Editor
- [ ] contentEditable div is interactive
- [ ] Type text → renders normally
- [ ] Newlines work (Enter key)
- [ ] Paste text works (formatting preserved)
- [ ] Paste images: rejected (only text notes)
- [ ] Undo/Redo work (Cmd+Z / Cmd+Y)
- [ ] Auto-save triggers after 1 second of idle
- [ ] Auto-save doesn't show spinner (subtle feedback)

### Tasks
- [ ] Task checkbox visible on left
- [ ] Tap checkbox → toggles completion
- [ ] Completed tasks show strikethrough + gray
- [ ] Delete task button appears on right
- [ ] Task progress bar updates
- [ ] Add task input appears below tasks
- [ ] Enter key in input → adds task
- [ ] Plus button also adds task
- [ ] New tasks sort below completed

### Header Controls
- [ ] Back button (top-left) returns to list
- [ ] Read-time indicator shows (e.g., "2 min read")
- [ ] Pin button toggles (filled/unfilled)
- [ ] Archive button toggles (icon changes?)
- [ ] More menu icon opens dropdown
- [ ] More menu shows Delete option
- [ ] Delete option with confirmation

### Keyboard Behavior
- [ ] Keyboard appears when text is tapped
- [ ] Keyboard does NOT cover editor content
- [ ] Editor scrolls up when keyboard is open
- [ ] Focus moves to content after title
- [ ] Dismiss keyboard: tap outside or swipe down
- [ ] Hardware keyboard works (external iPad keyboard)

### Archived Notes
- [ ] Archived note shows read-only state
- [ ] Text appears slightly grayed (opacity-75)
- [ ] Edits are ignored (pointer-events-none)
- [ ] Archive button toggles state
- [ ] Back to list → note is now archived
- [ ] Re-open archived note → still read-only

### Footer
- [ ] Word count accurate (text only, no HTML tags)
- [ ] Word count updates as you type
- [ ] Date shows current date
- [ ] Footer sticky at bottom (no parallax)

### Transitions
- [ ] List → Editor: slide-up animation (smooth)
- [ ] Back button → Editor slides down
- [ ] Transition under 300ms
- [ ] No flicker or layout shift during transition

### Scroll Behavior
- [ ] Content scrolls vertically
- [ ] Long notes scroll smoothly
- [ ] Scroll momentum works (iOS inertia)
- [ ] Header sticky or normal flow? (verify design)
- [ ] Footer always visible or scrolls?

### Accessibility
- [ ] Title input has focus ring
- [ ] Content div is editable (cursor visible)
- [ ] Buttons labeled (aria-label)
- [ ] Read-time indicator announced by screen reader
- [ ] Task checkboxes labeled

---

## Save & Persistence Tests

### Auto-Save
- [ ] Edit title → 1 second later, saved
- [ ] Edit content → 1 second later, saved
- [ ] Edit task → 1 second later, saved
- [ ] Open list → note reflects latest edits
- [ ] Quit app → data persists (localStorage/AsyncStorage)
- [ ] Offline edit → queued sync (if implemented)

### Empty Note Cleanup
- [ ] Create new note → back without typing
- [ ] Note is deleted (not saved as empty)
- [ ] List reflects removal (no "Untitled" clutter)

### Concurrent Edits
- [ ] Edit on web → open on iOS
- [ ] Latest state loads (e.g., from localStorage)
- [ ] No data loss or conflicts

---

## Keyboard & Input Tests

### iOS Virtual Keyboard
- [ ] Keyboard appears for text input
- [ ] Keyboard height doesn't cover input
- [ ] Keyboard dismissal works (tap outside)
- [ ] Keyboard type: text (default)
- [ ] Autocorrect enabled
- [ ] Auto-capitalization enabled (first word)

### Hardware Keyboard (iPad)
- [ ] Cmd+N: new note (if implemented)
- [ ] Cmd+Z: undo
- [ ] Cmd+Y: redo
- [ ] Cmd+B: bold (if implemented)
- [ ] Escape: back to list
- [ ] Tab: focus next field

### VoiceOver (Screen Reader)
- [ ] All interactive elements are announced
- [ ] Headings marked as `<h1>`, `<h2>`, etc.
- [ ] Buttons have descriptive labels
- [ ] Links labeled (not "click here")
- [ ] Form inputs labeled
- [ ] List items navigable (rotor)
- [ ] Gestures work (swipe right = back)

---

## Visual & UX Tests

### Colors
- [ ] Background is deep black (#0d0d0d)
- [ ] Text is light gray (#ececec)
- [ ] Muted text is medium gray (#8b8b8b)
- [ ] Accent (buttons) is white (#ffffff)
- [ ] Focus rings are accent (50% opacity)
- [ ] Danger (delete) is red (#ef4444)

### Typography
- [ ] Body text is 16px, readable
- [ ] Line-height is 1.5 (comfortable reading)
- [ ] Title is larger, bolder (2.5rem editor, 1rem list)
- [ ] No tiny text (< 12px without reason)
- [ ] Font loading complete (no FOUT)

### Spacing
- [ ] Consistent 16px padding on mobile
- [ ] Safe-area respected (not cut off by notch)
- [ ] Touch targets are 44×44px minimum
- [ ] Dividers have consistent spacing
- [ ] Breathing room between elements

### Responsive
- [ ] iPhone SE (375px): single column, readable
- [ ] iPhone 15 Pro (430px): still single column
- [ ] iPad landscape (1024px): still single column (intentional)
- [ ] Text doesn't overflow

### Animations
- [ ] Transitions are smooth (no jumps)
- [ ] Transitions are quick (< 300ms)
- [ ] Buttons scale on press (visual feedback)
- [ ] No animation lag on older devices

---

## Performance Tests

### Memory
- [ ] 1000 notes loaded: memory usage < 50MB
- [ ] No memory leaks after 1 hour of use
- [ ] Switching between notes doesn't leak

### Battery
- [ ] 1 hour of use: minimal battery drain
- [ ] Scroll 50 notes: 60fps (no drops)
- [ ] Save 100 notes: no excessive I/O

### Network
- [ ] Offline mode works (cached data)
- [ ] Slow network (3G): app doesn't freeze
- [ ] Sync queues edits (if online sync implemented)

---

## Platform-Specific Tests

### iOS Safari
- [ ] Keyboard behavior correct
- [ ] Safe-area working
- [ ] Scroll smooth
- [ ] Focus rings visible

### PWA (Standalone Mode)
- [ ] Installable from browser
- [ ] Works offline (app shell cached)
- [ ] Status bar color matches theme
- [ ] Home indicator respected
- [ ] No browser chrome visible

### Capacitor iOS App
- [ ] Builds successfully
- [ ] Runs on physical device
- [ ] Safe-area respected
- [ ] Keyboard behavior correct
- [ ] Touch input responsive
- [ ] Network sync works (if implemented)

---

## Edge Cases

### Data Integrity
- [ ] Save very long note (10,000+ words)
- [ ] Save note with special characters (emoji, Chinese, etc.)
- [ ] Save note with code blocks (backticks)
- [ ] Delete note while editing → back to list
- [ ] Archive note while editing → state correct
- [ ] Pin/unpin while editing → instant visual feedback

### UI Edge Cases
- [ ] Reopen immediately after delete → no crash
- [ ] Open deleted note by id → 404 or back
- [ ] Clear search while scrolled down → scroll resets
- [ ] Rapid tapping new button → no duplicate notes
- [ ] Rapid archive/unarchive → state consistent

### Extreme Content
- [ ] 100,000+ character note → renders without lag
- [ ] 1000 tasks in one note → list scrolls fine
- [ ] Title = single emoji → displays correctly
- [ ] Content = only spaces → excerpt empty (not "No preview")

---

## Regression Tests (Keep Notes Working)

### Existing Features (Deprecated, But Check No Crashes)
- [ ] AdvancedEditor component: don't render it, but keep it in codebase
- [ ] NoteBatchActions: not used, but shouldn't break imports
- [ ] NoteAgentConsole: not used, but shouldn't break imports
- [ ] No errors in browser console

### Data Model Compatibility
- [ ] Old note structure still loads
- [ ] Tasks field: if exists, renders correctly
- [ ] Tags field: if exists, doesn't break (hidden from UI)
- [ ] Migrations: no data loss on schema change

---

## Deliverables Verification

### Code Quality
- [ ] No console errors or warnings
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] ESLint passes
- [ ] Prettier formatted
- [ ] No unused imports

### Performance
- [ ] Lighthouse score: 90+ (performance)
- [ ] Lighthouse score: 95+ (accessibility)
- [ ] Lighthouse score: 90+ (best practices)
- [ ] No layout shift (CLS < 0.1)
- [ ] First contentful paint: < 1s

### Documentation
- [ ] README updated (if applicable)
- [ ] Comments in complex logic
- [ ] Design doc provided (NOTES_REDESIGN_EDITORIAL.md)
- [ ] Changelog updated
- [ ] No secrets in code

### Accessibility
- [ ] WCAG 2.1 AA compliant
- [ ] All interactive elements keyboard-accessible
- [ ] Color contrast: 7:1 minimum
- [ ] Focus visible: 2px ring
- [ ] No ARIA misuse

---

## Sign-Off Checklist

- [ ] All tests passed on iOS Safari
- [ ] All tests passed on PWA standalone
- [ ] All tests passed on Capacitor iOS app
- [ ] No regressions in other modules
- [ ] Designer approved (visual)
- [ ] Product approved (UX)
- [ ] QA approved (functionality)
- [ ] Ready for production deployment

---

## Known Issues / Future Iterations

### Not Implemented (By Design)
- [ ] Semantic search (deferred to Phase 2)
- [ ] Batch selection (simplicity first)
- [ ] Rich formatting toolbar (contentEditable native is enough)
- [ ] Collaborative editing (Phase 2 / 3)

### Possible Enhancements
- [ ] Handwriting recognition (iPad + stylus, Phase 2)
- [ ] Voice notes (dictation fallback, Phase 2)
- [ ] Custom note colors (Phase 3)
- [ ] Sharing (Phase 3)
- [ ] Templates (Phase 3)

---

**Test Date**: _____  
**Tester**: _____  
**Device**: _____  
**Browser/App**: _____  
**Result**: PASS / FAIL  

**Notes**:  
_____________________________________________________________

---

**Last Updated**: January 2026
