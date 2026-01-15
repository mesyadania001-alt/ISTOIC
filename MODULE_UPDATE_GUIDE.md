# MODULE UPDATE GUIDE - BENTO STYLING

## 🎯 QUICK REFERENCE

**Context Files**:
- `SESSION_CONTEXT.md` - Full session context
- `CONTINUATION_PROMPTS.md` - Quick prompts
- `MODULE_UPDATE_GUIDE.md` - This file (module-specific guide)

**Reference Implementation**: `features/dashboard/DashboardView.tsx`

---

## 📱 MODULE 1: AI CHAT

### Current Files
- `features/aiChat/AIChatView.tsx` (274 lines)
- `features/aiChat/components/ChatWindow.tsx`
- `features/aiChat/components/ChatHistory.tsx`
- `features/aiChat/components/ChatInput.tsx`
- `features/aiChat/components/ModelPicker.tsx`

### What to Update

#### 1. Chat Messages → Bento Cards
```tsx
// Current: Plain message bubbles
// Target: Bento gradient cards for messages

<Card tone="bento-blue" padding="bento" bento className="bento-card">
  {/* User message */}
</Card>

<Card tone="bento-purple" padding="bento" bento className="bento-card">
  {/* AI message */}
</Card>
```

#### 2. Model Picker → Bento Grid
```tsx
// Convert model selection to bento grid
<section className="bento-grid grid grid-cols-12 gap-[var(--bento-gap)]">
  {models.map((model, idx) => (
    <Card 
      tone={getBentoColorByIndex(idx)} 
      padding="bento" 
      interactive 
      bento
    >
      {/* Model card */}
    </Card>
  ))}
</section>
```

#### 3. Chat History → Bento List
- Apply bento styling to thread cards
- Use gradient variants for different thread types

#### 4. Chat Input → Bento Style
- Update input container with bento card styling
- Add gradient accent for send button

### Keywords
`aiChat`, `chatWindow`, `messageBubble`, `chatHistory`, `modelPicker`, `bentoChat`

---

## 🛠 MODULE 2: AI TOOLS

### Current Files
- `features/aiTools/AIToolsView.tsx` (70 lines)
- `features/aiTools/components/GenerativeStudio.tsx`
- `features/aiTools/components/NeuralVision.tsx`

### What to Update

#### 1. Tool Cards → Bento Grid
```tsx
// Generative Studio
<Card tone="bento-orange" padding="bento" bento>
  {/* Image generation */}
</Card>

<Card tone="bento-purple" padding="bento" bento>
  {/* Video generation */}
</Card>

// Neural Vision
<Card tone="bento-teal" padding="bento" bento>
  {/* Image analysis */}
</Card>
```

#### 2. Tool Selection → Bento Cards
- Convert tool tabs to bento gradient cards
- Use different gradients for different tool types

#### 3. Generation Results → Bento Display
- Show generated images/videos in bento cards
- Add gradient borders for results

### Keywords
`aiTools`, `generativeStudio`, `neuralVision`, `imageGenerator`, `videoGenerator`, `bentoTools`

---

## 💚 MODULE 3: SYSTEM HEALTH

### Current Files
- `features/systemHealth/SystemHealthView.tsx` (685 lines)
- `features/systemHealth/components/IntegrityMatrix.tsx`

### What to Update

#### 1. Status Cards → Bento with Gradients
```tsx
// Healthy = green gradient
<Card tone="bento-green" padding="bento" bento>
  {/* Healthy status */}
</Card>

// Warning = orange gradient
<Card tone="bento-orange" padding="bento" bento>
  {/* Warning status */}
</Card>

// Error = red gradient
<Card tone="bento-red" padding="bento" bento>
  {/* Error status */}
</Card>
```

#### 2. Provider Cards → Bento Grid
- Convert provider status cards to bento grid
- Use gradient variants based on provider status

#### 3. Log Viewer → Bento Style
- Apply bento styling to log entries
- Use gradient accents for different log levels

#### 4. Metrics Display → Bento Cards
- Convert metrics to bento cards
- Use gradients for different metric types

### Keywords
`systemHealth`, `statusCards`, `providerStatus`, `logViewer`, `systemMetrics`, `bentoSystem`

---

