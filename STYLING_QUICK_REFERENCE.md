# ISTOIC Styling Quick Reference
## One-Page Lookup Guide

---

## 🎯 Priority Matrix

| Priority | Files | Issues | Time |
|----------|-------|--------|------|
| 🔴 CRITICAL | 1. Remove `/services/AdvancedEditor.tsx` | Duplicate code | 15 min |
| 🔴 HIGH | TeleponanView.tsx | Hardcoded canvas color + styling | 2 hrs |
| 🔴 HIGH | IntegrityMatrix.tsx | 6 hardcoded status colors | 3 hrs |
| 🔴 HIGH | SettingsView.tsx | Hardcoded theme palette | 2.5 hrs |
| 🟡 MEDIUM | SystemHealthView.tsx | Color consolidation | 2 hrs |
| 🟡 MEDIUM | AdvancedEditor (features) | Toolbar color migration | 2 hrs |
| 🟡 MEDIUM | SmartNotesView.tsx | Visual enhancements | 1.5 hrs |
| 🟢 LOW | NoteBatchActions.tsx | Accessibility improvements | 1 hr |
| 🟢 LOW | NoteAgentConsole.tsx | Progress indicator | 1 hr |
| 🟢 LOW | DailyStoicWidget.tsx | Typography improvements | 1 hr |
| ⚪ N/A | istokIdentity.ts | Backend service (no changes) | - |
| **TOTAL** | **10 files** | **127 issues** | **~18 hrs** |

---

## 🎨 Color Reference

### Primary Palette
```
--bg:              #0d0d0d (Deep Black)
--surface:         #1e1e1e (Elevated)
--surface-2:       #2d2d2d (Raised)
--border:          #3f3f3f (Dividers)
--text:            #ececec (Primary)
--text-muted:      #565656 (Secondary)
--accent:          #ffffff (White)
--accent-2:        #10b981 (Green)
```

### Status Colors
```
--success:         #16a34a (Online/Good)
--warning:         #f59e0b (Caution)
--danger:          #dc2626 (Error/Offline)
--info:            #0ea5e9 (Information)
```

---

## 📋 File-by-File Checklist

### ✅ No Changes Needed
- `istokIdentity.ts` - Backend service only

### 🗑️ Remove
- `/services/AdvancedEditor.tsx` - Duplicate, use `features/smartNotes/AdvancedEditor.tsx`

### 🔴 CRITICAL CHANGES
```
TeleponanView.tsx:Line 89
  BEFORE: ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
  AFTER:  ctx.fillStyle = getCSSVariableColor('--accent-2');

IntegrityMatrix.tsx:Lines 31-33
  BEFORE: Hardcoded bg-red-900/10, bg-amber-900/10, bg-emerald-900/10
  AFTER:  Use STATUS_COLOR_MAP utility

IntegrityMatrix.tsx:Line 129
  BEFORE: bg-[#0a0a0b]
  AFTER:  bg-surface

SettingsView.tsx:Lines 42-52
  BEFORE: THEME_COLORS hardcoded hex values
  AFTER:  Import THEME_PRESETS from constants
```

### 🟡 MEDIUM CHANGES
```
SystemHealthView.tsx
  → Consolidate provider card styling
  → Add status icons alongside colors

AdvancedEditor.tsx (features)
  → Extract toolbar button styles
  → Move to reusable component

SmartNotesView.tsx
  → Add visual state indicators
  → Improve card styling
```

### 🟢 POLISH CHANGES
```
NoteBatchActions.tsx
  → Add aria-labels to buttons
  → Mobile drawer layout

NoteAgentConsole.tsx
  → Add progress bar visualization
  → Smooth view transitions

DailyStoicWidget.tsx
  → Add author attribution
  → Better advice text sizing
```

---

## 🛠️ Key Utilities to Create

### 1. `utils/statusColors.ts`
```typescript
export const STATUS_COLOR_MAP = {
    DISABLED: { bg: 'bg-danger/10', ... },
    UNSTABLE: { bg: 'bg-warning/10', ... },
    ACTIVE: { bg: 'bg-success/10', ... },
};
```

### 2. `constants/themePresets.ts`
```typescript
export const THEME_PRESETS = {
    default: { accent: 'var(--accent)', ... },
    cyberpunk: { accent: '#00F0FF', ... },
    // ... other themes
};
```

### 3. `utils/cssVariables.ts`
```typescript
export function getCSSVariableColor(
    varName: string, 
    defaultColor: string
): string {
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(varName).trim();
    return value || defaultColor;
}
```

### 4. `components/ToolbarButton.tsx`
```typescript
// Reusable themed toolbar button with proper styling
```

---

## 🧪 Testing Commands

### Check for Hardcoded Colors
```bash
# Find all hardcoded color values
grep -r "rgba(" features/ --include="*.tsx" | grep -v "var(" | grep -v "//"

# Find all hardcoded hex values
grep -r "#[0-9A-F]" features/ --include="*.tsx" | grep -v "CSS" | grep -v "var("
```

### Lighthouse Audit
```bash
# Run accessibility audit
lighthouse https://your-dev-url --view

# Check color contrast
# Use Chrome DevTools → Accessibility → Color Contrast
```

### Performance Check
```bash
# Record animation in Chrome DevTools
# Ensure frame rate stays at 60fps
# Check for layout thrashing (yellow bars)
```

