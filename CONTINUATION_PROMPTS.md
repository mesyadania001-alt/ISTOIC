# CONTINUATION PROMPTS FOR NEXT SESSION

## 🎯 QUICK START PROMPTS

### For AI Chat Module:
```
Saya ingin update AI Chat module dengan bento grid styling seperti DashboardView. 
Terapkan gradient cards untuk chat messages, improve message bubbles dengan premium 
dark theme, tambahkan bento-style model picker, dan optimize untuk iOS safe area. 
Gunakan sistem bento gradient yang sama (purple, teal, orange) dari DashboardView.
```

### For AI Tools Module:
```
Convert AI Tools module ke bento grid layout. Gunakan gradient cards untuk different 
tool types (image generation = orange gradient, video = purple gradient, dll). 
Terapkan premium dark theme dan iOS optimizations yang sama dari DashboardView.
```

### For System Health:
```
Update System Health module dengan bento grid cards. Gunakan gradient variants untuk 
different status types (success = green, warning = orange, error = red). Terapkan 
premium dark theme styling yang konsisten dengan DashboardView.
```

### For Settings:
```
Terapkan bento grid styling ke Settings module. Gunakan gradient cards untuk setting 
categories, improve layout dengan bento grid system, dan pastikan iOS safe area support. 
Match premium dark theme dari DashboardView.
```

---

## 📋 CONTEXT SUMMARY FOR AI

### Project Info
- **Name**: ISTOIC AI
- **Type**: Premium AI Chat & Productivity App
- **Tech**: React + TypeScript + Vite + Capacitor
- **Platform**: iOS Web, PWA, Capacitor

### What Was Done
1. ✅ Premium dark theme (exceeds ChatGPT) - `index.css`
2. ✅ Bento grid system - `Card.tsx`, `bentoTheme.ts`
3. ✅ Dashboard bento layout - `DashboardView.tsx`
4. ✅ SmartNotes features restored - `NoteBatchActions.tsx`, `NoteAgentConsole.tsx`
5. ✅ iOS optimizations - safe area, viewport, touch

### Key Files
- `index.css` - Dark theme + bento system
- `components/ui/Card.tsx` - Bento card component
- `constants/bentoTheme.ts` - Bento colors
- `features/dashboard/DashboardView.tsx` - Reference implementation

### Design System
- Dark background: `#0a0a0b`
- Bento gradients: purple, teal, orange, green, red, blue
- Card radius: `24px`
- iOS safe area: `env(safe-area-inset-*)`

### Next Modules
1. AI Chat - Apply bento to messages & UI
2. AI Tools - Convert tool cards to bento
3. System Health - Status cards with gradients
4. Settings - Bento layout for settings

---

## 🔑 KEY SEARCH TERMS

When AI needs to find code:
- `bento` - Bento system code
- `Card tone` - Card variants
- `DashboardView` - Reference implementation
- `bentoTheme` - Color constants
- `safe-area` - iOS optimizations

---

## 💡 USAGE EXAMPLE

**User**: "Update AI Chat dengan bento styling"

**AI should**:
1. Read `SESSION_CONTEXT.md` for context
2. Check `features/aiChat/AIChatView.tsx`
3. Apply bento grid pattern from `DashboardView.tsx`
4. Use gradient cards from `bentoTheme.ts`
5. Ensure iOS safe area support
6. Match premium dark theme

---

**File Location**: `SESSION_CONTEXT.md` & `CONTINUATION_PROMPTS.md`
**Purpose**: Enable seamless continuation of work across sessions