## ⚙️ MODULE 4: SETTINGS

### Current Files
- `features/settings/SettingsView.tsx` (627 lines)

### What to Update

#### 1. Setting Sections → Bento Cards
```tsx
// Each setting category as bento card
<Card tone="bento-blue" padding="bento" bento>
  {/* Account settings */}
</Card>

<Card tone="bento-teal" padding="bento" bento>
  {/* Appearance settings */}
</Card>

<Card tone="bento-purple" padding="bento" bento>
  {/* Security settings */}
</Card>
```

#### 2. Setting Items → Bento Grid
- Convert setting items to bento grid layout
- Use subtle gradients for different categories

#### 3. Theme Picker → Bento Grid
- Convert theme color picker to bento grid
- Use actual theme colors as card backgrounds

#### 4. Action Buttons → Bento Style
- Update save/reset buttons with bento styling
- Add gradient accents for important actions

### Keywords
`settings`, `settingsView`, `configPanels`, `themePicker`, `bentoSettings`

---

## 🎨 DESIGN PATTERNS TO FOLLOW

### Pattern 1: Bento Grid Layout
```tsx
<section className="bento-grid grid grid-cols-12 gap-[var(--bento-gap)]">
  <div className="col-span-12 md:col-span-6 lg:col-span-4">
    <Card tone="bento-purple" padding="bento" interactive bento>
      {/* Content */}
    </Card>
  </div>
</section>
```

### Pattern 2: Gradient Card
```tsx
<Card 
  tone="bento-{color}" 
  padding="bento" 
  interactive={true}
  bento={true}
  className="bento-card"
>
  <div className="bento-card-content">
    <div className="bento-card-icon">
      <Icon size={24} />
    </div>
    <h3 className="bento-card-title">Title</h3>
    <p className="bento-card-description">Description</p>
  </div>
</Card>
```

### Pattern 3: Status-Based Gradient
```tsx
const getStatusGradient = (status: string) => {
  switch(status) {
    case 'success': return 'bento-green';
    case 'warning': return 'bento-orange';
    case 'error': return 'bento-red';
    default: return 'bento-blue';
  }
};

<Card tone={getStatusGradient(status)} padding="bento" bento>
  {/* Status content */}
</Card>
```

---

## 📝 CHECKLIST FOR EACH MODULE

### Before Starting
- [ ] Read `SESSION_CONTEXT.md` for full context
- [ ] Check `features/dashboard/DashboardView.tsx` as reference
- [ ] Review `constants/bentoTheme.ts` for available colors

### During Update
- [ ] Apply bento grid layout
- [ ] Use gradient cards for main elements
- [ ] Add `bento` prop to Card components
- [ ] Use `bento-card-content` wrapper
- [ ] Apply iOS safe area support
- [ ] Test touch interactions
- [ ] Verify dark theme consistency

### After Update
- [ ] Check for TypeScript errors
- [ ] Verify iOS safe area
- [ ] Test on mobile viewport
- [ ] Ensure gradient colors match theme
- [ ] Verify animations are smooth

---

## 🔑 PROMPT TEMPLATES

### For Any Module:
```
Update [MODULE_NAME] module dengan bento grid styling seperti DashboardView. 
Terapkan gradient cards, premium dark theme, dan iOS optimizations. 
Gunakan sistem bento yang sama dari DashboardView sebagai reference.
```

### Specific Module:
```
[Module Name]: [Specific changes needed]
- [Change 1]
- [Change 2]
- [Change 3]

Reference: features/dashboard/DashboardView.tsx
Colors: constants/bentoTheme.ts
```

---

## 🎯 PRIORITY ORDER

1. **AI Chat** - Most visible, user-facing
2. **AI Tools** - High usage, needs visual appeal
3. **System Health** - Important for monitoring
4. **Settings** - Less frequent but needs consistency

---

## 📚 FILES TO READ FIRST

1. `SESSION_CONTEXT.md` - Full context
2. `features/dashboard/DashboardView.tsx` - Reference implementation
3. `constants/bentoTheme.ts` - Available colors
4. `components/ui/Card.tsx` - Card component API
5. `index.css` - CSS variables and utilities

---

**Last Updated**: Current Session
**Status**: Ready for module updates