---

## 📱 Responsive Breakpoints

```
Mobile:     < 640px  (xs to sm)
Tablet:     640-1024px (md to lg)
Desktop:    ≥ 1024px (xl+)

Tailwind:
sm:  640px    (small phones)
md:  768px    (tablets)
lg:  1024px   (laptops)
xl:  1280px   (large screens)
```

---

## ♿ Accessibility Checklist

### For Every Component
- [ ] `aria-label` on icon-only buttons
- [ ] `aria-pressed` on toggle buttons
- [ ] `aria-live="polite"` on dynamic updates
- [ ] `role="status"` on status messages
- [ ] Minimum 44x44px touch targets
- [ ] Contrast ratio ≥ 4.5:1 for text
- [ ] Focus indicators visible
- [ ] Keyboard navigation works

### For Color-Only Status
- [ ] Add icon alongside color
- [ ] Add text label or aria-label
- [ ] Add redundant text indicator
- [ ] Test with color-blind simulator

---

## 🎬 Animation Guidelines

### Transition Timing
```
Quick feedback:   100-150ms  (button hover, microinteractions)
Standard change:  200-300ms  (state changes, panel open)
Large change:     300-500ms  (navigation, modal slide)

Never use instant (0ms) state changes
```

### GPU-Accelerated Properties Only
```css
/* Use these for smooth 60fps animations */
transform: translateX(), scale(), rotate()
opacity: 0 to 1

/* Avoid these - causes layout thrashing */
left, top, width, height, padding
```

### Example
```typescript
// ✅ GOOD - Uses transform for smooth animation
<div className="transition-transform duration-300 hover:scale-105" />

// ❌ BAD - Uses width which causes layout recalc
<div className="transition-[width] duration-300 hover:w-full" />
```

---

## 🚀 Implementation Priority Order

### Week 1 (High Priority)
1. Remove duplicate `/services/AdvancedEditor.tsx` (15 min)
2. Create `utils/statusColors.ts` (30 min)
3. Create `constants/themePresets.ts` (30 min)
4. Update TeleponanView.tsx (2 hrs)
5. Update IntegrityMatrix.tsx (2.5 hrs)
6. Update SettingsView.tsx (2 hrs)

**Total Week 1: 8 hours**

### Week 2 (Medium Priority)
1. Update SystemHealthView.tsx (2 hrs)
2. Update AdvancedEditor (features) (2 hrs)
3. Update SmartNotesView.tsx (1.5 hrs)

**Total Week 2: 5.5 hours**

### Week 3 (Polish)
1. Update remaining 3 files (3 hrs)
2. Testing & refinement (2 hrs)
3. Documentation (1 hr)

**Total Week 3: 6 hours**

---

## 🐛 Debug Tips

### Canvas Color Not Changing?
```typescript
// Check if CSS variable is being read
console.log(
    getComputedStyle(document.documentElement)
        .getPropertyValue('--accent-2')
);

// Ensure no hardcoded fallback is overriding
```

### Tailwind Classes Not Applied?
```typescript
// Check that class string is complete (no runtime concatenation)
// ✅ className="bg-accent text-text"
// ❌ className={`bg-${color} text-text`} // Won't work!

// Use cn() utility for conditional classes
import { cn } from '@/utils/cn';
className={cn('bg-accent', isActive && 'text-text-invert')}
```

### Animation Jerky?
```typescript
// Enable GPU acceleration
className="will-change-transform transition-transform duration-300"

// Check DevTools Performance tab
// Look for yellow/red bars (layout thrashing)
// Use transform/opacity instead of width/height
```

### Mobile View Broken?
```typescript
// Use mobile-first approach in Tailwind
// ✅ p-4 md:p-6 lg:p-8  (good)
// ❌ lg:p-8 md:p-6 p-4  (reversed order doesn't work)

// Test with Chrome DevTools device emulation
// Test actual devices for touch responsiveness
```

---

## 📚 Reference Documentation

| Document | Purpose | Location |
|----------|---------|----------|
| STYLING_ANALYSIS_REPORT.md | Detailed issue breakdown by file | Root directory |
| STYLING_IMPLEMENTATION_GUIDE.md | Step-by-step implementation instructions | Root directory |
| index.css | CSS variable definitions | Root directory |
| tailwind.config.ts | Tailwind theme configuration | Root directory |

---

## 💡 Pro Tips

1. **Use CSS Variables for Everything**: Never hardcode colors in components
2. **Create Reusable Utilities**: Extract patterns into utility files
3. **Test Accessibility First**: Build with a11y in mind from the start
4. **Mobile First**: Design for small screens, enhance for larger ones
5. **Performance Matters**: Test animations at 60fps in DevTools
6. **Document Changes**: Update git commits clearly
7. **Pair Program**: Have someone review each major change

---

## ⚡ Quick Wins (< 30 min each)

- [ ] Add aria-labels to icon buttons
- [ ] Change hardcoded colors to CSS variables
- [ ] Add focus:ring-2 focus:ring-accent to buttons
- [ ] Convert margin-top to gap utilities
- [ ] Add sr-only fallback text for color-only indicators

---

## 🔗 Links to Resources

- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Web Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Variables (Custom Properties)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

**Last Updated:** January 14, 2026  
**Status:** Ready for Implementation  
**Difficulty:** Medium (2-3 developer-weeks)

