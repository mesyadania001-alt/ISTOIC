# ISTOIC Styling Implementation Guide
## Step-by-Step Instructions for Developers

---

## Quick Navigation

- [File-by-File Implementation Order](#file-by-file-implementation-order)
- [Code Snippets & Templates](#code-snippets--templates)
- [Testing Checklist](#testing-checklist)
- [Common Pitfalls](#common-pitfalls)

---

## File-by-File Implementation Order

### PHASE 1.1: Remove Legacy Code (Priority: CRITICAL)

#### 1. Remove `/services/AdvancedEditor.tsx`
**Time:** 15 minutes

**Steps:**
1. Open `services/AdvancedEditor.tsx`
2. Verify all imports point to `features/smartNotes/AdvancedEditor.tsx`
3. Search workspace for references to `services/AdvancedEditor`
4. Update imports to use `features/smartNotes/AdvancedEditor` instead
5. Delete the file

**Command to find references:**
```bash
grep -r "services/AdvancedEditor" --include="*.tsx" --include="*.ts"
```

**Typical locations to update:**
- SmartNotesView.tsx (already uses correct path)
- Any other imports using wrong path

---

### PHASE 1.2: TeleponanView.tsx (Priority: HIGH)

**Time:** 2 hours

#### Issue 1: Hardcoded Waveform Color (Line 89)

**BEFORE:**
```typescript
// Line 89
const draw = () => {
    animationId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        // ❌ Hardcoded Emerald Green
        ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }
};
```

**AFTER:**
```typescript
// Line 89 - Updated
const draw = () => {
    animationId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get CSS variable color
    const accentColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent-2')
        .trim() || 'rgb(16, 185, 129)';
    
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        // ✅ Using CSS variable with proper opacity
        ctx.fillStyle = accentColor.includes('rgb') 
            ? accentColor.replace(')', ', 0.8)').replace('rgb', 'rgba')
            : 'rgba(16, 185, 129, 0.8)';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }
};
```

**Alternative (Better) Approach:**
```typescript
// Create utility function for getting CSS variable colors
function getCSSVariableColor(varName: string, defaultColor: string): string {
    if (typeof window === 'undefined') return defaultColor;
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim();
    return value || defaultColor;
}

// Then in draw function:
const accentColor = getCSSVariableColor('--accent-2', 'rgb(16, 185, 129)');
ctx.fillStyle = `${accentColor.replace(')', ', 0.8)').replace('rgb', 'rgba')}`;
```

#### Issue 2: Styling the Call Card Container

**Add to TeleponanView return (around line 270):**

```typescript
return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-6 
                    bg-bg text-text p-4 md:p-8 animate-fade-in">
        
        {/* Call Card Container */}
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] 
                        bg-surface border border-border shadow-lg 
                        p-6 md:p-8 space-y-6 animate-slide-up">
            
            {/* Status Indicator */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full transition-colors duration-200
                        ${state === 'CONNECTED' ? 'bg-success shadow-[0_0_8px_var(--success)]' 
                        : state === 'TERMINATED' ? 'bg-danger' 
                        : 'bg-warning animate-pulse'}`} 
                    />
                    <span className="body-sm font-semibold text-text-muted capitalize">
                        {state.toLowerCase().replace(/_/g, ' ')}
                    </span>
                </div>
            </div>
            
            {/* Waveform Visualizer */}
            <div className="bg-surface-2 rounded-[var(--radius-md)] 
                            border border-border p-4 overflow-hidden">
                <WaveformVisualizer analyser={engineRef.current?.analyser || null} isMuted={isMuted} />
            </div>
            
            {/* Call Duration */}
            {state === 'CONNECTED' && (
                <div className="text-center">
                    <p className="text-lg font-mono text-text-muted">
                        {formatTime(duration)}
                    </p>
                </div>
            )}
            
            {/* SAS Code Display */}
            {sasCode && (
                <div className="p-4 rounded-[var(--radius-md)] 
                                bg-success/10 border border-success/30">
                    <p className="caption text-text-muted mb-2">Secure Authentication Code</p>
                    <p className="text-lg font-bold text-success font-mono">{sasCode}</p>
                </div>
            )}
            
            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-4">
                <button
                    onClick={toggleMute}
                    className="w-12 h-12 rounded-full bg-surface-2 border border-border
                              text-text hover:bg-surface hover:border-accent
                              transition-all duration-200 flex items-center justify-center
                              active:scale-95"
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                
                <button
                    onClick={terminateCall}
                    className="w-14 h-14 rounded-full bg-danger/90 text-text-invert
                              hover:bg-danger transition-all duration-200
                              flex items-center justify-center active:scale-95
                              shadow-lg hover:shadow-[0_0_16px_var(--danger-rgb/0.5)]"
                    aria-label="End call"
                    title="End Call"
                >
                    <PhoneOff size={24} />
                </button>
                
                {state === 'IDLE' && (
                    <button
                        onClick={handleMakeCall}
                        className="w-14 h-14 rounded-full bg-success/90 text-text-invert
                                  hover:bg-success transition-all duration-200
                                  flex items-center justify-center active:scale-95
                                  shadow-lg hover:shadow-[0_0_16px_var(--success-rgb/0.5)]"
                        aria-label="Start call"
                        title="Start Call"
                    >
                        <Phone size={24} />
                    </button>
                )}
            </div>
        </div>
    </div>
);
```

**Testing Checklist for TeleponanView:**
- [ ] Waveform color matches theme accent-2
- [ ] Status indicator changes color based on call state
- [ ] SAS code displays with proper contrast
- [ ] Buttons have proper hover/active states
- [ ] Transitions are smooth at 60fps
- [ ] Mobile view is responsive
- [ ] Dark mode contrast is accessible (WCAG AA)

---

### PHASE 1.3: IntegrityMatrix.tsx (Priority: HIGH)

**Time:** 3 hours

#### Issue 1: Hardcoded Status Colors (Lines 31-33)

**Create a new utility file: `utils/statusColors.ts`**

```typescript
export const STATUS_COLOR_MAP = {
    DISABLED: {
        bg: 'bg-danger/10',
        border: 'border-danger/50',
        text: 'text-danger',
        glow: 'shadow-[0_0_15px_rgba(220,38,38,0.2)]',
    },
    UNSTABLE: {
        bg: 'bg-warning/10',
        border: 'border-warning/50',
        text: 'text-warning',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
        animate: 'animate-pulse',
    },
    ACTIVE: {
        bg: 'bg-success/10',
        border: 'border-success/30',
        text: 'text-success',
        glow: 'shadow-[0_0_15px_rgba(22,163,74,0.2)]',
        hover: 'hover:bg-success/20 hover:border-success/50 hover:shadow-[0_0_15px_rgba(22,163,74,0.3)]',
    },
} as const;

export function getStatusClassName(status: keyof typeof STATUS_COLOR_MAP): string {
    const colors = STATUS_COLOR_MAP[status];
    const baseClasses = [
        colors.bg,
        colors.border,
        colors.text,
        colors.glow,
    ];
    
    if (colors.animate) baseClasses.push(colors.animate);
    if (colors.hover) baseClasses.push(colors.hover);
    
    return baseClasses.join(' ');
}
```

**Update IntegrityMatrix.tsx UIElementNode:**

```typescript
// BEFORE - Lines 25-45
const getStatusColor = () => {
    if (status === 'DISABLED') return 'bg-red-900/10 border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
    if (status === 'UNSTABLE') return 'bg-amber-900/10 border-amber-500/50 text-amber-500 animate-pulse';
    return 'bg-emerald-900/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]';
};

// AFTER
const getStatusColor = () => {
    return getStatusClassName(status);
};
```

**Also add import at top:**
```typescript
import { STATUS_COLOR_MAP, getStatusClassName } from '../../../utils/statusColors';
```

#### Issue 2: Fix Hardcoded Background Color (Line 129)

**BEFORE (Line 129):**
```typescript
<div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-20 bg-[#0a0a0b] rounded-[32px] border border-white/5 shadow-2xl animate-slide-up">
```

**AFTER:**
```typescript
<div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-20 bg-surface rounded-[var(--radius-xl)] border border-border shadow-2xl animate-slide-up">
```

#### Issue 3: Improve Grid Pattern Background

**BEFORE:**
```typescript
<div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
<div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
```

**AFTER:**
```typescript
<div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,...')] opacity-10 pointer-events-none" />
<div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />
```

**Testing Checklist for IntegrityMatrix:**
- [ ] Status colors use correct CSS variables
- [ ] ACTIVE state has hover effect
- [ ] UNSTABLE state pulses smoothly
- [ ] Grid background is visible but subtle
- [ ] Container uses proper surface color
- [ ] No hardcoded colors remaining

---

### PHASE 1.4: SettingsView.tsx (Priority: HIGH)

**Time:** 2.5 hours

#### Issue 1: Replace Hardcoded Theme Colors (Lines 42-52)

**Create file: `constants/themePresets.ts`**

```typescript
export const THEME_PRESETS = {
    default: {
        name: 'Default Dark',
        accent: 'var(--accent)',
        secondary: 'var(--accent-2)',
        key: 'default',
    },
    cyberpunk: {
        name: 'Cyberpunk',
        accent: '#00F0FF',
        secondary: '#FF006E',
        key: 'cyberpunk',
    },
    forest: {
        name: 'Forest',
        accent: '#16a34a',
        secondary: '#84cc16',
        key: 'forest',
    },
    sunset: {
        name: 'Sunset',
        accent: '#ea580c',
        secondary: '#f59e0b',
        key: 'sunset',
    },
    royalty: {
        name: 'Royalty',
        accent: '#a855f7',
        secondary: '#06b6d4',
        key: 'royalty',
    },
} as const;

export type ThemeKey = keyof typeof THEME_PRESETS;
```

**Update SettingsView.tsx THEME_COLORS (around line 42):**

```typescript
// BEFORE
const THEME_COLORS: Record<string, string> = {
  cyan: '#00F0FF',
  lime: '#CCFF00',
  purple: '#BF00FF',
  orange: '#FF5F00',
  silver: '#94a3b8',
  blue: '#0066FF',
  green: '#00FF94',
  red: '#FF003C',
  pink: '#FF0099',
  gold: '#FFD700'
};

// AFTER
import { THEME_PRESETS } from '../../constants/themePresets';

// Use THEME_PRESETS instead
const themeOptions = Object.entries(THEME_PRESETS).map(([key, preset]) => ({
    id: preset.key,
    name: preset.name,
    accent: preset.accent,
    secondary: preset.secondary,
}));
```

**Add theme color picker component:**

```typescript
const ThemeColorPreview: React.FC<{ theme: typeof THEME_PRESETS[keyof typeof THEME_PRESETS]; isActive: boolean }> = ({ theme, isActive }) => (
    <button
        onClick={() => setAppTheme(theme.key)}
        className={`flex flex-col items-center gap-2 p-3 rounded-[var(--radius-md)] border transition-all
            ${isActive ? 'border-accent bg-accent/10' : 'border-border bg-surface hover:border-accent/50'}`}
    >
        <div className="flex gap-2">
            <div className="w-6 h-6 rounded border border-border" style={{ backgroundColor: theme.accent }} />
            <div className="w-6 h-6 rounded border border-border" style={{ backgroundColor: theme.secondary }} />
        </div>
        <span className="caption text-text-muted text-center">{theme.name}</span>
    </button>
);
```

**Testing Checklist for SettingsView:**
- [ ] Theme colors load from THEME_PRESETS
- [ ] Active theme shows visual indication
- [ ] Color picker is responsive
- [ ] No hardcoded color hex values
- [ ] Theme persists across sessions

---

### PHASE 2: SystemHealthView.tsx (Priority: MEDIUM)

**Time:** 2 hours

#### Issue: Improve Status Indicator Styling

**Update ProviderCard component (around line 52):**

```typescript
const ProviderCard: React.FC<{ provider: ProviderStatus }> = ({ provider }) => {
    const healthy = provider.status === 'HEALTHY';
    const cooldown = provider.status === 'COOLDOWN';
    
    // Use status color map
    const statusConfig = {
        healthy: { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success', icon: <CheckCircle2 size={14} /> },
        cooldown: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning', icon: <RefreshCw size={14} className="animate-spin" /> },
        unavailable: { bg: 'bg-danger/10', border: 'border-danger/30', text: 'text-danger', icon: <AlertCircle size={14} /> },
    };
    
    const config = healthy ? statusConfig.healthy : cooldown ? statusConfig.cooldown : statusConfig.unavailable;

    return (
        <div className={`bg-surface border rounded-[var(--radius-md)] shadow-soft p-4 
                       transition-all duration-200 hover:shadow-md ${config.bg} ${config.border}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {config.icon}
                    <span className="body-sm font-semibold text-text">{provider.id}</span>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-200
                    ${healthy ? 'bg-success shadow-[0_0_8px_var(--success)]' 
                    : cooldown ? 'bg-warning shadow-[0_0_8px_var(--warning)]' 
                    : 'bg-danger shadow-[0_0_8px_var(--danger)]'}`} 
                />
            </div>
            <p className="caption text-text-muted">Keys: {provider.keyCount}</p>
            <p className={`caption font-semibold mt-1 ${config.text}`}>
                {healthy ? '🟢 Healthy' : cooldown ? '⏱️ Cooling' : '🔴 Offline'}
            </p>
        </div>
    );
};
```

**Testing Checklist for SystemHealthView:**
- [ ] Status indicators show icon + color + text
- [ ] Animations are smooth at 60fps
- [ ] Live updates don't cause layout shift
- [ ] Mobile view is readable
- [ ] ARIA live regions announce updates

---

### PHASE 2: AdvancedEditor.tsx (features/smartNotes) - Toolbar Styling

**Time:** 2 hours

#### Issue: Move Toolbar Colors to CSS

**Create file: `components/ToolbarButton.tsx`**

```typescript
import React from 'react';
import { cn } from '../utils/cn';
import { Button } from './ui/Button';

interface ToolbarButtonProps {
    onClick: (e: React.MouseEvent) => void;
    icon: React.ReactNode;
    isActive?: boolean;
    ariaLabel: string;
    className?: string;
    label?: string;
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({ 
    onClick, 
    icon, 
    isActive, 
    ariaLabel, 
    className, 
    label 
}) => (
    <Button
        onMouseDown={(e) => { e.preventDefault(); onClick(e); }}
        variant={isActive ? 'primary' : 'secondary'}
        size="sm"
        className={cn(
            label ? 'h-8 px-2' : 'h-8 w-8 p-0',
            isActive ? 'bg-accent text-text-invert shadow-md' : '',
            className
        )}
        aria-label={ariaLabel}
        aria-pressed={isActive}
        type="button"
        title={ariaLabel}
    >
        {icon}
        {label && <span className="caption uppercase font-semibold">{label}</span>}
    </Button>
);
```

**Update in AdvancedEditor.tsx:**

```typescript
// Import the new component
import { ToolbarButton } from './ToolbarButton';

// Replace old ToolbarButton definition with import
```

**Testing Checklist for AdvancedEditor Toolbar:**
- [ ] Buttons use proper theme colors
- [ ] Active state is visually clear
- [ ] Hover state provides feedback
- [ ] Toolbar is responsive on mobile
- [ ] Focus indicators are visible

---

### PHASE 3: Remaining Files (Priority: LOW-MEDIUM)

#### SmartNotesView.tsx (1.5 hours)
- Add visual state indicators to note cards
- Improve empty state design
- Implement stagger animations

#### NoteBatchActions.tsx (1 hour)
- Add accessibility labels to icon buttons
- Implement mobile drawer layout
- Add action completion feedback

#### NoteAgentConsole.tsx (1 hour)
- Add progress bar for indexing
- Implement result syntax highlighting
- Add smooth view transitions

#### DailyStoicWidget.tsx (1 hour)
- Add quote author attribution
- Improve advice text sizing
- Add quote fade transition

---

## Code Snippets & Templates

### Template 1: Status Color System

```typescript
// Use this pattern for any component with multiple states
const STATE_STYLES = {
    active: {
        bg: 'bg-success/10',
        border: 'border-success/30',
        text: 'text-success',
        icon: 'text-success',
    },
    inactive: {
        bg: 'bg-danger/10',
        border: 'border-danger/30',
        text: 'text-danger',
        icon: 'text-danger',
    },
    loading: {
        bg: 'bg-info/10',
        border: 'border-info/30',
        text: 'text-info',
        icon: 'text-info animate-spin',
    },
} as const;

// Usage
const styles = STATE_STYLES[currentState];
return <div className={`${styles.bg} ${styles.border} ${styles.text}`} />;
```

### Template 2: Smooth Transition Wrapper

```typescript
// Use for color/state changes
<div className="bg-surface border-border transition-all duration-200 
             hover:bg-surface-2 hover:border-accent" />
```

### Template 3: Mobile-Responsive Layout

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
            p-4 md:p-6 lg:p-8">
    {/* Content */}
</div>
```

### Template 4: Accessibility-Ready Button

```typescript
<button
    onClick={handler}
    className="px-4 py-2 rounded-[var(--radius-md)] 
              bg-accent text-text-invert
              hover:shadow-lg 
              focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
              active:scale-95
              transition-all duration-200"
    aria-label="Descriptive label"
    title="Descriptive tooltip"
    disabled={isDisabled}
>
    Icon here
</button>
```

---

## Testing Checklist

### Visual Testing
- [ ] All colors render correctly in light mode
- [ ] All colors render correctly in dark mode
- [ ] Contrast ratio meets WCAG AA (4.5:1 for text)
- [ ] Contrast ratio meets WCAG AAA (7:1 for critical text)
- [ ] Hover states are clearly visible
- [ ] Active states are clearly visible
- [ ] Focus indicators are visible
- [ ] Animations run at 60fps (use Chrome DevTools)

### Responsive Testing
- [ ] Desktop (1920px) layout is correct
- [ ] Tablet (768px) layout is correct
- [ ] Mobile (375px) layout is correct
- [ ] Landscape orientation is handled
- [ ] Touch targets are at least 44x44px
- [ ] No horizontal scrolling on mobile

### Accessibility Testing
- [ ] All buttons have aria-labels
- [ ] Color-only status indicators have text/icon backups
- [ ] Form inputs have associated labels
- [ ] ARIA live regions announce changes
- [ ] Keyboard navigation works
- [ ] Screen reader announcements are clear

### Performance Testing
- [ ] Canvas animations don't cause jank
- [ ] Transitions are smooth at 60fps
- [ ] No layout thrashing during animations
- [ ] Transitions use GPU-accelerated properties (transform, opacity)

---

## Common Pitfalls

### 1. ❌ Hardcoding Hex Values in Dynamic Components
```typescript
// DON'T DO THIS:
ctx.fillStyle = 'rgba(16, 185, 129, 0.8)'; // Hardcoded color
```

### 2. ✅ Use CSS Variables
```typescript
// DO THIS:
const color = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-2').trim();
```

### 3. ❌ Forgetting Accessibility
```typescript
// DON'T DO THIS:
<div className="w-2 h-2 rounded-full bg-success" /> // Color-only status
```

### 4. ✅ Add Context for Screen Readers
```typescript
// DO THIS:
<>
    <div className="w-2 h-2 rounded-full bg-success" aria-hidden="true" />
    <span className="sr-only">Status: Online</span>
</>
```

### 5. ❌ Inconsistent Spacing
```typescript
// DON'T DO THIS:
<div className="p-4 md:p-5 lg:p-6"> {/* Inconsistent increments */}
```

### 6. ✅ Use Consistent Spacing Scale
```typescript
// DO THIS:
<div className="p-4 md:p-6 lg:p-8"> {/* 4, 6, 8 = consistent scale */}
```

### 7. ❌ Using Dark/Light Mode Hardcoding
```typescript
// DON'T DO THIS:
className="bg-black dark:bg-white text-neutral-500" // Non-theme-aware
```

### 8. ✅ Use Theme Variables
```typescript
// DO THIS:
className="bg-bg text-text-muted" // Theme-aware via CSS variables
```

---

## Quick Reference: CSS Variables

```css
/* Colors */
--bg: #0d0d0d (deep black background)
--surface: #1e1e1e (card/elevated surfaces)
--border: #3f3f3f (borders and dividers)
--text: #ececec (primary text)
--text-muted: #565656 (secondary text)
--accent: #ffffff (primary accent)
--accent-2: #10b981 (secondary accent)
--danger: #dc2626 (error red)
--warning: #f59e0b (warning orange)
--success: #16a34a (success green)

/* Spacing (Tailwind scale) */
p-4 = 1rem, p-6 = 1.5rem, p-8 = 2rem

/* Border Radius */
--radius-md: 0.5rem (default)
--radius-lg: 0.75rem (cards)
--radius-xl: 1rem (modals)

/* Shadows */
shadow-soft: 0 4px 12px rgba(0,0,0,0.08)
shadow-md: 0 8px 24px rgba(0,0,0,0.12)
shadow-lg: 0 12px 32px rgba(0,0,0,0.16)

/* Transitions */
duration-200: 200ms (standard)
duration-300: 300ms (longer)
```

---

## Git Commit Messages Template

```
feat: migrate TeleponanView waveform colors to CSS variables

- Extract hardcoded rgba(16, 185, 129) to var(--accent-2)
- Add getCSSVariableColor utility function
- Add proper dark mode styling to call card
- Improve accessibility with status indicator text

Fixes #123
```

---

## Support & Questions

For implementation questions:
1. Check CSS variables in `/index.css`
2. Review Tailwind config in `/tailwind.config.ts`
3. Refer back to STYLING_ANALYSIS_REPORT.md for specific issues
4. Test with Chrome DevTools color picker
5. Use Lighthouse for accessibility audit

---

**Last Updated:** January 14, 2026  
**Implementation Status:** Ready to Begin
