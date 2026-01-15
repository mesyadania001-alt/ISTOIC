# ISTOIC Styling Implementation Checklist

## Master Checklist - Print & Track Progress

**Project:** ISTOIC Styling Refinement  
**Start Date:** ___________  
**Target Completion:** ___________  
**Status:** 🔄 In Progress

---

## PHASE 0: Preparation (Day 1)

### Setup & Planning
- [ ] Read all analysis reports (2 hours)
  - [ ] STYLING_ANALYSIS_REPORT.md
  - [ ] STYLING_IMPLEMENTATION_GUIDE.md
  - [ ] STYLING_QUICK_REFERENCE.md
  - [ ] CSS_VARIABLES_COMPLETE_REFERENCE.md

- [ ] Team planning meeting (1 hour)
  - [ ] Discuss findings
  - [ ] Allocate resources
  - [ ] Confirm timeline
  - [ ] Set success criteria

- [ ] Create feature branch
  - [ ] Branch name: `feature/styling-refinement`
  - [ ] Protect main branch
  - [ ] Set up CI/CD checks

- [ ] Setup development environment
  - [ ] Pull latest code
  - [ ] Install dependencies
  - [ ] Run test suite baseline
  - [ ] Verify all files accessible

---

## PHASE 1: Critical Changes (Days 2-3)

### 1.1 Remove Duplicate Code (15 minutes)

**File:** `/services/AdvancedEditor.tsx`

- [ ] Delete the file (it's a duplicate of features/smartNotes/AdvancedEditor.tsx)
- [ ] Update all imports
- [ ] Verify no build errors
- [ ] Commit: "fix: remove duplicate AdvancedEditor component"

### 1.2 Create Utility Files (1.5 hours)

**Files to create:**
- [ ] `utils/statusColors.ts` - STATUS_COLOR_MAP and getStatusClassName
- [ ] `constants/themePresets.ts` - THEME_PRESETS system
- [ ] `utils/cssVariables.ts` - getCSSVariableColor helper
- [ ] `components/ToolbarButton.tsx` - Reusable toolbar button

### 1.3 Update TeleponanView.tsx (2 hours)

- [ ] Line 89: Replace hardcoded canvas color with var(--accent-2)
- [ ] Add proper card styling with bg-surface, text-text
- [ ] Update button colors: mute (surface-2), end (danger), start (success)
- [ ] Add status indicator with proper colors
- [ ] Test canvas rendering at 60fps
- [ ] Verify dark mode contrast

**Commit:** `feat(teleponan): migrate to CSS variables and improve styling`

### 1.4 Update IntegrityMatrix.tsx (3 hours)

- [ ] Lines 31-33: Replace hardcoded status colors with STATUS_COLOR_MAP
- [ ] Line 129: Replace bg-[#0a0a0b] with bg-surface
- [ ] Update border: border-white/5 → border-border
- [ ] Update rounded: rounded-[32px] → rounded-[var(--radius-xl)]
- [ ] Add status icons alongside colors
- [ ] Test all three states: DISABLED, UNSTABLE, ACTIVE

**Commit:** `feat(integrity-matrix): replace hardcoded colors with CSS variables`

### 1.5 Update SettingsView.tsx (2.5 hours)

- [ ] Lines 42-52: Remove THEME_COLORS, import THEME_PRESETS
- [ ] Create ThemeColorPreview component
- [ ] Update UI for theme selection
- [ ] Test theme switching and persistence

**Commit:** `feat(settings): migrate theme colors to THEME_PRESETS system`

---

## PHASE 2: Enhancement (Days 4-5)

### 2.1 Update SystemHealthView.tsx (2 hours)
- [ ] Add status icons to provider cards
- [ ] Use status color map
- [ ] Improve metric card styling
- [ ] Verify all transitions are smooth

**Commit:** `feat(system-health): improve status indicators and styling`

### 2.2 Update SmartNotesView.tsx (1.5 hours)
- [ ] Add visual state indicators (pinned, archived)
- [ ] Improve search UI (icon + clear button)
- [ ] Enhance empty state
- [ ] Update filter styling

**Commit:** `feat(smart-notes): enhance note card styling and search UI`

### 2.3 Update AdvancedEditor.tsx (2 hours)
- [ ] Use new ToolbarButton component
- [ ] Update code block styling
- [ ] Add smooth focus mode transitions
- [ ] Test all toolbar states

**Commit:** `feat(advanced-editor): consolidate toolbar styling`

---

## PHASE 3: Polish & Testing (Days 6-7)

### 3.1 Update Low-Priority Files (2 hours)
- [ ] NoteBatchActions.tsx (1 hour)
  - [ ] Add aria-labels to buttons
  - [ ] Implement mobile drawer layout
- [ ] NoteAgentConsole.tsx (0.5 hours)
  - [ ] Add progress bar
  - [ ] Smooth transitions
- [ ] DailyStoicWidget.tsx (0.5 hours)
  - [ ] Add author attribution
  - [ ] Improve text sizing

**Commit:** `feat: polish remaining components with styling improvements`

### 3.2 Accessibility Audit (2 hours)
- [ ] Run Lighthouse audit (target: 95+)
- [ ] Run WAVE tool
- [ ] Check all contrast ratios (≥ 4.5:1)
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Fix all issues found

### 3.3 Performance Testing (1.5 hours)
- [ ] Record animations in DevTools
- [ ] Verify 60fps (no yellow/red bars)
- [ ] Check for layout thrashing
- [ ] Profile CPU and GPU usage

### 3.4 Cross-Browser Testing (1 hour)
- [ ] Chrome, Firefox, Safari, Edge
- [ ] Verify colors, animations, interactions
- [ ] Document any browser-specific issues

### 3.5 Mobile Device Testing (1.5 hours)
- [ ] iPhone (iOS 15+)
- [ ] Samsung Galaxy (Android 12+)
- [ ] iPad (tablet)
- [ ] Portrait and landscape orientation
- [ ] Touch target size verification

### 3.6 Documentation (1 hour)
- [ ] Add JSDoc comments
- [ ] Document color usage patterns
- [ ] Create styling guide
- [ ] Update README

---

## PHASE 4: Review & Merge (Day 8)

### Code Review
- [ ] Senior developer review
- [ ] Peer developer review
- [ ] Check code quality
- [ ] Verify no hardcoded colors
- [ ] Verify accessibility compliance

### Automated Checks
- [ ] All tests pass
- [ ] ESLint passes
- [ ] Build succeeds
- [ ] No TypeScript errors

### QA Testing
- [ ] Regression testing
- [ ] All features work correctly
- [ ] No visual regressions

### Merge
- [ ] Rebase on main
- [ ] Resolve conflicts if any
- [ ] Final review passed
- [ ] Merge to main
- [ ] Deploy to staging/production

---

## File Status Summary

| File | Priority | Status | Effort | Notes |
|------|----------|--------|--------|-------|
| services/AdvancedEditor.tsx | 🔴 CRITICAL | Remove | 15 min | Duplicate code |
| TeleponanView.tsx | 🔴 HIGH | Pending | 2 hrs | 12 issues |
| IntegrityMatrix.tsx | 🔴 HIGH | Pending | 3 hrs | 18 issues |
| SettingsView.tsx | 🔴 HIGH | Pending | 2.5 hrs | 14 issues |
| SystemHealthView.tsx | 🟡 MEDIUM | Pending | 2 hrs | 15 issues |
| AdvancedEditor (features) | 🟡 MEDIUM | Pending | 2 hrs | 16 issues |
| SmartNotesView.tsx | 🟡 MEDIUM | Pending | 1.5 hrs | 14 issues |
| NoteBatchActions.tsx | 🟢 LOW | Pending | 1 hr | 8 issues |
| NoteAgentConsole.tsx | 🟢 LOW | Pending | 1 hr | 10 issues |
| DailyStoicWidget.tsx | 🟢 LOW | Pending | 1 hr | 12 issues |
| istokIdentity.ts | ⚪ N/A | Complete | — | No changes needed |

---

## Quick Reference

### Most Common Changes
```typescript
// ❌ REPLACE ALL OF:
'rgba(16, 185, 129, 0.8)'        → use var(--accent-2)
'#0a0a0b'                        → use bg-surface
'bg-red-900/10'                  → use status color map
'text-neutral-500'               → use text-text-muted

// ✅ WITH THESE:
var(--accent-2)
var(--surface)
STATUS_COLOR_MAP[status].bg
text-text-muted
```

### Testing Quick Checks
- [ ] No hardcoded hex colors (#XXXXXX)
- [ ] No hardcoded rgb/rgba in components
- [ ] All aria-labels present on icon buttons
- [ ] All transitions use CSS classes
- [ ] All status indicators have icon + color + text

---

## Metrics Tracking

### Hardcoded Colors (Target: 0)
- Start: 41
- Current: __
- Target: 0

### Components Styled (Target: 100%)
- Start: 0/10
- Current: __/10
- Target: 10/10

### Accessibility Issues (Target: 0)
- Start: 22
- Current: __
- Target: 0

### Test Coverage (Target: 100%)
- Start: 70%
- Current: __
- Target: 100%

---

## Sign-Off

**Developer:** _________________ Date: _______  
**Reviewer:** _________________ Date: _______  
**QA:** _________________ Date: _______  
**PM:** _________________ Date: _______

---

**Last Updated:** January 14, 2026  
**Total Estimated Hours:** 18-20
